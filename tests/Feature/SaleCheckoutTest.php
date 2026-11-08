<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Settings;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * DatabaseTransactions (not RefreshDatabase): there is no separate test
 * database, so each test is rolled back instead of wiping the real one.
 */
class SaleCheckoutTest extends TestCase
{
    use DatabaseTransactions;

    public function test_checkout_flashes_the_sale_for_the_confirmation_modal(): void
    {
        $product = Product::query()->create([
            'name' => 'Produit test', 'description' => 'desc', 'price' => 1500,
            'category_id' => 'bureaux', 'stock' => 10, 'sku' => 'TEST-'.uniqid(), 'active' => true,
        ]);

        $response = $this->actingAs(User::factory()->create())
            ->post('/ventes', [
                'client_id' => null,
                'remise' => 500,
                'items' => [['product_id' => $product->id, 'quantity' => 2]],
            ]);

        $response->assertRedirect('/')->assertSessionHas('success');

        $sale = session('sale');
        $this->assertIsArray($sale);
        $this->assertSame(3000.0, $sale['subtotal']);
        $this->assertSame(500.0, $sale['remise']);
        $this->assertSame(2500.0, $sale['total']);
        $this->assertSame(2, $sale['items_count']);
        $this->assertNull($sale['client']);

        // The flashed sale reaches the Sales page as a shared prop, with the print setting.
        $this->get('/')
            ->assertInertia(fn ($page) => $page
                ->component('Sales/Index')
                ->where('flash.sale.id', $sale['id'])
                ->has('printAuto'));

        // And its invoice can be streamed for printing.
        $this->get("/ventes/{$sale['id']}/facture?stream=1")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    private function makeSale(): int
    {
        $product = Product::query()->create([
            'name' => 'Bureau ticket test', 'description' => 'desc', 'price' => 1500,
            'category_id' => 'bureaux', 'stock' => 10, 'sku' => 'TICKET-'.uniqid(), 'active' => true,
        ]);

        $this->post('/ventes', [
            'client_id' => null,
            'remise' => 0,
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ]);

        return session('sale')['id'];
    }

    public function test_thermal_ticket_uses_the_paper_setting_and_shows_change(): void
    {
        $this->actingAs(User::factory()->create());
        Settings::current()->update(['paper_size' => '80mm', 'shop_name' => 'Boutique Test']);
        $id = $this->makeSale();

        $this->get("/ventes/{$id}/ticket")
            ->assertOk()
            ->assertHeader('content-type', 'text/html; charset=UTF-8')
            ->assertSee('size: 80mm auto', false)
            ->assertSee('Boutique Test')
            ->assertSee('Bureau ticket test')
            ->assertSee('3 000,00 DA')
            ->assertDontSee('Rendu');

        $this->get("/ventes/{$id}/ticket?format=58mm&recu=5000")
            ->assertOk()
            ->assertSee('size: 58mm auto', false)
            ->assertSee('Rendu')
            ->assertSee('2 000,00 DA');

        Settings::current()->update(['paper_size' => '58mm']);
        $this->get("/ventes/{$id}/ticket")->assertSee('size: 58mm auto', false);

        // Invalid values fall back to the setting / are ignored.
        $this->get("/ventes/{$id}/ticket?format=A4&recu=abc")
            ->assertOk()
            ->assertSee('size: 58mm auto', false)
            ->assertDontSee('Rendu');
    }

    public function test_guest_cannot_open_a_ticket(): void
    {
        $this->get('/ventes/1/ticket')->assertRedirect('/login');
    }
}
