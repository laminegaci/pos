<?php

namespace Tests\Feature;

use App\Http\Middleware\ApplySessionTimeout;
use App\Models\Product;
use App\Models\Settings;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SettingsEffectsTest extends TestCase
{
    use DatabaseTransactions;

    public function test_shop_settings_are_shared_with_every_page(): void
    {
        Settings::current()->update(['currency' => 'EUR', 'theme' => 'dark', 'session_timeout' => 15, 'card_enabled' => false]);

        $this->actingAs(User::factory()->create())->get('/parametres')
            ->assertInertia(fn ($page) => $page
                ->where('shop.currency', 'EUR')
                ->where('shop.currencySymbol', '€')
                ->where('shop.theme', 'dark')
                ->where('shop.sessionTimeout', 15)
                ->where('shop.paymentMethods', ['cash']));
    }

    public function test_session_lifetime_follows_the_setting(): void
    {
        Settings::current()->update(['session_timeout' => 7]);

        (new ApplySessionTimeout)->handle(Request::create('/'), fn () => response('ok'));

        $this->assertSame(7, config('session.lifetime'));
    }

    public function test_logo_upload_and_delete(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user)->post('/parametres/logo', ['logo' => UploadedFile::fake()->image('logo.png', 100, 100)])
            ->assertSessionHasNoErrors();

        $path = Settings::current()->logo_path;
        $this->assertNotNull($path);
        Storage::disk('public')->assertExists($path);

        $this->actingAs($user)->delete('/parametres/logo');
        $this->assertNull(Settings::current()->logo_path);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_ticket_shows_logo_and_currency_from_settings(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $product = Product::query()->create([
            'name' => 'Produit ticket', 'description' => 'desc', 'price' => 1000,
            'category_id' => 'bureaux', 'stock' => 5, 'sku' => 'LOGO-'.uniqid(), 'active' => true,
        ]);
        $this->actingAs($user)->post('/ventes', ['items' => [['product_id' => $product->id, 'quantity' => 1]]]);
        $saleId = session('sale')['id'];

        $this->actingAs($user)->post('/parametres/logo', ['logo' => UploadedFile::fake()->image('logo.png')]);
        Settings::current()->update(['currency' => 'EUR', 'show_logo' => true]);

        $this->get("/ventes/{$saleId}/ticket")->assertOk()->assertSee('class="logo"', false)->assertSee('€');

        Settings::current()->update(['show_logo' => false]);
        $this->get("/ventes/{$saleId}/ticket")->assertDontSee('class="logo"', false);
    }
}
