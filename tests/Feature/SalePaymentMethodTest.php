<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Settings;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class SalePaymentMethodTest extends TestCase
{
    use DatabaseTransactions;

    private function product(): Product
    {
        return Product::query()->create([
            'name' => 'Produit paiement', 'description' => 'desc', 'price' => 1000,
            'category_id' => 'bureaux', 'stock' => 10, 'sku' => 'PAY-'.uniqid(), 'active' => true,
        ]);
    }

    private function checkout(array $extra = [])
    {
        return $this->actingAs(User::factory()->create())->post('/ventes', array_merge([
            'client_id' => null,
            'remise' => 0,
            'items' => [['product_id' => $this->product()->id, 'quantity' => 1]],
        ], $extra));
    }

    private function enable(bool $cash, bool $card, bool $credit): void
    {
        Settings::current()->update(['cash_enabled' => $cash, 'card_enabled' => $card, 'credit_enabled' => $credit]);
    }

    public function test_method_is_stored_and_flashed(): void
    {
        $this->enable(true, true, false);

        $this->checkout(['payment_method' => 'card'])->assertSessionHasNoErrors();

        $this->assertSame('card', session('sale')['payment_method']);
        $this->assertSame('card', Sale::query()->findOrFail(session('sale')['id'])->payment_method);
    }

    public function test_missing_method_falls_back_to_first_enabled(): void
    {
        $this->enable(false, true, true);

        $this->checkout()->assertSessionHasNoErrors();

        $this->assertSame('card', session('sale')['payment_method']);
    }

    public function test_disabled_method_is_rejected(): void
    {
        $this->enable(true, false, false);

        $this->checkout(['payment_method' => 'card'])->assertSessionHasErrors('payment_method');
        $this->assertSame(0, Sale::query()->where('payment_method', 'card')->count());
    }

    public function test_credit_requires_a_client(): void
    {
        $this->enable(true, false, true);

        $this->checkout(['payment_method' => 'credit'])->assertSessionHasErrors('payment_method');

        $client = Client::query()->create(['name' => 'Client crédit', 'active' => true]);
        $this->checkout(['payment_method' => 'credit', 'client_id' => $client->id])->assertSessionHasNoErrors();
        $this->assertSame('credit', session('sale')['payment_method']);
    }

    public function test_cannot_disable_every_method(): void
    {
        $this->actingAs(User::factory()->create())
            ->from('/parametres')
            ->put('/parametres', ['cashEnabled' => false, 'cardEnabled' => false, 'creditEnabled' => false])
            ->assertSessionHasErrors('cashEnabled');
    }
}
