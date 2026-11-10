<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Every stock change goes through here so that:
 *  - the check and the decrement are one atomic UPDATE ("stock >= qty"), which stays
 *    correct when two tills sell the last unit at the same time;
 *  - each change is written to the stock_movements journal.
 *
 * Must be called inside a DB transaction (the sale's), so a failure rolls everything back.
 */
class StockService
{
    /**
     * @param  array<int, int>  $quantities  product_id => quantity (already merged per product)
     * @param  Collection<int, Product>  $products  keyed by id
     *
     * @throws ValidationException when a product is inactive or lacks stock (nothing is changed)
     */
    public function takeForSale(array $quantities, $products, Sale $sale, ?int $userId): void
    {
        $errors = [];

        foreach ($quantities as $productId => $qty) {
            /** @var Product $product */
            $product = $products[$productId];

            if (! $product->active) {
                $errors[] = __('stock.inactive', ['name' => $product->name]);

                continue;
            }

            if ($product->unlimited_stock) {
                continue; // never checked nor decremented
            }

            $affected = Product::query()
                ->whereKey($productId)
                ->where('unlimited_stock', false)
                ->where('stock', '>=', $qty)
                ->decrement('stock', $qty);

            if ($affected === 0) {
                $available = (int) Product::query()->whereKey($productId)->value('stock');
                $errors[] = __('stock.insufficient', [
                    'name' => $product->name,
                    'available' => $available,
                    'requested' => $qty,
                ]);

                continue;
            }

            $after = (int) Product::query()->whereKey($productId)->value('stock');

            StockMovement::query()->create([
                'product_id' => $productId,
                'user_id' => $userId,
                'sale_id' => $sale->id,
                'type' => StockMovement::TYPE_SALE,
                'quantity' => -$qty,
                'stock_before' => $after + $qty,
                'stock_after' => $after,
                'note' => null,
            ]);
        }

        if ($errors) {
            // Thrown inside the sale transaction: decrements done above are rolled back.
            throw ValidationException::withMessages(['items' => $errors]);
        }
    }

    /**
     * Manual correction (inventory, breakage, delivery…). $delta is signed.
     *
     * @throws ValidationException if the result would be negative
     */
    public function adjust(Product $product, int $delta, ?int $userId, ?string $note = null, string $type = StockMovement::TYPE_ADJUSTMENT, ?int $saleId = null, ?string $reason = null): ?StockMovement
    {
        if ($delta === 0 || $product->unlimited_stock) {
            return null;
        }

        return DB::transaction(function () use ($product, $delta, $userId, $note, $type, $saleId, $reason) {
            $before = (int) Product::query()->whereKey($product->id)->lockForUpdate()->value('stock');
            $after = $before + $delta;

            if ($after < 0) {
                throw ValidationException::withMessages([
                    'stock' => __('stock.negative', ['available' => $before]),
                ]);
            }

            Product::query()->whereKey($product->id)->update(['stock' => $after]);
            $product->stock = $after;

            return StockMovement::query()->create([
                'product_id' => $product->id,
                'user_id' => $userId,
                'sale_id' => $saleId,
                'type' => $type,
                'reason' => $reason,
                'quantity' => $delta,
                'stock_before' => $before,
                'stock_after' => $after,
                'note' => $note,
            ]);
        });
    }

    /** First entry of the journal when a product is created with some stock. */
    public function initial(Product $product, ?int $userId): void
    {
        if ($product->unlimited_stock || (int) $product->stock === 0) {
            return;
        }

        StockMovement::query()->create([
            'product_id' => $product->id,
            'user_id' => $userId,
            'type' => StockMovement::TYPE_INITIAL,
            'quantity' => (int) $product->stock,
            'stock_before' => 0,
            'stock_after' => (int) $product->stock,
        ]);
    }
}
