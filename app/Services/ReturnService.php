<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\CreditNote;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\SaleReturnItem;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Cancelling a ticket and returning items, keeping revenue and stock right:
 *  - cancel: the whole sale leaves the figures (status = cancelled) and goes back to stock;
 *  - return: the sale stays, the refund is recorded apart (net revenue = sales - returns).
 * Every method runs in one transaction; any error rolls everything back.
 */
class ReturnService
{
    public function __construct(
        private readonly StockService $stock,
        private readonly CreditNoteService $creditNotes,
    ) {}

    /**
     * @throws ValidationException
     */
    public function cancel(Sale $sale, string $reason, User $user, int $approverId): Sale
    {
        return DB::transaction(function () use ($sale, $reason, $user, $approverId) {
            $sale = Sale::query()->with('items')->findOrFail($sale->id);

            if ($sale->isCancelled()) {
                throw ValidationException::withMessages(['sale' => __('returns.already_cancelled')]);
            }
            if (! $sale->created_at?->isToday()) {
                throw ValidationException::withMessages(['sale' => __('returns.cancel_not_today')]);
            }
            if ($sale->returns()->exists()) {
                throw ValidationException::withMessages(['sale' => __('returns.cancel_has_returns')]);
            }
            // Customer payments were already allocated to this ticket: undo them first.
            if ((float) $sale->credit_paid > 0) {
                throw ValidationException::withMessages(['sale' => __('returns.cancel_has_payments')]);
            }

            // Atomic guard: only one request can flip the status.
            $flipped = Sale::query()
                ->whereKey($sale->id)
                ->where('status', Sale::STATUS_COMPLETED)
                ->update([
                    'status' => Sale::STATUS_CANCELLED,
                    'cancelled_at' => now(),
                    'cancelled_by' => $user->id,
                    'cancel_approved_by' => $approverId,
                    'cancel_reason' => $reason,
                ]);

            if ($flipped === 0) {
                throw ValidationException::withMessages(['sale' => __('returns.already_cancelled')]);
            }

            $note = __('returns.stock_note_cancel', ['id' => $sale->id]);
            foreach ($sale->items as $item) {
                $product = $item->product_id ? Product::query()->find($item->product_id) : null;
                if ($product) {
                    // Unlimited products return null here: nothing to put back.
                    $this->stock->adjust($product, (int) $item->quantity, $user->id, $note, StockMovement::TYPE_CANCEL, $sale->id);
                }
            }

            // Credit notes spent on this ticket get their money back.
            foreach ($sale->creditNoteUses()->where('amount', '>', 0)->with('creditNote')->get() as $use) {
                $this->creditNotes->restore($use->creditNote, (float) $use->amount, $sale);
            }

            return $sale->refresh();
        });
    }

    /**
     * @param  array<int, array{sale_item_id: int, quantity: int, restock?: bool}>  $lines
     *
     * @throws ValidationException
     */
    public function makeReturn(Sale $sale, array $lines, string $reason, string $refundMethod, User $user, int $approverId): SaleReturn
    {
        return DB::transaction(function () use ($sale, $lines, $reason, $refundMethod, $user, $approverId) {
            $sale = Sale::query()->with('items')->findOrFail($sale->id);

            if ($sale->isCancelled()) {
                throw ValidationException::withMessages(['sale' => __('returns.return_cancelled')]);
            }

            // Merge duplicates and drop empty lines.
            $wanted = [];
            foreach ($lines as $line) {
                $qty = (int) ($line['quantity'] ?? 0);
                if ($qty <= 0) {
                    continue;
                }
                $id = (int) $line['sale_item_id'];
                $wanted[$id] = [
                    'quantity' => ($wanted[$id]['quantity'] ?? 0) + $qty,
                    'restock' => (bool) ($line['restock'] ?? true),
                ];
            }
            if (! $wanted) {
                throw ValidationException::withMessages(['lines' => __('returns.return_nothing')]);
            }

            $items = $sale->items->keyBy('id');
            $already = $this->returnedQuantities($sale);
            $gross = 0.0;

            foreach ($wanted as $itemId => $w) {
                /** @var SaleItem|null $item */
                $item = $items[$itemId] ?? null;
                if (! $item) {
                    throw ValidationException::withMessages(['lines' => __('returns.return_unknown_item')]);
                }
                $remaining = (int) $item->quantity - ($already[$itemId] ?? 0);
                if ($w['quantity'] > $remaining) {
                    throw ValidationException::withMessages([
                        'lines' => __('returns.return_exceeds', ['name' => $item->product?->name ?? $item->product_name ?? '#'.$item->id, 'remaining' => $remaining]),
                    ]);
                }
                $gross += (float) $item->unit_price * $w['quantity'];
            }

            // Refund at the price the customer really paid: the sale's discount is spread over its lines.
            $subtotal = (float) $sale->subtotal;
            $ratio = $subtotal > 0 ? (float) $sale->total / $subtotal : 1.0;
            $amount = round($gross * $ratio, 2);

            // The return that empties the ticket refunds the exact remainder (no lost cents).
            $afterReturn = $already;
            foreach ($wanted as $itemId => $w) {
                $afterReturn[$itemId] = ($afterReturn[$itemId] ?? 0) + $w['quantity'];
            }
            $emptied = $items->every(fn (SaleItem $i) => ($afterReturn[$i->id] ?? 0) >= (int) $i->quantity);
            if ($emptied) {
                $amount = round((float) $sale->total - $sale->refundedAmount(), 2);
            }
            $amount = max(0.0, $amount);

            // Refund on the customer account: only what is still owed can be cancelled that way.
            if ($refundMethod === SaleReturn::REFUND_ACCOUNT) {
                if ($amount > $sale->outstanding() + 0.005) {
                    throw ValidationException::withMessages(['refund_method' => __('returns.account_exceeds', ['max' => $sale->outstanding()])]);
                }
                Sale::query()->whereKey($sale->id)->increment('credit_returned', $amount);
            }

            $return = SaleReturn::query()->create([
                'sale_id' => $sale->id,
                'user_id' => $user->id,
                'approved_by' => $approverId,
                'reason' => $reason,
                'refund_method' => $refundMethod,
                'amount' => $amount,
            ]);

            $note = __('returns.stock_note_return', ['id' => $sale->id]);
            foreach ($wanted as $itemId => $w) {
                $item = $items[$itemId];
                SaleReturnItem::query()->create([
                    'sale_return_id' => $return->id,
                    'sale_item_id' => $item->id,
                    'product_id' => $item->product_id,
                    'quantity' => $w['quantity'],
                    'unit_price' => $item->unit_price,
                    'line_total' => round((float) $item->unit_price * $w['quantity'], 2),
                    'restock' => $w['restock'],
                ]);

                if ($w['restock'] && $item->product_id) {
                    $product = Product::query()->find($item->product_id);
                    if ($product) {
                        $this->stock->adjust($product, $w['quantity'], $user->id, $note, StockMovement::TYPE_RETURN, $sale->id);
                    }
                }
            }

            // Concurrent returns of the same article: re-check the total now that ours is written.
            foreach ($wanted as $itemId => $w) {
                $total = (int) SaleReturnItem::query()->where('sale_item_id', $itemId)->sum('quantity');
                if ($total > (int) $items[$itemId]->quantity) {
                    throw ValidationException::withMessages(['lines' => __('returns.return_unknown_item')]);
                }
            }

            if ($refundMethod === SaleReturn::REFUND_CREDIT_NOTE && $amount > 0) {
                $creditNote = CreditNote::query()->create([
                    'code' => 'TMP-'.uniqid(),
                    'client_id' => $sale->client_id,
                    'sale_return_id' => $return->id,
                    'amount' => $amount,
                    'balance' => $amount,
                ]);
                $creditNote->update(['code' => CreditNote::codeFor($creditNote->id)]);
            }

            return $return->load(['items', 'creditNote']);
        });
    }

    /** @return array<int, int> sale_item_id => quantity already returned */
    public function returnedQuantities(Sale $sale): array
    {
        return SaleReturnItem::query()
            ->join('sale_returns', 'sale_returns.id', '=', 'sale_return_items.sale_return_id')
            ->where('sale_returns.sale_id', $sale->id)
            ->groupBy('sale_return_items.sale_item_id')
            ->selectRaw('sale_return_items.sale_item_id as id, SUM(sale_return_items.quantity) as qty')
            ->pluck('qty', 'id')
            ->map(fn ($q) => (int) $q)
            ->all();
    }
}
