<?php

namespace Tests\Feature;

use App\Models\Settings;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * Uses DatabaseTransactions (not RefreshDatabase): phpunit.xml has no separate
 * test database, so every test is rolled back instead of wiping the real one.
 */
class SettingsTest extends TestCase
{
    use DatabaseTransactions;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'shopName' => 'Ma Boutique',
            'shopCode' => 'MB-01',
            'currency' => 'DZD',
            'language' => 'fr',
            'timezone' => 'Africa/Algiers',
            'company' => 'SARL Test',
            'rc' => '',
            'nif' => '',
            'address' => '',
            'phone' => '',
            'email' => '',
            'vatRate' => 9,
            'receiptFooter' => '',
            'showLogo' => false,
            'printAuto' => true,
            'cashEnabled' => true,
            'cardEnabled' => false,
            'creditEnabled' => true,
            'printerName' => 'Epson TM-T20III',
            'paperSize' => '80mm',
            'theme' => 'dark',
            'accentColor' => 'rose',
            'notifLowStock' => true,
            'notifDailyReport' => false,
            'notifNewSale' => true,
            'twoFactor' => false,
            'sessionTimeout' => 45,
            'autoBackup' => true,
            'backupFrequency' => 'weekly',
        ], $overrides);
    }

    private function user(): User
    {
        return User::factory()->create();
    }

    public function test_settings_page_exposes_defaults_even_when_row_is_missing(): void
    {
        Settings::query()->delete();

        $this->actingAs($this->user())
            ->get('/parametres')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Settings/Index')
                ->where('settings.shopName', 'POS')
                ->where('settings.vatRate', 19)
                ->where('settings.cashEnabled', true));
    }

    public function test_full_form_saves_with_empty_optional_fields(): void
    {
        $this->actingAs($this->user())
            ->from('/parametres')
            ->put('/parametres', $this->payload())
            ->assertRedirect('/parametres')
            ->assertSessionHasNoErrors()
            ->assertSessionHas('success');

        $s = Settings::current();
        $this->assertSame('Ma Boutique', $s->shop_name);
        $this->assertSame(9, $s->vat_rate);
        $this->assertSame('', $s->receipt_footer);
        $this->assertNull($s->email);
        $this->assertFalse($s->show_logo);
        $this->assertTrue($s->credit_enabled);
        $this->assertSame('dark', $s->theme);
        $this->assertSame(45, $s->session_timeout);
    }

    public function test_empty_required_field_returns_validation_error_instead_of_crashing(): void
    {
        $before = Settings::current()->shop_name;

        $this->actingAs($this->user())
            ->from('/parametres')
            ->put('/parametres', $this->payload(['shopName' => '', 'vatRate' => 150, 'email' => 'pas-un-email']))
            ->assertRedirect('/parametres')
            ->assertSessionHasErrors(['shopName', 'vatRate', 'email']);

        $this->assertSame($before, Settings::current()->shop_name);
    }

    public function test_partial_update_does_not_null_other_fields(): void
    {
        $this->actingAs($this->user())
            ->put('/parametres', $this->payload());

        $this->actingAs($this->user())
            ->put('/parametres', ['theme' => 'light'])
            ->assertSessionHasNoErrors();

        $s = Settings::current();
        $this->assertSame('light', $s->theme);
        $this->assertSame('Ma Boutique', $s->shop_name);
        $this->assertSame('weekly', $s->backup_frequency);
    }

    public function test_guest_cannot_update_settings(): void
    {
        $this->put('/parametres', $this->payload())->assertRedirect('/login');
    }
}
