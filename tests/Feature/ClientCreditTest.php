<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\Settings;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\CreatesShopData;
use Tests\TestCase;

class ClientCreditTest extends TestCase
{
    use CreatesShopData;
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Settings::current()->update(['credit_enabled' => true, 'cash_enabled' => true]);
    }

    private function client(array $o = []): Client
    {
        return Client::query()->create(array_merge(['name' => 'Client '.uniqid(), 'type' => 'professionnel'], $o));
    }

    /** One 1000-DA product sold on credit through the real endpoint. */
    private function creditSale(Client $c, int $qty = 1, array $extra = [], $by = null): Sale
    {
        $by ??= $this->manager();
        $p = $this->product(['price' => 1000, 'stock' => 100]);

        return $this->sell($by, [['product_id' => $p->id, 'quantity' => $qty]], array_merge([
            'client_id' => $c->id,
            'payment_method' => 'credit',
        ], $extra));
    }

    public function test_credit_sale_with_deposit_puts_the_rest_on_the_account(): void
    {
        $c = $this->client(['payment_terms_days' => 15]);
        $sale = $this->creditSale($c, 5, ['deposit_amount' => 2000, 'deposit_method' => 'cash']);

        $this->assertEquals(2000, $sale->deposit_amount);
        $this->assertEquals(3000, $sale->credit_amount);
        $this->assertSame(today()->addDays(15)->toDateString(), $sale->due_at->toDateString());
        $this->assertEquals(3000, $c->balance());
    }

    public function test_deposit_covering_everything_is_an_ordinary_sale(): void
    {
        $c = $this->client();
        $sale = $this->creditSale($c, 2, ['deposit_amount' => 5000, 'deposit_method' => 'cash']);

        $this->assertSame('cash', $sale->payment_method);
        $this->assertEquals(0, $sale->credit_amount);
        $this->assertEquals(0, $c->balance());
    }

    public function test_limit_requires_manager_approval(): void
    {
        $c = $this->client(['credit_limit' => 1500]);
        $cashier = $this->cashier();
        $p = $this->product(['price' => 1000, 'stock' => 100]);
        $payload = ['client_id' => $c->id, 'payment_method' => 'credit', 'items' => [['product_id' => $p->id, 'quantity' => 2]]];

        $before = Sale::query()->count();
        $this->actingAs($cashier)->post('/ventes', $payload)->assertSessionHasErrors('credit_limit');
        $this->assertSame($before, Sale::query()->count());

        // Wrong credentials: refused.
        $this->actingAs($cashier)->post('/ventes', $payload + ['approver_email' => 'nobody@example.com', 'approver_password' => 'x'])
            ->assertSessionHasErrors('approver_password');

        // A real manager's credentials: accepted and recorded.
        $manager = $this->manager();
        $manager->forceFill(['password' => bcrypt('secret-pass')])->save();
        $this->actingAs($cashier)->post('/ventes', $payload + ['approver_email' => $manager->email, 'approver_password' => 'secret-pass'])
            ->assertSessionHasNoErrors();
        $this->assertSame($manager->id, Sale::query()->latest('id')->first()->credit_approved_by);
        $this->assertEquals(2000, $c->balance());
    }

    public function test_no_limit_never_blocks_and_within_limit_passes(): void
    {
        $unlimited = $this->client(['credit_limit' => null]);
        $this->creditSale($unlimited, 50, [], $this->cashier());
        $this->assertEquals(50000, $unlimited->balance());

        $limited = $this->client(['credit_limit' => 3000]);
        $this->creditSale($limited, 3, [], $this->cashier());
        $this->assertEquals(3000, $limited->balance());
    }

    public function test_payment_settles_the_oldest_tickets_first(): void
    {
        $m = $this->manager();
        $c = $this->client();
        $s1 = $this->creditSale($c, 1);
        $s2 = $this->creditSale($c, 2);
        $s3 = $this->creditSale($c, 1);
        $this->backdate($s1, 3);
        $this->backdate($s2, 2);

        // 1000 (s1) + 1000 of the 2000 of s2.
        $this->actingAs($m)->post("/clients/{$c->id}/reglements", ['amount' => 2000, 'method' => 'cash'])->assertSessionHasNoErrors();

        $this->assertSame('paid', $s1->fresh()->creditStatus());
        $this->assertSame('partial', $s2->fresh()->creditStatus());
        $this->assertSame('unpaid', $s3->fresh()->creditStatus());
        $this->assertEquals(2000, $c->balance());
    }

    public function test_overpayment_is_refused_and_deleting_a_payment_restores_the_debt(): void
    {
        $m = $this->manager();
        $c = $this->client();
        $sale = $this->creditSale($c, 2);

        $this->actingAs($m)->post("/clients/{$c->id}/reglements", ['amount' => 2500, 'method' => 'cash'])->assertSessionHasErrors('amount');
        $this->assertEquals(2000, $c->balance());

        $this->actingAs($m)->post("/clients/{$c->id}/reglements", ['amount' => 2000, 'method' => 'transfer'])->assertSessionHasNoErrors();
        $this->assertEquals(0, $c->balance());
        $this->assertSame('paid', $sale->fresh()->creditStatus());

        $payment = $c->payments()->sole();
        $this->actingAs($m)->delete("/reglements-clients/{$payment->id}")->assertSessionHasNoErrors();
        $this->assertEquals(2000, $c->balance());
        $this->assertSame('unpaid', $sale->fresh()->creditStatus());
    }

    public function test_cashier_can_take_a_payment_but_not_delete_it(): void
    {
        $c = $this->client();
        $this->creditSale($c, 1);
        $cashier = $this->cashier();

        $this->actingAs($cashier)->post("/clients/{$c->id}/reglements", ['amount' => 500, 'method' => 'cash'])->assertSessionHasNoErrors();
        $this->actingAs($cashier)->delete('/reglements-clients/'.$c->payments()->sole()->id)->assertForbidden();
    }

    public function test_overdue_tickets_show_on_the_reminder_list(): void
    {
        $m = $this->manager();
        $c = $this->client();
        $sale = $this->creditSale($c, 1);
        Sale::query()->whereKey($sale->id)->update(['due_at' => today()->subDays(10)]);

        $this->assertSame('overdue', $sale->fresh()->creditStatus());
        $this->assertEquals(1000, $c->overdueAmount());

        $this->actingAs($m)->get('/clients/relances')->assertOk()->assertInertia(
            fn ($page) => $page->component('Clients/Overdue')->where('rows.0.id', $c->id)->where('rows.0.days_late', 10)
        );
    }

    public function test_cancel_rules_with_payments(): void
    {
        $m = $this->manager();
        $c = $this->client();
        $unpaid = $this->creditSale($c, 1);

        // An unpaid credit ticket can be cancelled: the debt disappears.
        $this->actingAs($m)->post("/ventes/{$unpaid->id}/annuler", ['reason' => 'erreur'])->assertSessionHasNoErrors();
        $this->assertEquals(0, $c->balance());

        $paid = $this->creditSale($c, 1);
        $this->actingAs($m)->post("/clients/{$c->id}/reglements", ['amount' => 400, 'method' => 'cash'])->assertSessionHasNoErrors();
        $this->actingAs($m)->post("/ventes/{$paid->id}/annuler", ['reason' => 'erreur'])->assertSessionHasErrors('sale');
        $this->assertEquals(600, $c->balance());
    }

    public function test_return_on_account_reduces_the_debt_but_not_beyond(): void
    {
        $m = $this->manager();
        $c = $this->client();
        $sale = $this->creditSale($c, 2, ['deposit_amount' => 1000, 'deposit_method' => 'cash']); // 1000 on account
        $items = $this->actingAs($m)->get("/ventes/{$sale->id}")->viewData('page')['props']['items'];
        $itemId = $items[0]['id'];

        // Returning one article (1000) on the account clears the debt.
        $this->actingAs($m)->post("/ventes/{$sale->id}/retours", [
            'lines' => [['sale_item_id' => $itemId, 'quantity' => 1]],
            'reason' => 'retour',
            'refund_method' => SaleReturn::REFUND_ACCOUNT,
        ])->assertSessionHasNoErrors();
        $this->assertEquals(0, $c->balance());

        // The rest (1000, already paid by the deposit) cannot go on the account.
        $this->actingAs($m)->post("/ventes/{$sale->id}/retours", [
            'lines' => [['sale_item_id' => $itemId, 'quantity' => 1]],
            'reason' => 'retour',
            'refund_method' => SaleReturn::REFUND_ACCOUNT,
        ])->assertSessionHasErrors('refund_method');
    }

    public function test_client_pages_and_statement_render(): void
    {
        $m = $this->manager();
        $c = $this->client();
        $this->creditSale($c, 1);
        $this->actingAs($m)->post("/clients/{$c->id}/reglements", ['amount' => 300, 'method' => 'cash']);

        $this->actingAs($m)->get('/clients')->assertOk()->assertInertia(fn ($p) => $p->component('Clients/Index'));
        $this->actingAs($m)->get("/clients/{$c->id}")->assertOk()->assertInertia(
            fn ($p) => $p->component('Clients/Show')->where('client.balance', 700)
        );
        $this->actingAs($m)->get("/clients/{$c->id}/releve?stream=1")->assertOk()->assertHeader('content-type', 'application/pdf');
    }
}
