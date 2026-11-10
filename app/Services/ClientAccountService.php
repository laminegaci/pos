<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Client;
use App\Models\ClientPayment;
use App\Models\ClientPaymentAllocation;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Customer account: credit tickets are debts, payments settle the oldest ticket first (FIFO).
 * The balance is always computed from the tickets, never stored.
 */
class ClientAccountService
{
    /** True when putting $newCredit on the account stays within the limit (no limit = always true). */
    public function withinLimit(Client $client, float $newCredit): bool
    {
        if ($client->credit_limit === null) {
            return true;
        }

        return round($client->balance() + $newCredit, 2) <= round((float) $client->credit_limit, 2) + 0.005;
    }

    /**
     * @throws ValidationException when the amount is not positive or exceeds the balance
     */
    public function recordPayment(Client $client, float $amount, string $method, ?User $user, ?string $reference = null, ?string $note = null): ClientPayment
    {
        return DB::transaction(function () use ($client, $amount, $method, $user, $reference, $note) {
            // Serialise payments of one customer so two tills cannot settle the same ticket twice.
            $locked = Client::query()->whereKey($client->id)->lockForUpdate()->firstOrFail();
            $amount = round($amount, 2);
            $balance = $locked->balance();

            if ($amount <= 0 || $amount > $balance + 0.005) {
                throw ValidationException::withMessages(['amount' => __('clients.overpayment', ['balance' => $balance])]);
            }

            $payment = ClientPayment::query()->create([
                'client_id' => $locked->id,
                'amount' => $amount,
                'method' => $method,
                'paid_at' => now(),
                'reference' => $reference,
                'user_id' => $user?->id,
                'note' => $note,
            ]);

            $left = $amount;
            $sales = $locked->creditSales()
                ->whereRaw(Client::OUTSTANDING_SQL.' > 0')
                ->orderBy('created_at')->orderBy('id')
                ->lockForUpdate()
                ->get();

            foreach ($sales as $sale) {
                if ($left <= 0.004) {
                    break;
                }
                $part = round(min($left, $sale->outstanding()), 2);
                if ($part <= 0) {
                    continue;
                }
                ClientPaymentAllocation::query()->create([
                    'client_payment_id' => $payment->id,
                    'sale_id' => $sale->id,
                    'amount' => $part,
                ]);
                Sale::query()->whereKey($sale->id)->increment('credit_paid', $part);
                $left = round($left - $part, 2);
            }

            return $payment;
        });
    }

    public function deletePayment(ClientPayment $payment): void
    {
        DB::transaction(function () use ($payment) {
            $payment = ClientPayment::query()->whereKey($payment->id)->lockForUpdate()->firstOrFail();
            foreach ($payment->allocations as $allocation) {
                Sale::query()->whereKey($allocation->sale_id)->decrement('credit_paid', (float) $allocation->amount);
            }
            $payment->delete(); // allocations cascade
        });
    }

    /**
     * Chronological ledger with a running balance.
     *
     * @return array{opening: float, rows: array<int, array<string, mixed>>, closing: float}
     */
    public function statement(Client $client, ?CarbonInterface $from = null, ?CarbonInterface $to = null): array
    {
        $entries = [];

        $sales = $client->creditSales()->get();
        foreach ($sales as $sale) {
            $entries[] = ['date' => $sale->created_at, 'label' => '#'.$sale->id, 'type' => 'sale', 'debit' => (float) $sale->credit_amount, 'credit' => 0.0, 'due_at' => $sale->due_at?->toDateString()];
        }

        foreach ($client->payments()->get() as $p) {
            $entries[] = ['date' => $p->paid_at, 'label' => $p->method.($p->reference ? ' '.$p->reference : ''), 'type' => 'payment', 'debit' => 0.0, 'credit' => (float) $p->amount, 'due_at' => null];
        }

        $returns = SaleReturn::query()
            ->whereIn('sale_id', $sales->pluck('id'))
            ->where('refund_method', SaleReturn::REFUND_ACCOUNT)
            ->get();
        foreach ($returns as $r) {
            $entries[] = ['date' => $r->created_at, 'label' => '#'.$r->sale_id, 'type' => 'return', 'debit' => 0.0, 'credit' => (float) $r->amount, 'due_at' => null];
        }

        usort($entries, fn ($a, $b) => $a['date'] <=> $b['date']);

        $opening = 0.0;
        $running = 0.0;
        $rows = [];
        foreach ($entries as $e) {
            $running = round($running + $e['debit'] - $e['credit'], 2);
            if ($from && $e['date']->lt($from->copy()->startOfDay())) {
                $opening = $running;

                continue;
            }
            if ($to && $e['date']->gt($to->copy()->endOfDay())) {
                continue;
            }
            $rows[] = [...$e, 'date' => $e['date']->toIso8601String(), 'balance' => $running];
        }

        return ['opening' => $opening, 'rows' => $rows, 'closing' => $rows ? end($rows)['balance'] : $opening];
    }
}
