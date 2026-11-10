<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchaseOrderService
{
    /**
     * @param  array<int, array{product_id:int, quantity:int, unit_cost?:float|null, vat_rate?:float|null}>  $lines
     */
    public function create(Supplier $supplier, array $lines, ?User $user, ?string $note = null, ?string $expectedAt = null): PurchaseOrder
    {
        return DB::transaction(function () use ($supplier, $lines, $user, $note, $expectedAt) {
            $po = PurchaseOrder::query()->create([
                'reference' => 'TMP-'.uniqid(),
                'supplier_id' => $supplier->id,
                'status' => PurchaseOrder::STATUS_DRAFT,
                'user_id' => $user?->id,
                'expected_at' => $expectedAt,
                'note' => $note,
            ]);
            $po->update(['reference' => PurchaseOrder::referenceFor($po->id)]);
            $this->syncLines($po, $lines);

            return $po;
        });
    }

    public function updateDraft(PurchaseOrder $po, Supplier $supplier, array $lines, ?string $note = null, ?string $expectedAt = null): PurchaseOrder
    {
        return DB::transaction(function () use ($po, $supplier, $lines, $note, $expectedAt) {
            $locked = $this->lock($po);
            $this->assertStatus($locked, [PurchaseOrder::STATUS_DRAFT]);
            $locked->update(['supplier_id' => $supplier->id, 'note' => $note, 'expected_at' => $expectedAt]);
            $locked->items()->delete();
            $this->syncLines($locked, $lines);

            return $locked;
        });
    }

    public function markOrdered(PurchaseOrder $po): void
    {
        DB::transaction(function () use ($po) {
            $locked = $this->lock($po);
            $this->assertStatus($locked, [PurchaseOrder::STATUS_DRAFT]);
            if (! $locked->items()->exists()) {
                throw ValidationException::withMessages(['purchase' => __('purchases.empty')]);
            }
            $locked->update(['status' => PurchaseOrder::STATUS_ORDERED, 'ordered_at' => now()]);
        });
    }

    public function cancel(PurchaseOrder $po): void
    {
        DB::transaction(function () use ($po) {
            $locked = $this->lock($po);
            $this->assertStatus($locked, [PurchaseOrder::STATUS_DRAFT, PurchaseOrder::STATUS_ORDERED, PurchaseOrder::STATUS_PARTIAL]);
            if ($locked->items()->where('quantity_received', '>', 0)->exists()) {
                throw ValidationException::withMessages(['purchase' => __('purchases.cannot_cancel')]);
            }
            $locked->update(['status' => PurchaseOrder::STATUS_CANCELLED]);
        });
    }

    private function syncLines(PurchaseOrder $po, array $lines): void
    {
        $merged = [];
        foreach ($lines as $l) {
            $id = (int) $l['product_id'];
            $merged[$id] = [
                'quantity' => ($merged[$id]['quantity'] ?? 0) + (int) $l['quantity'],
                'unit_cost' => $l['unit_cost'] ?? null,
                'vat_rate' => $l['vat_rate'] ?? null,
            ];
        }

        $products = Product::query()->whereIn('id', array_keys($merged))->get()->keyBy('id');
        foreach ($merged as $productId => $l) {
            $product = $products[$productId];
            $po->items()->create([
                'product_id' => $productId,
                'quantity_ordered' => $l['quantity'],
                'unit_cost' => round((float) ($l['unit_cost'] ?? $product->cost_price ?? 0), 2),
                'vat_rate' => (float) ($l['vat_rate'] ?? $product->vat_rate ?? 0),
            ]);
        }
        $po->recalcTotals();
    }

    private function lock(PurchaseOrder $po): PurchaseOrder
    {
        return PurchaseOrder::query()->whereKey($po->id)->lockForUpdate()->firstOrFail();
    }

    private function assertStatus(PurchaseOrder $po, array $allowed): void
    {
        if (! in_array($po->status, $allowed, true)) {
            throw ValidationException::withMessages(['purchase' => __('purchases.bad_status')]);
        }
    }
}
