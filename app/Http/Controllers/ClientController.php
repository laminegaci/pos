<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exports\ClientExport;
use App\Models\Client;
use App\Models\ClientPayment;
use App\Models\Sale;
use App\Models\Settings;
use App\Services\ClientAccountService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class ClientController extends Controller
{
    public function index(Request $request): Response
    {
        $clients = Client::query()->withBalance()
            ->withCount('sales')
            ->withSum('sales', 'total')
            ->orderBy('name')
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'email' => $c->email,
                'phone' => $c->phone,
                'address' => $c->address,
                'city' => $c->city,
                'type' => $c->type,
                'notes' => $c->notes,
                'active' => $c->active,
                'credit_limit' => $c->credit_limit === null ? null : (float) $c->credit_limit,
                'payment_terms_days' => (int) $c->payment_terms_days,
                'balance' => round((float) $c->credit_balance, 2),
                'overdue' => round((float) $c->overdue_amount, 2),
                'sales_count' => $c->sales_count ?? 0,
                'total_spent' => (float) ($c->sales_sum_total ?? 0),
                'last_purchase' => optional($c->sales()->latest()->first())->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Clients/Index', [
            'clients' => $clients,
            'totalReceivable' => round((float) $clients->where('balance', '>', 0)->sum('balance'), 2),
            'canManage' => $request->user()->canManageStock(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Client::create($this->validated($request));

        return redirect()->route('clients.index')->with('success', 'Client créé.');
    }

    public function update(Request $request, Client $client): RedirectResponse
    {
        $client->update($this->validated($request));

        return redirect()->route('clients.index')->with('success', 'Client mis à jour.');
    }

    public function destroy(Client $client): RedirectResponse
    {
        if ($client->balance() > 0 || $client->payments()->exists()) {
            return back()->withErrors(['client' => 'Ce client a un compte en cours : il ne peut pas être supprimé.']);
        }

        $client->delete();

        return redirect()->route('clients.index')->with('success', 'Client supprimé.');
    }

    public function show(Request $request, Client $client): Response
    {
        $creditSales = $client->creditSales()->orderBy('created_at')->orderBy('id')->get()->map(fn (Sale $s) => [
            'id' => $s->id,
            'created_at' => $s->created_at?->toIso8601String(),
            'due_at' => $s->due_at?->toDateString(),
            'total' => (float) $s->total,
            'credit_amount' => (float) $s->credit_amount,
            'outstanding' => $s->outstanding(),
            'status' => $s->creditStatus(),
        ])->reverse()->values();

        $payments = $client->payments()->with(['user:id,name', 'allocations'])->latest('id')->get()->map(fn (ClientPayment $p) => [
            'id' => $p->id,
            'amount' => (float) $p->amount,
            'method' => $p->method,
            'reference' => $p->reference,
            'paid_at' => $p->paid_at?->toIso8601String(),
            'user' => $p->user?->name,
            'sales' => $p->allocations->pluck('sale_id')->all(),
        ]);

        $history = $client->sales()->latest('id')->limit(50)->get(['id', 'total', 'status', 'payment_method', 'created_at'])->map(fn (Sale $s) => [
            'id' => $s->id,
            'total' => (float) $s->total,
            'status' => $s->status,
            'payment_method' => $s->payment_method,
            'created_at' => $s->created_at?->toIso8601String(),
        ]);

        $balance = $client->balance();

        return Inertia::render('Clients/Show', [
            'client' => [
                ...$client->only(['id', 'name', 'email', 'phone', 'address', 'city', 'type', 'notes', 'active', 'payment_terms_days']),
                'credit_limit' => $client->credit_limit === null ? null : (float) $client->credit_limit,
                'balance' => $balance,
                'available' => $client->credit_limit === null ? null : round((float) $client->credit_limit - $balance, 2),
                'overdue' => $client->overdueAmount(),
            ],
            'creditSales' => $creditSales,
            'payments' => $payments,
            'history' => $history,
            'methods' => ClientPayment::METHODS,
            'canManage' => $request->user()->canManageStock(),
        ]);
    }

    /** Customers with at least one ticket past its due date (reminder list). */
    public function overdue(): Response
    {
        $rows = Client::query()->withBalance()->get()
            ->filter(fn ($c) => (float) $c->overdue_amount > 0)
            ->map(function ($c) {
                $oldest = $c->oldest_due_at ? Carbon::parse($c->oldest_due_at) : null;

                return [
                    'id' => $c->id,
                    'name' => $c->name,
                    'phone' => $c->phone,
                    'balance' => round((float) $c->credit_balance, 2),
                    'overdue' => round((float) $c->overdue_amount, 2),
                    'oldest_due_at' => $oldest?->toDateString(),
                    'days_late' => $oldest ? (int) $oldest->diffInDays(today(), false) : 0,
                ];
            })
            ->sortByDesc('days_late')->values();

        return Inertia::render('Clients/Overdue', [
            'rows' => $rows,
            'totalOverdue' => round((float) $rows->sum('overdue'), 2),
        ]);
    }

    /** A4 statement (relevé de compte): opening balance, tickets, payments, running balance. */
    public function statement(Request $request, Client $client, ClientAccountService $accounts): HttpResponse
    {
        $from = $request->filled('from') ? Carbon::parse($request->query('from')) : null;
        $to = $request->filled('to') ? Carbon::parse($request->query('to')) : null;

        $pdf = Pdf::loadView('statements.client', [
            'client' => $client,
            'statement' => $accounts->statement($client, $from, $to),
            'from' => $from,
            'to' => $to,
            'overdue' => $client->overdueAmount(),
            'settings' => Settings::current(),
        ])->setPaper('a4');

        $filename = "releve-client-{$client->id}.pdf";

        return $request->boolean('stream') ? $pdf->stream($filename) : $pdf->download($filename);
    }

    public function export()
    {
        return Excel::download(new ClientExport, 'clients-'.now()->format('Y-m-d').'.xlsx');
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'type' => 'required|in:particulier,professionnel',
            'notes' => 'nullable|string',
            'active' => 'boolean',
            'credit_limit' => 'nullable|numeric|min:0',
            'payment_terms_days' => 'nullable|integer|min:0|max:365',
        ]);

        // Only a manager changes the credit conditions; others keep what is stored.
        if (! $request->user()->canManageStock()) {
            unset($data['credit_limit'], $data['payment_terms_days']);
        }
        if (array_key_exists('payment_terms_days', $data) && $data['payment_terms_days'] === null) {
            $data['payment_terms_days'] = 30;
        }

        return $data;
    }
}
