<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\CreditNote;
use App\Models\CreditNoteUse;
use App\Models\Sale;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreditNoteService
{
    public function find(string $input): ?CreditNote
    {
        $code = CreditNote::normalizeCode($input);

        return $code ? CreditNote::query()->where('code', $code)->first() : null;
    }

    /**
     * Pays part of a sale with a credit note. The balance check and the debit are ONE atomic
     * UPDATE, so the same credit note cannot be spent twice from two tills.
     * Must run inside the sale's transaction: any failure rolls the whole sale back.
     *
     * @throws ValidationException
     */
    public function redeem(string $code, float $amount, Sale $sale): CreditNote
    {
        $amount = round($amount, 2);
        $note = $this->find($code);

        if (! $note) {
            throw ValidationException::withMessages(['credit_note_code' => __('returns.credit_not_found')]);
        }

        // ROUND(?, 2) forces a numeric value: PDO sends floats as strings, and SQLite always
        // sorts a number *before* a string, so "balance >= '800'" would be false for any balance.
        $affected = DB::update(
            'UPDATE credit_notes SET balance = ROUND(balance - ROUND(?, 2), 2), updated_at = ? WHERE id = ? AND ROUND(balance, 2) >= ROUND(?, 2)',
            [$amount, now(), $note->id, $amount],
        );

        if ($affected === 0) {
            $balance = (float) CreditNote::query()->whereKey($note->id)->value('balance');
            throw ValidationException::withMessages([
                'credit_note_code' => __('returns.credit_insufficient', ['balance' => number_format($balance, 2, ',', ' ')]),
            ]);
        }

        CreditNoteUse::query()->create(['credit_note_id' => $note->id, 'sale_id' => $sale->id, 'amount' => $amount]);

        return $note->refresh();
    }

    /** Gives back a previously redeemed amount (cancelled sale). Traced with a negative "use". */
    public function restore(CreditNote $note, float $amount, Sale $sale): void
    {
        $amount = round($amount, 2);

        DB::update(
            'UPDATE credit_notes SET balance = ROUND(balance + ROUND(?, 2), 2), updated_at = ? WHERE id = ?',
            [$amount, now(), $note->id],
        );

        CreditNoteUse::query()->create(['credit_note_id' => $note->id, 'sale_id' => $sale->id, 'amount' => -$amount]);
    }
}
