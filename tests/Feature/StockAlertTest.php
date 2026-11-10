<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Settings;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\CreatesShopData;
use Tests\TestCase;

class StockAlertTest extends TestCase
{
    use CreatesShopData;
    use DatabaseTransactions;

    private function threshold(int $value): void
    {
        $s = Settings::current();
        $s->low_stock_threshold = $value;
        $s->save();
    }

    public function test_product_minimum_takes_priority_over_the_shop_default(): void
    {
        $this->threshold(10);
        $own = $this->product(['stock' => 4, 'min_stock' => 3]);
        $default = $this->product(['stock' => 4]);

        $this->assertSame('ok', $own->fresh()->stock_status);
        $this->assertSame('low', $default->fresh()->stock_status);
        $ids = Product::lowStock()->pluck('id');
        $this->assertTrue($ids->contains($default->id));
        $this->assertFalse($ids->contains($own->id));
    }

    public function test_out_of_stock_is_out_and_unlimited_or_inactive_are_excluded(): void
    {
        $this->threshold(10);
        $out = $this->product(['stock' => 0]);
        $unlimited = $this->product(['stock' => 0, 'unlimited_stock' => true]);
        $inactive = $this->product(['stock' => 1, 'active' => false]);

        $this->assertSame('out', $out->fresh()->stock_status);
        $this->assertSame('unlimited', $unlimited->fresh()->stock_status);
        $ids = Product::lowStock()->pluck('id');
        $this->assertTrue($ids->contains($out->id));
        $this->assertFalse($ids->contains($unlimited->id));
        $this->assertFalse($ids->contains($inactive->id));
    }

    public function test_stock_alerts_are_shared_only_when_the_notification_is_on(): void
    {
        $this->product(['stock' => 0]);
        $user = $this->manager();

        $s = Settings::current();
        $s->notif_low_stock = true;
        $s->save();
        $this->actingAs($user)->get('/produits')
            ->assertInertia(fn (Assert $p) => $p->where('stockAlerts.count', fn ($c) => $c >= 1));

        $s->notif_low_stock = false;
        $s->save();
        $this->actingAs($user)->get('/produits')
            ->assertInertia(fn (Assert $p) => $p->where('stockAlerts', null));
    }

    public function test_the_threshold_setting_can_be_updated(): void
    {
        $this->actingAs($this->manager())->put('/parametres', ['lowStockThreshold' => 7])
            ->assertSessionHasNoErrors();

        $this->assertSame(7, (int) Settings::current()->low_stock_threshold);
    }
}
