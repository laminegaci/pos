<?php

namespace Tests\Feature;

use App\Models\Inventory;
use App\Models\InventoryLine;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\CreatesShopData;
use Tests\TestCase;

class InventoryTest extends TestCase
{
    use CreatesShopData;
    use DatabaseTransactions;

    private function start(): Inventory
    {
        // Close any leftover draft so the single-draft rule does not depend on the dev database.
        Inventory::where('status', 'draft')->update(['status' => 'cancelled']);

        $this->actingAs($this->manager())->post('/inventaires', [])->assertSessionHasNoErrors();

        return Inventory::latest('id')->firstOrFail();
    }

    private function line(Inventory $i, Product $p): InventoryLine
    {
        return $i->lines()->where('product_id', $p->id)->firstOrFail();
    }

    private function countLine(Inventory $i, Product $p, ?int $qty): void
    {
        $this->putJson("/inventaires/{$i->id}/lignes/{$this->line($i, $p)->id}", ['counted_qty' => $qty])->assertOk();
    }

    public function test_starting_snapshots_limited_active_products_only(): void
    {
        $p = $this->product(['stock' => 4]);
        $unlimited = $this->product(['unlimited_stock' => true]);
        $inactive = $this->product(['active' => false]);

        $i = $this->start();

        $this->assertSame(4, $this->line($i, $p)->expected_qty);
        $this->assertFalse($i->lines()->where('product_id', $unlimited->id)->exists());
        $this->assertFalse($i->lines()->where('product_id', $inactive->id)->exists());
    }

    public function test_only_one_draft_at_a_time(): void
    {
        $this->product();
        $this->start();

        $this->actingAs($this->manager())->post('/inventaires', [])->assertSessionHasErrors('inventory');
    }

    public function test_validation_applies_the_gaps_as_inventory_movements(): void
    {
        $p = $this->product(['stock' => 10]);
        $i = $this->start();
        $this->countLine($i, $p, 7);

        $this->actingAs($this->manager())->post("/inventaires/{$i->id}/valider", ['uncounted' => 'keep'])
            ->assertSessionHasNoErrors();

        $this->assertSame(7, $p->fresh()->stock);
        $m = StockMovement::where('product_id', $p->id)->sole();
        $this->assertSame('inventory', $m->type);
        $this->assertSame(-3, $m->quantity);
        $this->assertSame($i->reference, $m->note);
        $this->assertSame('validated', $i->fresh()->status);
    }

    public function test_a_sale_during_counting_is_preserved(): void
    {
        $p = $this->product(['stock' => 10]);
        $i = $this->start();
        $this->sell($this->manager(), [['product_id' => $p->id, 'quantity' => 2]]); // stock 8
        $this->countLine($i, $p, 9); // snapshot was 10, so the gap is -1

        $this->actingAs($this->manager())->post("/inventaires/{$i->id}/valider", ['uncounted' => 'keep']);

        $this->assertSame(7, $p->fresh()->stock); // 8 + (9 - 10)
    }

    public function test_uncounted_lines_are_kept_or_zeroed(): void
    {
        $a = $this->product(['stock' => 6]);
        $i = $this->start();
        $this->actingAs($this->manager())->post("/inventaires/{$i->id}/valider", ['uncounted' => 'keep']);
        $this->assertSame(6, $a->fresh()->stock);

        $b = $this->product(['stock' => 6]);
        $j = $this->start();
        $this->actingAs($this->manager())->post("/inventaires/{$j->id}/valider", ['uncounted' => 'zero']);
        $this->assertSame(0, $b->fresh()->stock);
    }

    public function test_a_cashier_can_count_but_not_validate_and_a_validated_inventory_is_locked(): void
    {
        $p = $this->product(['stock' => 3]);
        $i = $this->start();

        $this->actingAs($this->cashier());
        $this->countLine($i, $p, 2);
        $this->post("/inventaires/{$i->id}/valider", ['uncounted' => 'keep'])->assertForbidden();

        $this->actingAs($this->manager())->post("/inventaires/{$i->id}/valider", ['uncounted' => 'keep']);
        $this->putJson("/inventaires/{$i->id}/lignes/{$this->line($i, $p)->id}", ['counted_qty' => 1])->assertStatus(422);
        $this->assertSame(2, $this->line($i, $p)->counted_qty);
    }
}
