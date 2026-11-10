<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            // Snapshot at sale time so past margins survive later cost changes.
            $table->decimal('unit_cost', 10, 2)->nullable()->after('unit_price');
            $table->decimal('vat_rate', 5, 2)->nullable()->after('unit_cost');
        });

        DB::statement('UPDATE sale_items SET unit_cost = (SELECT cost_price FROM products WHERE products.id = sale_items.product_id), vat_rate = (SELECT vat_rate FROM products WHERE products.id = sale_items.product_id)');
    }

    public function down(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropColumn(['unit_cost', 'vat_rate']);
        });
    }
};
