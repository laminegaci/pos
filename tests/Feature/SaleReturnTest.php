<?php

namespace Tests\Feature;

use App\Models\CreditNote;
use App\Models\Sale;
use App\Models\StockMovement;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\RateLimiter;
use Tests\Concerns\CreatesShopData;
use Tests\TestCase;

class SaleReturnTest extends TestCase
{
    use CreatesShopData, DatabaseTransactions;

    private function cancel(Sale $sale, array $data, $as)
    {
        return $this->actingAs($as)->post("/ventes/{$sale->id}/annuler", $data);
    }

    private function returnItems(Sale $sale, array $lines, array $extra, $as)
    {
        return $this->actingAs($as)->post("/ventes/{$sale->id}/retours", array_merge([
            'lines' => $lines,
            'reason' => 'Client mécontent',
            'refund_method' => 'cash',
        ], $extra));
    }

    // ---------------------------------------------------------------- cancel

    public function test_manager_cancels_todays_sale_and_everything_goes_back_to_stock(): void
    {
        $manager = $this->manager();
        $a = $this->product(['stock' => 10]);
        $b = $this->product(['stock' => 5]);
        $sale = $this->sell($manager, [['product_id' => $a->id, 'quantity' => 3], ['product_id' => $b->id, 'quantity' => 2]]);
        $this->assertSame(7, $a->fresh()->stock);

        $this->cancel($sale, ['reason' => 'Erreur de caisse'], $manager)->assertSessionHasNoErrors();

        $sale->refresh();
        $this->assertSame('cancelled', $sale->status);
        $this->assertSame('Erreur de caisse', $sale->cancel_reason);
        $this->assertSame($manager->id, $sale->cancelled_by);
        $this->assertSame($manager->id, $sale->cancel_approved_by);
        $this->assertSame(10, $a->fresh()->stock);
        $this->assertSame(5, $b->fresh()->stock);

        $m = StockMovement::where('product_id', $a->id)->where('type', 'cancel')->sole();
        $this->assertSame(3, $m->quantity);
        $this->assertSame($sale->id, $m->sale_id);
    }

    public function test_a_cashier_cannot_cancel_without_a_manager(): void
    {
        $cashier = $this->cashier();
        $p = $this->product(['stock' => 10]);
        $sale = $this->sell($cashier, [['product_id' => $p->id, 'quantity' => 2]]);

        $this->cancel($sale, ['reason' => 'x'], $cashier)->assertSessionHasErrors('approver_email');

        $this->assertSame('completed', $sale->fresh()->status);
        $this->assertSame(8, $p->fresh()->stock);
    }

    public function test_a_cashier_can_cancel_with_a_managers_credentials(): void
    {
        $cashier = $this->cashier();
        $manager = $this->manager(); // factory password is "password"
        $p = $this->product(['stock' => 10]);
        $sale = $this->sell($cashier, [['product_id' => $p->id, 'quantity' => 2]]);

        $this->cancel($sale, [
            'reason' => 'Erreur de caisse',
            'approver_email' => $manager->email,
            'approver_password' => 'password',
        ], $cashier)->assertSessionHasNoErrors();

        $sale->refresh();
        $this->assertSame('cancelled', $sale->status);
        $this->assertSame($cashier->id, $sale->cancelled_by);
        $this->assertSame($manager->id, $sale->cancel_approved_by);
        $this->assertSame(10, $p->fresh()->stock);
    }

    public function test_wrong_manager_password_or_a_cashier_as_approver_is_refused(): void
    {
        $cashier = $this->cashier();
        $manager = $this->manager();
        $otherCashier = $this->cashier();
        $p = $this->product();
        $sale = $this->sell($cashier, [['product_id' => $p->id, 'quantity' => 1]]);
        RateLimiter::clear('approval:'.$cashier->id);

        $this->cancel($sale, ['reason' => 'x', 'approver_email' => $manager->email, 'approver_password' => 'nope'], $cashier)
            ->assertSessionHasErrors('approver_password');
        // A colleague who is not a manager cannot approve, even with the right password.
        $this->cancel($sale, ['reason' => 'x', 'approver_email' => $otherCashier->email, 'approver_password' => 'password'], $cashier)
            ->assertSessionHasErrors('approver_password');
        // Unknown email: same answer (nothing to enumerate).
        $this->cancel($sale, ['reason' => 'x', 'approver_email' => 'nobody@example.test', 'approver_password' => 'password'], $cashier)
            ->assertSessionHasErrors('approver_password');

        $this->assertSame('completed', $sale->fresh()->status);
    }

    public function test_approval_attempts_are_rate_limited(): void
    {
        $cashier = $this->cashier();
        $manager = $this->manager();
        $p = $this->product();
        $sale = $this->sell($cashier, [['product_id' => $p->id, 'quantity' => 1]]);
        RateLimiter::clear('approval:'.$cashier->id);

        for ($i = 0; $i < 5; $i++) {
            $this->cancel($sale, ['reason' => 'x', 'approver_email' => $manager->email, 'approver_password' => 'bad'], $cashier);
        }

        // Even the right password is blocked once the limit is reached.
        $this->cancel($sale, ['reason' => 'x', 'approver_email' => $manager->email, 'approver_password' => 'password'], $cashier)
            ->assertSessionHasErrors('approver_password');
        $this->assertSame('completed', $sale->fresh()->status);

        RateLimiter::clear('approval:'.$cashier->id);
    }

    public function test_a_ticket_from_a_previous_day_cannot_be_cancelled(): void
    {
        $manager = $this->manager();
        $p = $this->product(['stock' => 10]);
        $sale = $this->sell($manager, [['product_id' => $p->id, 'quantity' => 2]]);
        $this->backdate($sale);

        $this->cancel($sale, ['reason' => 'x'], $manager)->assertSessionHasErrors('sale');

        $this->assertSame('completed', $sale->fresh()->status);
        $this->assertSame(8, $p->fresh()->stock);
    }

    public function test_a_ticket_with_a_return_cannot_be_cancelled(): void
    {
        $manager = $this->manager();
        $p = $this->product(['stock' => 10]);
        $sale = $this->sell($manager, [['product_id' => $p->id, 'quantity' => 3]]);
        $item = $sale->items()->first();
        $this->returnItems($sale, [['sale_item_id' => $item->id, 'quantity' => 1]], [], $manager)->assertSessionHasNoErrors();

        $this->cancel($sale, ['reason' => 'x'], $manager)->assertSessionHasErrors('sale');
        $this->assertSame('completed', $sale->fresh()->status);
    }

    public function test_cancelling_twice_does_not_restock_twice(): void
    {
        $manager = $this->manager();
        $p = $this->product(['stock' => 10]);
        $sale = $this->sell($manager, [['product_id' => $p->id, 'quantity' => 4]]);

        $this->cancel($sale, ['reason' => 'x'], $manager)->assertSessionHasNoErrors();
        $this->cancel($sale, ['reason' => 'x'], $manager)->assertSessionHasErrors('sale');

        $this->assertSame(10, $p->fresh()->stock);
        $this->assertSame(1, StockMovement::where('product_id', $p->id)->where('type', 'cancel')->count());
    }

    public function test_a_reason_is_required(): void
    {
        $manager = $this->manager();
        $p = $this->product();
        $sale = $this->sell($manager, [['product_id' => $p->id, 'quantity' => 1]]);

        $this->cancel($sale, ['reason' => ''], $manager)->assertSessionHasErrors('reason');
        $this->assertSame('completed', $sale->fresh()->status);
    }

    // ---------------------------------------------------------------- returns

    public function test_partial_return_refunds_pro_rata_of_the_discount_and_the_last_one_is_exact(): void
    {
        $manager = $this->manager();
        $p = $this->product(['price' => 1000, 'stock' => 10]);
        // 3 x 1000 = 3000, discount 300 => total 2700 (each unit really cost 900)
        $sale = $this->sell($manager, [['product_id' => $p->id, 'quantity' => 3]], ['remise' => 300]);
        $item = $sale->items()->first();
        $this->assertSame(7, $p->fresh()->stock);

        $this->returnItems($sale, [['sale_item_id' => $item->id, 'quantity' => 1]], [], $manager)->assertSessionHasNoErrors();

        $first = $sale->returns()->latest('id')->first();
        $this->assertEqualsWithDelta(900.0, (float) $first->amount, 0.001);
        $this->assertSame(8, $p->fresh()->stock);
        $this->assertSame('completed', $sale->fresh()->status, 'the sale stays; the refund is recorded apart');

        // Returning the remaining 2 refunds the exact remainder: 2700 - 900 = 1800.
        $this->returnItems($sale, [['sale_item_id' => $item->id, 'quantity' => 2]], [], $manager)->assertSessionHasNoErrors();

        $second = $sale->returns()->latest('id')->first();
        $this->assertEqualsWithDelta(1800.0, (float) $second->amount, 0.001);
        $this->assertEqualsWithDelta(2700.0, $sale->refundedAmount(), 0.001);
        $this->assertSame(10, $p->fresh()->stock);

        $m = StockMovement::where('product_id', $p->id)->where('type', 'return')->orderBy('id')->get();
        $this->assertSame([1, 2], $m->pluck('quantity')->all());
        $this->assertSame($sale->id, $m->first()->sale_id);
    }

    public function test_cents_are_never_lost_on_awkward_discounts(): void
    {
        $manager = $this->manager();
        $p = $this->product(['price' => 333, 'stock' => 10]);
        // 3 x 333 = 999, discount 100 => total 899; thirds of 899 do not divide evenly.
        $sale = $this->sell($manager, [['product_id' => $p->id, 'quantity' => 3]], ['remise' => 100]);
        $item = $sale->items()->first();

        foreach ([1, 1, 1] as $qty) {
            $this->returnItems($sale, [['sale_item_id' => $item->id, 'quantity' => $qty]], [], $manager)->assertSessionHasNoErrors();
        }

        $this->assertEqualsWithDelta(899.0, $sale->refundedAmount(), 0.001, 'refunds must add up to exactly what was paid');
    }

    public function test_restock_off_keeps_the_stock_untouched(): void
    {
        $manager = $this->manager();
        $p = $this->product(['stock' => 10]);
        $sale = $this->sell($manager, [['product_id' => $p->id, 'quantity' => 2]]);
        $item = $sale->items()->first();

        $this->returnItems($sale, [['sale_item_id' => $item->id, 'quantity' => 1, 'restock' => false]], [], $manager)
            ->assertSessionHasNoErrors();

        $this->assertSame(8, $p->fresh()->stock, 'a broken item is refunded but not put back');
        $this->assertSame(0, StockMovement::where('product_id', $p->id)->where('type', 'return')->count());
        $this->assertFalse((bool) $sale->returns()->first()->items()->first()->restock);
    }

    public function test_returning_an_unlimited_product_writes_no_stock_movement(): void
    {
        $manager = $this->manager();
        $p = $this->product(['stock' => 0, 'unlimited_stock' => true]);
        $sale = $this->sell($manager, [['product_id' => $p->id, 'quantity' => 2]]);
        $item = $sale->items()->first();

        $this->returnItems($sale, [['sale_item_id' => $item->id, 'quantity' => 1]], [], $manager)->assertSessionHasNoErrors();

        $this->assertSame(0, $p->fresh()->stock);
        $this->assertSame(0, StockMovement::where('product_id', $p->id)->count());
        $this->assertEqualsWithDelta(1000.0, $sale->refundedAmount(), 0.001);
    }

    public function test_returning_more_than_what_is_left_is_refused_and_nothing_changes(): void
    {
        $manager = $this->manager();
        $p = $this->product(['stock' => 10]);
        $sale = $this->sell($manager, [['product_id' => $p->id, 'quantity' => 2]]);
        $item = $sale->items()->first();

        $this->returnItems($sale, [['sale_item_id' => $item->id, 'quantity' => 3]], [], $manager)->assertSessionHasErrors('lines');
        $this->assertSame(8, $p->fresh()->stock);
        $this->assertSame(0, $sale->returns()->count());

        // 1 returned, then 2 more is too many (only 1 left).
        $this->returnItems($sale, [['sale_item_id' => $item->id, 'quantity' => 1]], [], $manager)->assertSessionHasNoErrors();
        $this->returnItems($sale, [['sale_item_id' => $item->id, 'quantity' => 2]], [], $manager)->assertSessionHasErrors('lines');
        $this->assertSame(9, $p->fresh()->stock);
        $this->assertSame(1, $sale->returns()->count());
    }

    public function test_a_return_needs_at_least_one_item(): void
    {
        $manager = $this->manager();
        $p = $this->product();
        $sale = $this->sell($manager, [['product_id' => $p->id, 'quantity' => 2]]);
        $item = $sale->items()->first();

        $this->returnItems($sale, [['sale_item_id' => $item->id, 'quantity' => 0]], [], $manager)->assertSessionHasErrors('lines');
        $this->assertSame(0, $sale->returns()->count());
    }

    public function test_an_item_of_another_sale_cannot_be_returned(): void
    {
        $manager = $this->manager();
        $p = $this->product(['stock' => 10]);
        $saleA = $this->sell($manager, [['product_id' => $p->id, 'quantity' => 1]]);
        $saleB = $this->sell($manager, [['product_id' => $p->id, 'quantity' => 1]]);

        $this->returnItems($saleA, [['sale_item_id' => $saleB->items()->first()->id, 'quantity' => 1]], [], $manager)
            ->assertSessionHasErrors('lines');
        $this->assertSame(0, $saleA->returns()->count());
        $this->assertSame(0, $saleB->returns()->count());
    }

    public function test_a_cancelled_sale_cannot_be_returned(): void
    {
        $manager = $this->manager();
        $p = $this->product();
        $sale = $this->sell($manager, [['product_id' => $p->id, 'quantity' => 1]]);
        $item = $sale->items()->first();
        $this->cancel($sale, ['reason' => 'x'], $manager);

        $this->returnItems($sale, [['sale_item_id' => $item->id, 'quantity' => 1]], [], $manager)->assertSessionHasErrors('sale');
        $this->assertSame(0, $sale->returns()->count());
    }

    public function test_a_cashier_needs_a_manager_to_make_a_return(): void
    {
        $cashier = $this->cashier();
        $manager = $this->manager();
        $p = $this->product(['stock' => 10]);
        $sale = $this->sell($cashier, [['product_id' => $p->id, 'quantity' => 2]]);
        $item = $sale->items()->first();
        RateLimiter::clear('approval:'.$cashier->id);

        $this->returnItems($sale, [['sale_item_id' => $item->id, 'quantity' => 1]], [], $cashier)->assertSessionHasErrors('approver_email');
        $this->assertSame(0, $sale->returns()->count());
        $this->assertSame(8, $p->fresh()->stock);

        $this->returnItems($sale, [['sale_item_id' => $item->id, 'quantity' => 1]], [
            'approver_email' => $manager->email,
            'approver_password' => 'password',
        ], $cashier)->assertSessionHasNoErrors();

        $return = $sale->returns()->sole();
        $this->assertSame($cashier->id, $return->user_id);
        $this->assertSame($manager->id, $return->approved_by);
    }

    public function test_refund_by_credit_note_creates_a_usable_credit_note(): void
    {
        $manager = $this->manager();
        $p = $this->product(['price' => 1000, 'stock' => 10]);
        $sale = $this->sell($manager, [['product_id' => $p->id, 'quantity' => 2]]);
        $item = $sale->items()->first();

        $this->returnItems($sale, [['sale_item_id' => $item->id, 'quantity' => 1]], ['refund_method' => 'credit_note'], $manager)
            ->assertSessionHasNoErrors();

        $return = $sale->returns()->sole();
        $note = CreditNote::where('sale_return_id', $return->id)->sole();
        $this->assertMatchesRegularExpression('/^AV-\d{6}$/', $note->code);
        $this->assertSame(CreditNote::codeFor($note->id), $note->code);
        $this->assertEqualsWithDelta(1000.0, (float) $note->amount, 0.001);
        $this->assertEqualsWithDelta(1000.0, (float) $note->balance, 0.001);
        $this->assertSame('credit_note', $return->refund_method);
        $this->assertSame($note->code, session('return')['credit_note']['code']);
    }

    public function test_cash_refund_creates_no_credit_note(): void
    {
        $manager = $this->manager();
        $p = $this->product();
        $sale = $this->sell($manager, [['product_id' => $p->id, 'quantity' => 1]]);
        $item = $sale->items()->first();
        $before = CreditNote::count();

        $this->returnItems($sale, [['sale_item_id' => $item->id, 'quantity' => 1]], ['refund_method' => 'cash'], $manager)
            ->assertSessionHasNoErrors();

        $this->assertSame($before, CreditNote::count());
    }

    // ---------------------------------------------------------------- reports

    public function test_revenue_is_net_of_returns_and_ignores_cancelled_sales(): void
    {
        $manager = $this->manager();
        $revenue = function () use ($manager) {
            $captured = null;
            // A real closure (not fn): an arrow function would capture $captured by value.
            $this->actingAs($manager)->get('/rapports')->assertInertia(
                function ($page) use (&$captured) {
                    $page->where('kpis.revenueMonth', function ($v) use (&$captured) {
                        $captured = $v;

                        return true;
                    })->etc();
                },
            );
            $this->assertNotNull($captured, 'revenueMonth was not read from the page');

            return (float) $captured;
        };

        $base = $revenue();
        $p = $this->product(['price' => 1000, 'stock' => 20]);

        $sale = $this->sell($manager, [['product_id' => $p->id, 'quantity' => 3]], ['remise' => 300]); // total 2700
        $this->assertEqualsWithDelta($base + 2700, $revenue(), 0.01);

        $this->returnItems($sale, [['sale_item_id' => $sale->items()->first()->id, 'quantity' => 1]], [], $manager); // -900
        $this->assertEqualsWithDelta($base + 1800, $revenue(), 0.01);

        // A cancelled sale leaves the figures completely.
        $other = $this->sell($manager, [['product_id' => $p->id, 'quantity' => 2]]); // +2000
        $this->assertEqualsWithDelta($base + 3800, $revenue(), 0.01);
        $this->cancel($other, ['reason' => 'x'], $manager);
        $this->assertEqualsWithDelta($base + 1800, $revenue(), 0.01);
    }

    // ---------------------------------------------------------------- documents & pages

    public function test_cancelled_sale_stays_readable_and_is_stamped_on_the_ticket(): void
    {
        $manager = $this->manager();
        $p = $this->product();
        $sale = $this->sell($manager, [['product_id' => $p->id, 'quantity' => 1]]);
        $this->cancel($sale, ['reason' => 'Erreur de caisse'], $manager);

        $this->actingAs($manager)->get("/ventes/{$sale->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('sale.display_status', 'cancelled')
                ->where('sale.cancel_reason', 'Erreur de caisse')
                ->where('can.cancel', false)
                ->where('can.return', false));

        $this->actingAs($manager)->get("/ventes/{$sale->id}/ticket")->assertOk()->assertSee('ANNULÉ');
    }

    public function test_sale_page_exposes_remaining_quantities_and_permissions(): void
    {
        $cashier = $this->cashier();
        $p = $this->product(['stock' => 10]);
        $sale = $this->sell($cashier, [['product_id' => $p->id, 'quantity' => 3]]);
        $item = $sale->items()->first();
        $this->returnItems($sale, [['sale_item_id' => $item->id, 'quantity' => 1]], [], $this->manager());

        $this->actingAs($cashier)->get("/ventes/{$sale->id}")
            ->assertInertia(fn ($page) => $page
                ->where('items.0.returned', 1)
                ->where('items.0.remaining', 2)
                ->where('sale.display_status', 'partially_returned')
                ->where('can.needs_approval', true)
                ->where('can.cancel', false)
                ->where('can.return', true)
                ->has('returns', 1));
    }

    public function test_return_slip_and_credit_note_slip_render(): void
    {
        $manager = $this->manager();
        $p = $this->product(['price' => 1000, 'stock' => 10]);
        $sale = $this->sell($manager, [['product_id' => $p->id, 'quantity' => 2]]);
        $item = $sale->items()->first();
        $this->returnItems($sale, [['sale_item_id' => $item->id, 'quantity' => 1]], ['refund_method' => 'credit_note'], $manager);

        $return = $sale->returns()->sole();
        $note = CreditNote::where('sale_return_id', $return->id)->sole();

        $this->actingAs($manager)->get("/retours/{$return->id}/ticket")
            ->assertOk()
            ->assertSee('Bon de retour') // shown in capitals by CSS only
            ->assertSee($note->code);
    }

    public function test_guests_cannot_reach_returns_or_credit_notes(): void
    {
        $this->post('/ventes/1/annuler', ['reason' => 'x'])->assertRedirect('/login');
        $this->post('/ventes/1/retours', [])->assertRedirect('/login');
        $this->get('/avoirs')->assertRedirect('/login');
        $this->getJson('/avoirs/lookup?code=1')->assertUnauthorized();
    }
}
