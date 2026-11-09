<?php

namespace Tests\Concerns;

use App\Models\CreditNote;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;

/**
 * Small helpers shared by the returns / credit note tests.
 * The tests using it must use DatabaseTransactions (there is no separate test database).
 */
trait CreatesShopData
{
    private function makeUser(string $role): User
    {
        $user = User::factory()->create();
        $user->role = $role; // not mass assignable on purpose
        $user->save();

        return $user;
    }

    private function manager(): User
    {
        return $this->makeUser(User::ROLE_MANAGER);
    }

    private function cashier(): User
    {
        return $this->makeUser(User::ROLE_CASHIER);
    }

    private function product(array $overrides = []): Product
    {
        return Product::query()->create(array_merge([
            'name' => 'Produit '.uniqid(),
            'description' => 'desc',
            'price' => 1000,
            'category_id' => 'bureaux',
            'stock' => 10,
            'unlimited_stock' => false,
            'sku' => 'T-'.uniqid(),
            'active' => true,
        ], $overrides));
    }

    /** Sells through the real endpoint (stock, journal, credit note: everything runs). */
    private function sell(User $by, array $items, array $extra = []): Sale
    {
        $this->actingAs($by)->post('/ventes', array_merge([
            'client_id' => null,
            'remise' => 0,
            'items' => $items,
        ], $extra))->assertSessionHasNoErrors();

        return Sale::query()->findOrFail(session('sale')['id']);
    }

    private function creditNote(float $amount, ?float $balance = null): CreditNote
    {
        $note = CreditNote::query()->create(['code' => 'TMP-'.uniqid(), 'amount' => $amount, 'balance' => $balance ?? $amount]);
        $note->update(['code' => CreditNote::codeFor($note->id)]);

        return $note;
    }

    private function backdate(Sale $sale, int $days = 1): void
    {
        Sale::query()->whereKey($sale->id)->update(['created_at' => now()->subDays($days)]);
    }
}
