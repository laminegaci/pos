<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Reception;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReceptionService
{
    public function __construct(private StockService $stock, private SupplierPaymentService $payments) {}

    /**
     * Weighted average cost (PMP). Falls back to the incoming cost when there is nothing to average with.
     */
    public static function weightedCost(int $stockBefore, ?float $oldCost, int $qty, float $unitCost, bool $unlimited): float
    {
        if ($unlimited || $stockBefore <= 0 || $oldCost === null) {
            return round($unitCost, 2);
        }

        return round(($stockBefore * $oldCost + $qty * $unitCost) / ($stockBefore + $qty), 2);
    }

    /**
     * @param  array<int, array{product_id:int, quantity:int, unit_cost?:float|null, vat_rate?:float|null}>  $lines
     * @param  array{invoice_ref?:?string, note?:?string, payment?:?array{amount:float, method:string}}  $extra
     */
    public function receive(?PurchaseOrder $po, Supplier $supplier, array $lines, ?User $user, array $extra = []): Reception
    {
        return DB::transaction(function () use ($po, $supplier, $lines, $user, $extra) {
            if ($po) {
                $po = PurchaseOrder::query()->whereKey($po->id)->lockForUpdate()->firstOrFail();
                if (! $po->isReceivable()) {
                    throw ValidationException::withMessages(['reception' => __('purchases.not_receivable')]);
                }
                $supplier = $po->supplier;
            }

            $lines = array_values(array_filter($lines, fn ($l) => (int) $l['quantity'] > 0));
            if (! $lines) {
                throw ValidationException::withMessages(['reception' => __('purchases.empty')]);
            }

            $reception = Reception::query()->create([
                'reference' => 'TMP-'.uniqid(),
                'supplier_id' => $supplier->id,
                'purchase_order_id' => $po?->id,
                'user_id' => $user?->id,
                'received_at' => now(),
                'supplier_invoice_ref' => $extra['invoice_ref'] ?? null,
                'note' => $extra['note'] ?? null,
            ]);
            $reception->update(['reference' => Reception::referenceFor($reception->id)]);

            $ht = 0.0;
            $vat = 0.0;

            foreach ($lines as $l) {
                $qty = (int) $l['quantity'];
                $poItem = null;

                if ($po) {
                    /** @var PurchaseOrderItem|null $poItem */
                    $poItem = $po->items()->where('product_id', $l['product_id'])->lockForUpdate()->first();
                    if (! $poItem || $qty > $poItem->remaining) {
                        throw ValidationException::withMessages(['reception' => __('purchases.over_receive')]);
                    }
                }

                $product = Product::query()->whereKey($l['product_id'])->lockForUpdate()->firstOrFail();
                $unitCost = round((float) ($l['unit_cost'] ?? $poItem?->unit_cost ?? $product->cost_price ?? 0), 2);
                $vatRate = (float) ($l['vat_rate'] ?? $poItem?->vat_rate ?? $product->vat_rate ?? 0);

                $oldCost = $product->cost_price !== null ? (float) $product->cost_price : null;
                $newCost = self::weightedCost((int) $product->stock, $oldCost, $qty, $unitCost, (bool) $product->unlimited_stock);

                $product->update(['cost_price' => $newCost]);
                $this->stock->adjust($product, $qty, $user?->id, $reception->reference, StockMovement::TYPE_PURCHASE, null, 'reception', $reception->id);

                $reception->items()->create([
                    'purchase_order_item_id' => $poItem?->id,
                    'product_id' => $product->id,
                    'quantity' => $qty,
                    'unit_cost' => $unitCost,
                    'vat_rate' => $vatRate,
                    'cost_before' => $oldCost,
                    'cost_after' => $newCost,
                ]);

                $poItem?->increment('quantity_received', $qty);

                $line = round($qty * $unitCost, 2);
                $ht += $line;
                $vat += round($line * $vatRate / 100, 2);
            }

            $reception->update([
                'total_ht' => round($ht, 2),
                'total_vat' => round($vat, 2),
                'total_ttc' => round($ht + $vat, 2),
            ]);

            $po?->refreshStatus();

            if (! empty($extra['payment']) && (float) $extra['payment']['amount'] > 0) {
                $this->payments->record(
                    $supplier,
                    (float) $extra['payment']['amount'],
                    $extra['payment']['method'],
                    $user,
                    $reception->id,
                );
            }

            return $reception;
        });
    }
}
