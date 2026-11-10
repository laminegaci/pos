<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\HeldCart;
use App\Models\StockMovement;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\CreatesShopData;
use Tests\TestCase;

class HeldCartTest extends TestCase
{
    use CreatesShopData;
    use DatabaseTransactions;

    public function test_a_cashier_holds_a_cart_without_touching_stock(): void
    {
        $cashier = $this->cashier();
        $a = $this->product(['price' => 1000, 'stock' => 10]);
        $b = $this->product(['price' => 500, 'stock' => 10]);
        $client = Client::query()->create(['name' => 'C '.uniqid(), 'type' => 'particulier']);
        $movements = StockMovement::query()->count();

        $this->actingAs($cashier)->postJson('/ventes/attente', [
            'items' => [['product_id' => $a->id, 'quantity' => 2], ['product_id' => $b->id, 'quantity' => 1], ['product_id' => $a->id, 'quantity' => 1]],
            'client_id' => $client->id,
            'discount' => ['type' => 'percent', 'value' => 10],
            'label' => 'pull bleu',
        ])->assertCreated();

        $held = HeldCart::query()->latest('id')->firstOrFail();
        $this->assertSame(4, $held->items_count);
        $this->assertEquals(3150, $held->total); // (3000 + 500) - 10 %
        $this->assertCount(2, $held->items); // duplicate product merged
        $this->assertSame(10, $a->fresh()->stock);
        $this->assertSame($movements, StockMovement::query()->count());

        $this->actingAs($cashier)->getJson('/ventes/attente')
            ->assertOk()
            ->assertJsonFragment(['id' => $held->id, 'label' => 'pull bleu', 'items_count' => 4]);
    }

    public function test_resume_returns_the_cart_once_and_reports_current_stock(): void
    {
        $cashier = $this->cashier();
        $kept = $this->product(['stock' => 10]);
        $reduced = $this->product(['stock' => 10]);
        $gone = $this->product(['stock' => 10]);

        $this->actingAs($cashier)->postJson('/ventes/attente', [
            'items' => [
                ['product_id' => $kept->id, 'quantity' => 1],
                ['product_id' => $reduced->id, 'quantity' => 5],
                ['product_id' => $gone->id, 'quantity' => 1],
            ],
            'discount' => ['type' => 'amount', 'value' => 100],
        ])->assertCreated();
        $held = HeldCart::query()->latest('id')->firstOrFail();

        $reduced->update(['stock' => 2]);
        $gone->update(['active' => false]);

        $response = $this->actingAs($this->cashier())->postJson("/ventes/attente/{$held->id}/reprendre")->assertOk();
        $lines = collect($response->json('lines'))->keyBy('product_id');
        $this->assertSame(2, $lines[$reduced->id]['available']);
        $this->assertFalse($lines[$gone->id]['active']);
        $this->assertTrue($lines[$kept->id]['active']);
        $this->assertEquals(100, $response->json('discount.value'));
        $this->assertNull(HeldCart::query()->find($held->id));

        // A second till cannot take the same ticket.
        $this->actingAs($cashier)->postJson("/ventes/attente/{$held->id}/reprendre")->assertNotFound();
    }

    public function test_yesterdays_tickets_are_purged(): void
    {
        $cashier = $this->cashier();
        $p = $this->product();
        $this->actingAs($cashier)->postJson('/ventes/attente', ['items' => [['product_id' => $p->id, 'quantity' => 1]]])->assertCreated();
        $old = HeldCart::query()->latest('id')->firstOrFail();
        HeldCart::query()->whereKey($old->id)->update(['created_at' => now()->subDay()]);

        $this->actingAs($cashier)->getJson('/ventes/attente')->assertOk()->assertJsonMissing(['id' => $old->id]);
        $this->assertNull(HeldCart::query()->find($old->id));
    }

    public function test_delete_validation_and_guests(): void
    {
        $cashier = $this->cashier();
        $p = $this->product();
        $this->actingAs($cashier)->postJson('/ventes/attente', ['items' => [['product_id' => $p->id, 'quantity' => 1]]])->assertCreated();
        $held = HeldCart::query()->latest('id')->firstOrFail();

        $this->actingAs($cashier)->deleteJson("/ventes/attente/{$held->id}")->assertOk();
        $this->assertNull(HeldCart::query()->find($held->id));

        $this->actingAs($cashier)->postJson('/ventes/attente', ['items' => []])->assertUnprocessable();

        auth()->logout();
        $this->get('/ventes/attente')->assertRedirect('/login');
    }
}
