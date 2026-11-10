<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SupplierPaymentService
{
    /** @throws ValidationException when the amount exceeds what is owed */
    public function record(Supplier $supplier, float $amount, string $method, ?User $user, ?int $receptionId = null, ?string $reference = null, ?string $note = null): SupplierPayment
    {
        return DB::transaction(function () use ($supplier, $amount, $method, $user, $receptionId, $reference, $note) {
            // Serialise payments of one supplier so two tills cannot both pay the last dinar.
            $locked = Supplier::query()->whereKey($supplier->id)->lockForUpdate()->firstOrFail();
            $balance = $locked->balance();

            if ($amount <= 0 || round($amount, 2) > $balance + 0.005) {
                throw ValidationException::withMessages(['amount' => __('purchases.overpayment', ['balance' => $balance])]);
            }

            return SupplierPayment::query()->create([
                'supplier_id' => $locked->id,
                'reception_id' => $receptionId,
                'amount' => round($amount, 2),
                'method' => $method,
                'paid_at' => now(),
                'reference' => $reference,
                'user_id' => $user?->id,
                'note' => $note,
            ]);
        });
    }

    public function delete(SupplierPayment $payment): void
    {
        $payment->delete();
    }
}
