<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ClientPayment;
use App\Services\ClientAccountService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ClientPaymentController extends Controller
{
    /** A cashier can take a payment at the counter. */
    public function store(Request $request, Client $client, ClientAccountService $accounts): RedirectResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0'],
            'method' => ['required', Rule::in(ClientPayment::METHODS)],
            'reference' => ['nullable', 'string', 'max:60'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $accounts->recordPayment($client, (float) $data['amount'], $data['method'], $request->user(), $data['reference'] ?? null, $data['note'] ?? null);

        return back()->with('success', __('clients.payment_recorded'));
    }

    public function destroy(Request $request, ClientPayment $payment, ClientAccountService $accounts): RedirectResponse
    {
        abort_unless($request->user()->canManageStock(), 403);
        $accounts->deletePayment($payment);

        return back()->with('success', __('clients.payment_deleted'));
    }
}
