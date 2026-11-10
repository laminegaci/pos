<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('cost_price', 10, 2)->nullable()->after('price');
            $table->decimal('vat_rate', 5, 2)->default(19)->after('cost_price');
            $table->string('barcode', 13)->nullable()->unique()->after('sku');
        });

        // Existing products take the shop-wide VAT rate as their starting point.
        $rate = DB::table('settings')->orderBy('id')->value('vat_rate');
        if ($rate !== null) {
            DB::table('products')->update(['vat_rate' => $rate]);
        }
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique(['barcode']);
            $table->dropColumn(['cost_price', 'vat_rate', 'barcode']);
        });
    }
};
