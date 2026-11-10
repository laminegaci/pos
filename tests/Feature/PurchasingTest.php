<?php

namespace Tests\Feature;

use App\Models\PurchaseOrder;
use App\Models\Reception;
use App\Models\StockMovement;
use App\Models\Supplier;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\CreatesShopData;
use Tests\TestCase;

class PurchasingTest extends TestCase
{
    use CreatesShopData;
    use DatabaseTransactions;

    private function supplier(array $o = []): Supplier
    {
        return Supplier::query()->create(array_merge(['name' => 'Fournisseur '.uniqid()], $o));
    }

    /** Creates and orders a PO through the real endpoints. */
    private function orderedPo(Supplier $s, array $lines)
    {
        $m = $this->manager();
        $this->actingAs($m)->post('/achats', ['supplier_id' => $s->id, 'lines' => $lines])->assertSessionHasNoErrors();
        $po = PurchaseOrder::query()->latest('id')->firstOrFail();
        $this->actingAs($m)->post("/achats/{$po->id}/commander")->assertSessionHasNoErrors();

        return $po->fresh();
    }

    public function test_cashier_is_forbidden(): void
    {
        $c = $this->cashier();
        $this->actingAs($c)->get('/fournisseurs')->assertForbidden();
        $this->actingAs($c)->get('/achats')->assertForbidden();
        $this->actingAs($c)->post('/fournisseurs', ['name' => 'X'])->assertForbidden();
    }

    public function test_all_pages_render_for_a_manager(): void
    {
        $m = $this->manager();
        $s = $this->supplier();
        $p = $this->product();
        $po = $this->orderedPo($s, [['product_id' => $p->id, 'quantity' => 2, 'unit_cost' => 10, 'vat_rate' => 0]]);
        $this->actingAs($m)->post('/receptions', ['purchase_order_id' => $po->id, 'lines' => [['product_id' => $p->id, 'quantity' => 1]]]);
        $rec = Reception::query()->latest('id')->firstOrFail();

        foreach ([
            '/fournisseurs' => 'Suppliers/Index',
            "/fournisseurs/{$s->id}" => 'Suppliers/Show',
            '/achats' => 'Purchases/Index',
            '/achats/nouveau' => 'Purchases/Form',
            "/achats/{$po->id}" => 'Purchases/Show',
            "/achats/{$po->id}/receptionner" => 'Receptions/Create',
            '/receptions/nouvelle' => 'Receptions/Create',
            "/receptions/{$rec->id}" => 'Receptions/Show',
        ] as $url => $component) {
            $this->actingAs($m)->get($url)->assertOk()->assertInertia(fn ($page) => $page->component($component));
        }

        $this->actingAs($m)->get('/achats/suggestions')->assertOk()->assertJsonIsArray();
    }

    public function test_supplier_crud_and_deactivation_with_history(): void
    {
        $m = $this->manager();
        $this->actingAs($m)->post('/fournisseurs', ['name' => 'Alpha'])->assertSessionHasNoErrors();
        $s = Supplier::query()->where('name', 'Alpha')->firstOrFail();
        $this->actingAs($m)->put("/fournisseurs/{$s->id}", ['name' => 'Beta'])->assertSessionHasNoErrors();
        $this->assertSame('Beta', $s->fresh()->name);

        $p = $this->product();
        $this->orderedPo($s, [['product_id' => $p->id, 'quantity' => 2, 'unit_cost' => 100, 'vat_rate' => 19]]);
        $this->actingAs($m)->delete("/fournisseurs/{$s->id}");
        $this->assertFalse($s->fresh()->active);

        $empty = $this->supplier();
        $this->actingAs($m)->delete("/fournisseurs/{$empty->id}");
        $this->assertNull(Supplier::query()->find($empty->id));
    }

    public function test_purchase_order_totals_and_unique_references(): void
    {
        $s = $this->supplier();
        $p = $this->product();
        $po1 = $this->orderedPo($s, [['product_id' => $p->id, 'quantity' => 10, 'unit_cost' => 100, 'vat_rate' => 19]]);
        $po2 = $this->orderedPo($s, [['product_id' => $p->id, 'quantity' => 1, 'unit_cost' => 100, 'vat_rate' => 19]]);

        $this->assertEquals(1000, $po1->total_ht);
        $this->assertEquals(190, $po1->total_vat);
        $this->assertEquals(1190, $po1->total_ttc);
        $this->assertSame(PurchaseOrder::STATUS_ORDERED, $po1->status);
        $this->assertNotSame($po1->reference, $po2->reference);
    }

    public function test_partial_then_full_reception_updates_stock_status_and_pmp(): void
    {
        $m = $this->manager();
        $s = $this->supplier();
        $p = $this->product(['stock' => 10, 'cost_price' => 100]);
        $po = $this->orderedPo($s, [['product_id' => $p->id, 'quantity' => 10, 'unit_cost' => 200, 'vat_rate' => 19]]);

        $this->actingAs($m)->post('/receptions', [
            'purchase_order_id' => $po->id,
            'lines' => [['product_id' => $p->id, 'quantity' => 4]],
        ])->assertSessionHasNoErrors();

        $p->refresh();
        $this->assertSame(14, $p->stock);
        // (10 * 100 + 4 * 200) / 14 = 128.57
        $this->assertEquals(128.57, (float) $p->cost_price);
        $this->assertSame(PurchaseOrder::STATUS_PARTIAL, $po->fresh()->status);

        $reception = Reception::query()->latest('id')->firstOrFail();
        $movement = StockMovement::query()->where('reception_id', $reception->id)->sole();
        $this->assertSame(StockMovement::TYPE_PURCHASE, $movement->type);
        $this->assertSame(4, $movement->quantity);

        $this->actingAs($m)->post('/receptions', [
            'purchase_order_id' => $po->id,
            'lines' => [['product_id' => $p->id, 'quantity' => 6]],
        ])->assertSessionHasNoErrors();
        $this->assertSame(PurchaseOrder::STATUS_RECEIVED, $po->fresh()->status);
        $this->assertSame(20, $p->fresh()->stock);
    }

    public function test_over_receiving_and_receiving_a_closed_order_are_refused(): void
    {
        $m = $this->manager();
        $p = $this->product();
        $po = $this->orderedPo($this->supplier(), [['product_id' => $p->id, 'quantity' => 3, 'unit_cost' => 50, 'vat_rate' => 0]]);

        $this->actingAs($m)->post('/receptions', [
            'purchase_order_id' => $po->id,
            'lines' => [['product_id' => $p->id, 'quantity' => 4]],
        ])->assertSessionHasErrors('reception');
        $this->assertSame(10, $p->fresh()->stock);

        $this->actingAs($m)->post("/achats/{$po->id}/annuler")->assertSessionHasNoErrors();
        $this->actingAs($m)->post('/receptions', [
            'purchase_order_id' => $po->id,
            'lines' => [['product_id' => $p->id, 'quantity' => 1]],
        ])->assertSessionHasErrors('reception');
    }

    public function test_cannot_cancel_after_a_reception(): void
    {
        $m = $this->manager();
        $p = $this->product();
        $po = $this->orderedPo($this->supplier(), [['product_id' => $p->id, 'quantity' => 3, 'unit_cost' => 50, 'vat_rate' => 0]]);
        $this->actingAs($m)->post('/receptions', [
            'purchase_order_id' => $po->id,
            'lines' => [['product_id' => $p->id, 'quantity' => 1]],
        ])->assertSessionHasNoErrors();

        $this->actingAs($m)->post("/achats/{$po->id}/annuler")->assertSessionHasErrors('purchase');
        $this->assertSame(PurchaseOrder::STATUS_PARTIAL, $po->fresh()->status);
    }

    public function test_pmp_edge_cases_and_direct_reception(): void
    {
        $m = $this->manager();
        $s = $this->supplier();

        $noStock = $this->product(['stock' => 0, 'cost_price' => 500]);
        $noCost = $this->product(['stock' => 5, 'cost_price' => null]);
        $unlimited = $this->product(['stock' => 0, 'unlimited_stock' => true, 'cost_price' => 10]);

        $this->actingAs($m)->post('/receptions', [
            'supplier_id' => $s->id,
            'lines' => [
                ['product_id' => $noStock->id, 'quantity' => 2, 'unit_cost' => 80, 'vat_rate' => 19],
                ['product_id' => $noCost->id, 'quantity' => 5, 'unit_cost' => 60, 'vat_rate' => 19],
                ['product_id' => $unlimited->id, 'quantity' => 3, 'unit_cost' => 30, 'vat_rate' => 19],
            ],
        ])->assertSessionHasNoErrors();

        $this->assertEquals(80, (float) $noStock->fresh()->cost_price);
        $this->assertEquals(60, (float) $noCost->fresh()->cost_price);
        $this->assertEquals(30, (float) $unlimited->fresh()->cost_price);
        $this->assertSame(2, $noStock->fresh()->stock);
        $this->assertSame(0, $unlimited->fresh()->stock);
    }

    public function test_supplier_balance_and_payments(): void
    {
        $m = $this->manager();
        $s = $this->supplier();
        $p = $this->product();

        $this->actingAs($m)->post('/receptions', [
            'supplier_id' => $s->id,
            'lines' => [['product_id' => $p->id, 'quantity' => 10, 'unit_cost' => 100, 'vat_rate' => 19]],
        ])->assertSessionHasNoErrors();
        $this->assertEquals(1190, $s->balance());

        $this->actingAs($m)->post("/fournisseurs/{$s->id}/paiements", ['amount' => 500, 'method' => 'cash'])->assertSessionHasNoErrors();
        $this->assertEquals(690, $s->balance());

        $this->actingAs($m)->post("/fournisseurs/{$s->id}/paiements", ['amount' => 700, 'method' => 'cash'])->assertSessionHasErrors('amount');
        $this->assertEquals(690, $s->balance());
    }

    public function test_payment_at_reception_reduces_balance(): void
    {
        $m = $this->manager();
        $s = $this->supplier();
        $p = $this->product();

        $this->actingAs($m)->post('/receptions', [
            'supplier_id' => $s->id,
            'lines' => [['product_id' => $p->id, 'quantity' => 10, 'unit_cost' => 100, 'vat_rate' => 0]],
            'payment' => ['amount' => 400, 'method' => 'transfer'],
        ])->assertSessionHasNoErrors();

        $this->assertEquals(600, $s->balance());
    }
}
