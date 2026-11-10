<?php

namespace Tests\Feature;

use App\Models\StockMovement;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\CreatesShopData;
use Tests\TestCase;

class StockAdjustmentTest extends TestCase
{
    use CreatesShopData;
    use DatabaseTransactions;

    public function test_breakage_decrements_the_stock_and_records_the_reason(): void
    {
        $p = $this->product(['stock' => 10]);

        $this->actingAs($this->manager())->post("/produits/{$p->id}/ajustement", [
            'direction' => 'out', 'quantity' => 3, 'reason' => 'casse', 'note' => 'Fell off the shelf',
        ])->assertSessionHasNoErrors();

        $this->assertSame(7, $p->fresh()->stock);
        $m = StockMovement::where('product_id', $p->id)->sole();
        $this->assertSame('adjustment', $m->type);
        $this->assertSame('casse', $m->reason);
        $this->assertSame(-3, $m->quantity);
        $this->assertSame('Fell off the shelf', $m->note);
    }

    public function test_goods_received_increments_the_stock(): void
    {
        $p = $this->product(['stock' => 1]);

        $this->actingAs($this->manager())->post("/produits/{$p->id}/ajustement", [
            'direction' => 'in', 'quantity' => 5, 'reason' => 'reception',
        ])->assertSessionHasNoErrors();

        $this->assertSame(6, $p->fresh()->stock);
    }

    public function test_the_reason_is_required_and_must_match_the_direction(): void
    {
        $p = $this->product(['stock' => 10]);
        $user = $this->manager();

        $this->actingAs($user)->post("/produits/{$p->id}/ajustement", ['direction' => 'out', 'quantity' => 1])
            ->assertSessionHasErrors('reason');
        $this->actingAs($user)->post("/produits/{$p->id}/ajustement", ['direction' => 'out', 'quantity' => 1, 'reason' => 'reception'])
            ->assertSessionHasErrors('reason');
        $this->actingAs($user)->post("/produits/{$p->id}/ajustement", ['direction' => 'out', 'quantity' => 1, 'reason' => 'autre'])
            ->assertSessionHasErrors('note');

        $this->assertSame(10, $p->fresh()->stock);
    }

    public function test_the_stock_cannot_go_negative(): void
    {
        $p = $this->product(['stock' => 2]);

        $this->actingAs($this->manager())->post("/produits/{$p->id}/ajustement", [
            'direction' => 'out', 'quantity' => 5, 'reason' => 'perte',
        ])->assertSessionHasErrors('stock');

        $this->assertSame(2, $p->fresh()->stock);
    }

    public function test_a_cashier_is_forbidden_and_a_guest_is_redirected(): void
    {
        $p = $this->product();
        $payload = ['direction' => 'out', 'quantity' => 1, 'reason' => 'casse'];

        $this->actingAs($this->cashier())->post("/produits/{$p->id}/ajustement", $payload)->assertForbidden();
        auth()->logout();
        $this->post("/produits/{$p->id}/ajustement", $payload)->assertRedirect('/login');
    }
}
