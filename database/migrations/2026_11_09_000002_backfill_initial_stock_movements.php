<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Opening balance of the journal: stock that existed before movements were tracked.
     * Past sales did not decrement stock, so the history honestly starts from today's quantities.
     */
    public function up(): void
    {
        $now = now();

        DB::table('products')
            ->where('stock', '>', 0)
            ->where('unlimited_stock', false)
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))->from('stock_movements')->whereColumn('stock_movements.product_id', 'products.id');
            })
            ->orderBy('id')
            ->each(function ($product) use ($now) {
                DB::table('stock_movements')->insert([
                    'product_id' => $product->id,
                    'type' => 'initial',
                    'quantity' => $product->stock,
                    'stock_before' => 0,
                    'stock_after' => $product->stock,
                    'note' => 'Reprise du stock existant',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            });
    }

    public function down(): void
    {
        DB::table('stock_movements')->where('note', 'Reprise du stock existant')->delete();
    }
};
