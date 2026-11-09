<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * DatabaseTransactions (not RefreshDatabase): there is no separate test database,
 * so every test is rolled back instead of wiping the real one.
 */
class StockTest extends TestCase
{
    use DatabaseTransactions;

    private function product(array $overrides = []): Product
    {
        return Product::query()->create(array_merge([
            'name' => 'Produit stock '.uniqid(),
            'description' => 'desc',
            'price' => 1000,
            'category_id' => 'bureaux',
            'stock' => 5,
            'unlimited_stock' => false,
            'sku' => 'STK-'.uniqid(),
            'active' => true,
        ], $overrides));
    }

    private function sell(array $items): TestResponse
    {
        return $this->actingAs($this->user())->post('/ventes', [
            'client_id' => null,
            'remise' => 0,
            'items' => $items,
        ]);
    }

    private ?User $user = null;

    private function user(): User
    {
        return $this->user ??= User::factory()->create();
    }

    public function test_sale_decrements_stock_and_writes_a_journal_entry(): void
    {
        $p = $this->product(['stock' => 5]);

        $this->sell([['product_id' => $p->id, 'quantity' => 2]])->assertSessionHasNoErrors();

        $this->assertSame(3, $p->fresh()->stock);

        $m = StockMovement::where('product_id', $p->id)->sole();
        $this->assertSame('sale', $m->type);
        $this->assertSame(-2, $m->quantity);
        $this->assertSame(5, $m->stock_before);
        $this->assertSame(3, $m->stock_after);
        $this->assertSame(session('sale')['id'], $m->sale_id);
        $this->assertSame($this->user()->id, $m->user_id);
    }

    public function test_sale_is_refused_when_stock_is_insufficient_and_nothing_changes(): void
    {
        $p = $this->product(['stock' => 2]);
        $salesBefore = Sale::count();

        $this->sell([['product_id' => $p->id, 'quantity' => 3]])->assertSessionHasErrors('items');

        // Wording depends on the locale: check the facts, not the language.
        $message = session('errors')->first('items');
        $this->assertStringContainsString($p->name, $message);
        $this->assertStringContainsString('2', $message);
        $this->assertStringContainsString('3', $message);
        $this->assertSame(2, $p->fresh()->stock);
        $this->assertSame($salesBefore, Sale::count());
        $this->assertSame(0, StockMovement::where('product_id', $p->id)->count());
    }

    public function test_one_short_line_rolls_back_the_other_lines(): void
    {
        $ok = $this->product(['stock' => 10]);
        $short = $this->product(['stock' => 1]);
        $salesBefore = Sale::count();

        $this->sell([
            ['product_id' => $ok->id, 'quantity' => 4],
            ['product_id' => $short->id, 'quantity' => 2],
        ])->assertSessionHasErrors('items');

        $this->assertSame(10, $ok->fresh()->stock, 'the first line must not stay decremented');
        $this->assertSame(1, $short->fresh()->stock);
        $this->assertSame($salesBefore, Sale::count());
        $this->assertSame(0, StockMovement::whereIn('product_id', [$ok->id, $short->id])->count());
    }

    public function test_same_product_sent_twice_is_checked_against_the_total(): void
    {
        $p = $this->product(['stock' => 3]);

        // 2 + 2 = 4 > 3: each line alone would pass, the total must not.
        $this->sell([
            ['product_id' => $p->id, 'quantity' => 2],
            ['product_id' => $p->id, 'quantity' => 2],
        ])->assertSessionHasErrors('items');
        $this->assertSame(3, $p->fresh()->stock);

        // 2 + 1 = 3 fits, and becomes a single sale line.
        $this->sell([
            ['product_id' => $p->id, 'quantity' => 2],
            ['product_id' => $p->id, 'quantity' => 1],
        ])->assertSessionHasNoErrors();
        $this->assertSame(0, $p->fresh()->stock);
        $this->assertSame(1, Sale::find(session('sale')['id'])->items()->count());
    }

    public function test_the_last_unit_cannot_be_sold_twice(): void
    {
        $p = $this->product(['stock' => 1]);

        // Two tills ordering the last unit: the second one must lose.
        $this->sell([['product_id' => $p->id, 'quantity' => 1]])->assertSessionHasNoErrors();
        $this->sell([['product_id' => $p->id, 'quantity' => 1]])->assertSessionHasErrors('items');

        $this->assertSame(0, $p->fresh()->stock);
        $this->assertSame(1, StockMovement::where('product_id', $p->id)->where('type', 'sale')->count());
    }

    public function test_the_stock_never_goes_negative_even_if_the_check_was_stale(): void
    {
        $p = $this->product(['stock' => 1]);

        // The page showed stock 1, but another till already sold it.
        Product::whereKey($p->id)->update(['stock' => 0]);

        $this->sell([['product_id' => $p->id, 'quantity' => 1]])->assertSessionHasErrors('items');
        $this->assertSame(0, $p->fresh()->stock);
    }

    public function test_unlimited_stock_is_neither_checked_nor_decremented(): void
    {
        $p = $this->product(['stock' => 0, 'unlimited_stock' => true]);

        $this->sell([['product_id' => $p->id, 'quantity' => 500]])->assertSessionHasNoErrors();

        $this->assertSame(0, $p->fresh()->stock);
        $this->assertSame(0, StockMovement::where('product_id', $p->id)->count());
    }

    public function test_inactive_product_cannot_be_sold(): void
    {
        $p = $this->product(['stock' => 5, 'active' => false]);

        $this->sell([['product_id' => $p->id, 'quantity' => 1]])->assertSessionHasErrors('items');
        $this->assertSame(5, $p->fresh()->stock);
    }

    public function test_creating_a_product_journals_its_initial_stock(): void
    {
        $this->actingAs($this->user())->post('/produits', [
            'name' => 'Nouveau', 'description' => '', 'price' => 10, 'category_id' => 'bureaux',
            'stock' => 7, 'sku' => 'NEW-'.uniqid(), 'active' => true,
        ])->assertSessionHasNoErrors();

        $p = Product::where('name', 'Nouveau')->latest('id')->first();
        $m = StockMovement::where('product_id', $p->id)->sole();
        $this->assertSame('initial', $m->type);
        $this->assertSame(7, $m->stock_after);
    }

    public function test_creating_an_unlimited_product_without_quantity(): void
    {
        $this->actingAs($this->user())->post('/produits', [
            'name' => 'Service', 'description' => '', 'price' => 10, 'category_id' => 'bureaux',
            'stock' => '', 'unlimited_stock' => true, 'sku' => 'SRV-'.uniqid(), 'active' => true,
        ])->assertSessionHasNoErrors();

        $p = Product::where('name', 'Service')->latest('id')->first();
        $this->assertTrue($p->unlimited_stock);
        $this->assertSame(0, StockMovement::where('product_id', $p->id)->count());
    }

    public function test_editing_the_stock_is_journaled_with_its_reason(): void
    {
        $p = $this->product(['stock' => 5]);

        $this->actingAs($this->user())->put("/produits/{$p->id}", [
            'name' => $p->name, 'description' => 'desc', 'price' => 1000, 'category_id' => 'bureaux',
            'stock' => 12, 'stock_note' => 'Inventaire', 'sku' => $p->sku, 'active' => true,
        ])->assertSessionHasNoErrors();

        $this->assertSame(12, $p->fresh()->stock);
        $m = StockMovement::where('product_id', $p->id)->sole();
        $this->assertSame('adjustment', $m->type);
        $this->assertSame(7, $m->quantity);
        $this->assertSame(5, $m->stock_before);
        $this->assertSame(12, $m->stock_after);
        $this->assertSame('Inventaire', $m->note);
    }

    public function test_editing_without_changing_the_stock_writes_no_movement(): void
    {
        $p = $this->product(['stock' => 5]);

        $this->actingAs($this->user())->put("/produits/{$p->id}", [
            'name' => 'Renommé', 'description' => 'desc', 'price' => 1200, 'category_id' => 'bureaux',
            'stock' => 5, 'sku' => $p->sku, 'active' => true,
        ])->assertSessionHasNoErrors();

        $this->assertSame('Renommé', $p->fresh()->name);
        $this->assertSame(0, StockMovement::where('product_id', $p->id)->count());
    }

    public function test_switching_to_unlimited_keeps_the_quantity_and_switching_back_journals_it(): void
    {
        $p = $this->product(['stock' => 5]);
        $base = ['name' => $p->name, 'description' => 'desc', 'price' => 1000, 'category_id' => 'bureaux', 'sku' => $p->sku, 'active' => true];

        $this->actingAs($this->user())->put("/produits/{$p->id}", $base + ['stock' => 5, 'unlimited_stock' => true])
            ->assertSessionHasNoErrors();
        $this->assertTrue($p->fresh()->unlimited_stock);
        $this->assertSame(5, $p->fresh()->stock);

        $this->actingAs($this->user())->put("/produits/{$p->id}", $base + ['stock' => 20, 'unlimited_stock' => false])
            ->assertSessionHasNoErrors();
        $this->assertFalse($p->fresh()->unlimited_stock);
        $this->assertSame(20, $p->fresh()->stock);
        $this->assertSame(15, StockMovement::where('product_id', $p->id)->sole()->quantity);
    }

    public function test_movements_endpoint_lists_the_journal_newest_first(): void
    {
        $p = $this->product(['stock' => 5]);
        $this->sell([['product_id' => $p->id, 'quantity' => 1]]);
        $this->sell([['product_id' => $p->id, 'quantity' => 2]]);

        $this->actingAs($this->user())->getJson("/produits/{$p->id}/mouvements")
            ->assertOk()
            ->assertJsonCount(2, 'movements')
            ->assertJsonPath('movements.0.quantity', -2)
            ->assertJsonPath('movements.0.stock_after', 2)
            ->assertJsonPath('movements.1.quantity', -1);
    }

    public function test_guest_cannot_read_movements(): void
    {
        $this->getJson('/produits/1/mouvements')->assertUnauthorized();
    }
}
