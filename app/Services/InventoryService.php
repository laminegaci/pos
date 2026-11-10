<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Inventory;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public const KEEP = 'keep';

    public const ZERO = 'zero';

    public function __construct(private StockService $stock) {}

    /**
     * Snapshot the active limited-stock products (optionally of one category).
     *
     * @throws ValidationException if a draft already exists or nothing is countable
     */
    public function start(?string $categorySlug, User $user): Inventory
    {
        return DB::transaction(function () use ($categorySlug, $user) {
            if (Inventory::where('status', Inventory::STATUS_DRAFT)->exists()) {
                throw ValidationException::withMessages(['inventory' => __('stock.inventory_open')]);
            }

            $products = Product::query()
                ->where('active', true)
                ->where('unlimited_stock', false)
                ->when($categorySlug, fn ($q) => $q->where('category_id', $categorySlug))
                ->get(['id', 'stock', 'cost_price']);

            if ($products->isEmpty()) {
                throw ValidationException::withMessages(['inventory' => __('stock.inventory_empty')]);
            }

            $inventory = Inventory::create([
                'reference' => $this->nextReference(),
                'status' => Inventory::STATUS_DRAFT,
                'category_slug' => $categorySlug,
                'user_id' => $user->id,
            ]);

            $now = now();
            $inventory->lines()->insert($products->map(fn ($p) => [
                'inventory_id' => $inventory->id,
                'product_id' => $p->id,
                'expected_qty' => (int) $p->stock,
                'unit_cost' => $p->cost_price ?? 0,
                'created_at' => $now,
                'updated_at' => $now,
            ])->all());

            return $inventory;
        });
    }

    /**
     * Apply the gaps. A delta (counted - expected) is applied, not an overwrite,
     * so sales made while counting are preserved; the result never goes below 0.
     */
    public function validate(Inventory $inventory, User $user, string $uncounted = self::KEEP): void
    {
        DB::transaction(function () use ($inventory, $user, $uncounted) {
            $inventory = Inventory::whereKey($inventory->id)->lockForUpdate()->firstOrFail();
            if (! $inventory->isDraft()) {
                throw ValidationException::withMessages(['inventory' => __('stock.inventory_closed')]);
            }

            foreach ($inventory->lines()->with('product')->get() as $line) {
                $counted = $line->counted_qty ?? ($uncounted === self::ZERO ? 0 : null);
                $product = $line->product;
                if ($counted === null || ! $product || $product->unlimited_stock) {
                    continue;
                }

                $current = (int) Product::whereKey($product->id)->value('stock');
                $delta = max($counted - $line->expected_qty, -$current);

                $this->stock->adjust(
                    $product, $delta, $user->id, $inventory->reference,
                    StockMovement::TYPE_INVENTORY, null, 'correction',
                );
            }

            $inventory->update([
                'status' => Inventory::STATUS_VALIDATED,
                'validated_by' => $user->id,
                'validated_at' => now(),
            ]);
        });
    }

    public function cancel(Inventory $inventory): void
    {
        if (! $inventory->isDraft()) {
            throw ValidationException::withMessages(['inventory' => __('stock.inventory_closed')]);
        }
        $inventory->update(['status' => Inventory::STATUS_CANCELLED]);
    }

    private function nextReference(): string
    {
        $year = now()->year;
        $n = Inventory::where('reference', 'like', "INV-$year-%")->count() + 1;

        return sprintf('INV-%d-%03d', $year, $n);
    }
}
