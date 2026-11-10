<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\SaleItem;
use App\Models\User;
use App\Support\Ean13;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/** Purchase cost, VAT, margin, EAN-13 and barcode labels. */
class CatalogTest extends TestCase
{
    use DatabaseTransactions;

    private ?User $user = null;

    private function user(): User
    {
        return $this->user ??= User::factory()->create();
    }

    private function payload(array $o = []): array
    {
        return array_merge([
            'name' => 'Catalogue '.uniqid(),
            'description' => null,
            'price' => 1190,
            'cost_price' => 500,
            'vat_rate' => 19,
            'category_id' => Category::query()->value('slug'),
            'stock' => 10,
            'unlimited_stock' => false,
            'active' => true,
        ], $o);
    }

    private function product(array $o = []): Product
    {
        return Product::create(array_merge($this->payload(), $o));
    }

    public function test_margin_is_computed_from_vat_exclusive_price(): void
    {
        $p = $this->product();

        $this->assertSame(1000.0, $p->price_ht);
        $this->assertSame(500.0, $p->margin);
        $this->assertSame(50.0, $p->margin_rate);
        $this->assertNull($this->product(['cost_price' => null])->margin);
    }

    public function test_create_with_cost_vat_and_valid_ean(): void
    {
        $ean = Ean13::generateInternal();

        $this->actingAs($this->user())->post('/produits', $this->payload(['barcode' => $ean]))->assertSessionHasNoErrors();

        $this->assertDatabaseHas('products', ['barcode' => $ean, 'cost_price' => 500, 'vat_rate' => 19]);
    }

    public function test_invalid_or_duplicate_ean_and_bad_vat_are_refused(): void
    {
        $existing = $this->product(['barcode' => '4006381333931']);

        $this->actingAs($this->user())
            ->post('/produits', $this->payload(['barcode' => '4006381333932']))
            ->assertSessionHasErrors('barcode');
        $this->actingAs($this->user())
            ->post('/produits', $this->payload(['barcode' => $existing->barcode]))
            ->assertSessionHasErrors('barcode');
        $this->actingAs($this->user())
            ->post('/produits', $this->payload(['vat_rate' => 7]))
            ->assertSessionHasErrors('vat_rate');
        // Re-saving a product with its own barcode is fine.
        $this->actingAs($this->user())
            ->put("/produits/{$existing->id}", $this->payload(['barcode' => $existing->barcode]))
            ->assertSessionHasNoErrors();
    }

    public function test_generate_ean_returns_a_valid_internal_code(): void
    {
        $code = $this->actingAs($this->user())->postJson('/produits/generer-ean')->assertOk()->json('barcode');

        $this->assertTrue(Ean13::isValid($code));
        $this->assertStringStartsWith('2', $code);
    }

    public function test_labels_page_repeats_each_label_and_renders_barcode(): void
    {
        $p = $this->product(['barcode' => '4006381333931']);

        $res = $this->actingAs($this->user())
            ->get('/produits/etiquettes?ids[]='.$p->id.'&qty['.$p->id.']=3&format=thermal')
            ->assertOk();

        $this->assertSame(3, substr_count($res->getContent(), 'class="label"'));
        $this->assertStringContainsString('<svg', $res->getContent());
        $this->assertStringContainsString('50mm 30mm', $res->getContent());
    }

    public function test_sale_freezes_cost_and_vat_and_report_shows_real_margin(): void
    {
        $p = $this->product();

        $this->actingAs($this->user())->post('/ventes', [
            'remise' => 0,
            'items' => [['product_id' => $p->id, 'quantity' => 2]],
            'payment_method' => 'cash',
        ])->assertSessionHasNoErrors();

        $item = SaleItem::where('product_id', $p->id)->latest('id')->first();
        $this->assertEquals(500, $item->unit_cost);
        $this->assertEquals(19, $item->vat_rate);

        // Changing the cost afterwards must not rewrite history.
        $p->update(['cost_price' => 900]);
        $this->assertEquals(500, $item->fresh()->unit_cost);

        $this->actingAs($this->user())->get('/rapports')->assertOk()->assertInertia(
            fn ($page) => $page->has('kpis.marginMonth')->has('kpis.marginRateMonth')
        );
    }

    public function test_scan_and_till_pages_expose_barcodes(): void
    {
        $p = $this->product(['barcode' => '4006381333931']);

        foreach (['/', '/scan'] as $url) {
            $this->actingAs($this->user())->get($url)->assertOk()->assertInertia(
                fn ($page) => $page->where('products', fn ($list) => collect($list)->contains('barcode', $p->barcode))
            );
        }
    }
}
