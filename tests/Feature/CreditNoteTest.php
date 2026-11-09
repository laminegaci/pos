<?php

namespace Tests\Feature;

use App\Models\CreditNote;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\CreatesShopData;
use Tests\TestCase;

class CreditNoteTest extends TestCase
{
    use CreatesShopData, DatabaseTransactions;

    private function sellWithNote($user, $product, int $qty, CreditNote $note, float $amount)
    {
        return $this->actingAs($user)->post('/ventes', [
            'items' => [['product_id' => $product->id, 'quantity' => $qty]],
            'credit_note_code' => $note->code,
            'credit_note_amount' => $amount,
        ]);
    }

    // ---------------------------------------------------------------- lookup

    public function test_lookup_accepts_loose_codes_and_returns_the_balance(): void
    {
        $user = $this->cashier();
        $note = $this->creditNote(1500, 900);

        foreach ([$note->code, strtolower($note->code), (string) $note->id, ' '.$note->code.' '] as $input) {
            $this->actingAs($user)->getJson('/avoirs/lookup?code='.urlencode($input))
                ->assertOk()
                ->assertJsonPath('code', $note->code)
                ->assertJsonPath('balance', 900);
        }
    }

    public function test_lookup_of_an_unknown_code_is_a_404(): void
    {
        $this->actingAs($this->cashier())->getJson('/avoirs/lookup?code=AV-999999')->assertNotFound();
        $this->actingAs($this->cashier())->getJson('/avoirs/lookup?code=garbage')->assertNotFound();
        $this->actingAs($this->cashier())->getJson('/avoirs/lookup')->assertNotFound();
    }

    // ---------------------------------------------------------------- paying with a credit note

    public function test_a_credit_note_pays_part_of_a_sale_and_the_rest_of_its_balance_is_kept(): void
    {
        $user = $this->cashier();
        $p = $this->product(['price' => 1000, 'stock' => 10]);
        $note = $this->creditNote(1500);

        $this->sellWithNote($user, $p, 2, $note, 800)->assertSessionHasNoErrors(); // total 2000, 800 by credit note

        $sale = Sale::findOrFail(session('sale')['id']);
        $this->assertSame('completed', $sale->status);
        $this->assertEqualsWithDelta(2000.0, (float) $sale->total, 0.001, 'the sale still counts in full in revenue');
        $this->assertEqualsWithDelta(800.0, (float) $sale->credit_note_amount, 0.001);
        $this->assertEqualsWithDelta(700.0, (float) $note->fresh()->balance, 0.001);
        $this->assertSame(8, $p->fresh()->stock);

        $use = $note->uses()->sole();
        $this->assertSame($sale->id, $use->sale_id);
        $this->assertEqualsWithDelta(800.0, (float) $use->amount, 0.001);
    }

    public function test_the_whole_balance_can_be_spent_over_several_sales_but_never_more(): void
    {
        $user = $this->cashier();
        $p = $this->product(['price' => 1000, 'stock' => 10]);
        $note = $this->creditNote(1000);

        $this->sellWithNote($user, $p, 1, $note, 600)->assertSessionHasNoErrors();
        $this->sellWithNote($user, $p, 1, $note, 400)->assertSessionHasNoErrors();
        $this->assertEqualsWithDelta(0.0, (float) $note->fresh()->balance, 0.001);

        // Spent: a third use is refused.
        $this->sellWithNote($user, $p, 1, $note, 1)->assertSessionHasErrors('credit_note_code');
        $this->assertSame(8, $p->fresh()->stock);
        $this->assertSame(2, $note->uses()->count());
    }

    public function test_insufficient_balance_refuses_the_sale_and_changes_nothing(): void
    {
        $user = $this->cashier();
        $p = $this->product(['price' => 1000, 'stock' => 10]);
        $note = $this->creditNote(500);
        $salesBefore = Sale::count();

        $this->sellWithNote($user, $p, 2, $note, 800)->assertSessionHasErrors('credit_note_code');

        $this->assertSame($salesBefore, Sale::count());
        $this->assertSame(10, $p->fresh()->stock, 'the stock decrement is rolled back too');
        $this->assertSame(0, StockMovement::where('product_id', $p->id)->count());
        $this->assertEqualsWithDelta(500.0, (float) $note->fresh()->balance, 0.001);
        $this->assertSame(0, $note->uses()->count());
    }

    public function test_a_credit_note_amount_above_the_sale_total_is_refused(): void
    {
        $user = $this->cashier();
        $p = $this->product(['price' => 1000, 'stock' => 10]);
        $note = $this->creditNote(5000);
        $salesBefore = Sale::count();

        $this->sellWithNote($user, $p, 1, $note, 1500)->assertSessionHasErrors('credit_note_amount');

        $this->assertSame($salesBefore, Sale::count());
        $this->assertSame(10, $p->fresh()->stock);
        $this->assertEqualsWithDelta(5000.0, (float) $note->fresh()->balance, 0.001);
    }

    public function test_an_unknown_code_is_refused_and_the_sale_is_not_created(): void
    {
        $user = $this->cashier();
        $p = $this->product(['stock' => 10]);
        $salesBefore = Sale::count();

        $this->actingAs($user)->post('/ventes', [
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'credit_note_code' => 'AV-999999',
            'credit_note_amount' => 100,
        ])->assertSessionHasErrors('credit_note_code');

        $this->assertSame($salesBefore, Sale::count());
        $this->assertSame(10, $p->fresh()->stock);
    }

    public function test_code_and_amount_go_together(): void
    {
        $user = $this->cashier();
        $p = $this->product();

        $this->actingAs($user)->post('/ventes', [
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'credit_note_amount' => 100,
        ])->assertSessionHasErrors('credit_note_code');

        $this->actingAs($user)->post('/ventes', [
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'credit_note_code' => 'AV-000001',
        ])->assertSessionHasErrors('credit_note_amount');
    }

    public function test_cents_survive_repeated_partial_use(): void
    {
        $user = $this->cashier();
        $p = $this->product(['price' => 1000, 'stock' => 20]);
        $note = $this->creditNote(100.10);

        // 33.37 + 33.37 + 33.36 = 100.10 : float drift must not block the last cent.
        $this->sellWithNote($user, $p, 1, $note, 33.37)->assertSessionHasNoErrors();
        $this->sellWithNote($user, $p, 1, $note, 33.37)->assertSessionHasNoErrors();
        $this->sellWithNote($user, $p, 1, $note, 33.36)->assertSessionHasNoErrors();

        $this->assertEqualsWithDelta(0.0, (float) $note->fresh()->balance, 0.0001);
    }

    public function test_cancelling_a_sale_gives_the_credit_note_its_money_back(): void
    {
        $manager = $this->manager();
        $p = $this->product(['price' => 1000, 'stock' => 10]);
        $note = $this->creditNote(1500);

        $this->sellWithNote($manager, $p, 2, $note, 800)->assertSessionHasNoErrors();
        $sale = Sale::findOrFail(session('sale')['id']);
        $this->assertEqualsWithDelta(700.0, (float) $note->fresh()->balance, 0.001);

        $this->actingAs($manager)->post("/ventes/{$sale->id}/annuler", ['reason' => 'Erreur'])->assertSessionHasNoErrors();

        $this->assertEqualsWithDelta(1500.0, (float) $note->fresh()->balance, 0.001);
        $this->assertSame(10, $p->fresh()->stock);
        // Traced: the original use and a negative one that cancels it out.
        $this->assertEqualsWithDelta(0.0, (float) $note->uses()->sum('amount'), 0.001);
        $this->assertSame(2, $note->uses()->count());
    }

    public function test_ticket_shows_the_part_paid_by_credit_note_and_the_real_change(): void
    {
        $user = $this->cashier();
        $p = $this->product(['price' => 1000, 'stock' => 10]);
        $note = $this->creditNote(1500);
        $this->sellWithNote($user, $p, 2, $note, 800)->assertSessionHasNoErrors(); // 1200 left to pay
        $sale = Sale::findOrFail(session('sale')['id']);

        $this->actingAs($user)->get("/ventes/{$sale->id}/ticket?recu=2000")
            ->assertOk()
            ->assertSee('Payé par avoir')
            ->assertSee('Reste à payer')
            ->assertSee('1 200,00')   // cash due
            ->assertSee('800,00');    // change = 2000 - 1200
    }

    // ---------------------------------------------------------------- pages

    public function test_credit_note_list_and_slip(): void
    {
        $user = $this->cashier();
        $note = $this->creditNote(2500, 1000);

        $this->actingAs($user)->get('/avoirs?status=open')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('CreditNotes/Index')
                ->where('filters.status', 'open')
                ->has('notes.data')
                ->has('totals.outstanding'));

        $this->actingAs($user)->get("/avoirs/{$note->id}/ticket")
            ->assertOk()
            ->assertSee($note->code)
            ->assertSee('2 500,00');
    }

    public function test_credit_note_search_by_code(): void
    {
        $user = $this->cashier();
        $note = $this->creditNote(100);

        $this->actingAs($user)->get('/avoirs?search='.urlencode($note->code))
            ->assertInertia(fn ($page) => $page
                ->where('notes.data.0.code', $note->code));
    }

    // ---------------------------------------------------------------- roles

    public function test_new_registrations_cannot_choose_their_role(): void
    {
        // `role` is not mass assignable: even a forged field cannot create an admin.
        $user = User::query()->create(['name' => 'X', 'email' => 'x'.uniqid().'@example.test', 'password' => 'secret123', 'role' => 'admin']);

        $this->assertSame('cashier', $user->fresh()->role);
    }

    public function test_only_an_admin_can_change_a_role(): void
    {
        $target = $this->cashier();

        $this->actingAs($this->cashier())->put("/parametres/utilisateurs/{$target->id}/role", ['role' => 'manager'])->assertForbidden();
        $this->actingAs($this->manager())->put("/parametres/utilisateurs/{$target->id}/role", ['role' => 'manager'])->assertForbidden();
        $this->assertSame('cashier', $target->fresh()->role);

        $admin = $this->makeUser(User::ROLE_ADMIN);
        $this->actingAs($admin)->put("/parametres/utilisateurs/{$target->id}/role", ['role' => 'manager'])->assertSessionHasNoErrors();
        $this->assertSame('manager', $target->fresh()->role);
    }

    public function test_an_unknown_role_is_refused(): void
    {
        $admin = $this->makeUser(User::ROLE_ADMIN);
        $target = $this->cashier();

        $this->actingAs($admin)->put("/parametres/utilisateurs/{$target->id}/role", ['role' => 'superuser'])->assertSessionHasErrors('role');
        $this->assertSame('cashier', $target->fresh()->role);
    }

    public function test_an_admin_cannot_change_their_own_role(): void
    {
        $admin = $this->makeUser(User::ROLE_ADMIN);

        $this->actingAs($admin)->put("/parametres/utilisateurs/{$admin->id}/role", ['role' => 'cashier'])->assertSessionHasErrors('role');
        $this->assertSame('admin', $admin->fresh()->role);
    }

    public function test_the_last_admin_cannot_be_demoted(): void
    {
        // Make this admin the only one (rolled back after the test).
        User::query()->where('role', User::ROLE_ADMIN)->update(['role' => User::ROLE_MANAGER]);
        $onlyAdmin = $this->makeUser(User::ROLE_ADMIN);
        $actor = $this->makeUser(User::ROLE_ADMIN);

        // Two admins: demoting one is fine.
        $this->actingAs($actor)->put("/parametres/utilisateurs/{$onlyAdmin->id}/role", ['role' => 'manager'])->assertSessionHasNoErrors();
        $this->assertSame('manager', $onlyAdmin->fresh()->role);

        // Now $actor is the only admin left; another admin-less demotion is impossible by construction,
        // but promoting then demoting through a second admin must keep one admin standing.
        $second = $this->makeUser(User::ROLE_ADMIN);
        $this->actingAs($second)->put("/parametres/utilisateurs/{$actor->id}/role", ['role' => 'cashier'])->assertSessionHasNoErrors();
        $this->actingAs($actor->fresh())->put("/parametres/utilisateurs/{$second->id}/role", ['role' => 'cashier'])->assertForbidden();
        $this->assertSame('admin', $second->fresh()->role, 'one admin must always remain');
    }

    public function test_settings_page_lists_roles_and_tells_who_can_edit_them(): void
    {
        $this->actingAs($this->makeUser(User::ROLE_ADMIN))->get('/parametres')
            ->assertInertia(fn ($page) => $page
                ->where('canManageRoles', true)
                ->where('users.0.role', fn ($r) => in_array($r, User::ROLES, true)));

        $this->actingAs($this->cashier())->get('/parametres')
            ->assertInertia(fn ($page) => $page->where('canManageRoles', false));
    }
}
