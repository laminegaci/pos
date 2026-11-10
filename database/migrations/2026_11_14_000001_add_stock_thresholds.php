<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // null = use the shop-wide default (settings.low_stock_threshold)
            $table->unsignedInteger('min_stock')->nullable()->after('unlimited_stock');
        });

        Schema::table('settings', function (Blueprint $table) {
            $table->unsignedInteger('low_stock_threshold')->default(10);
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->string('reason', 30)->nullable()->after('type');
        });
    }

    public function down(): void
    {
        Schema::table('stock_movements', fn (Blueprint $t) => $t->dropColumn('reason'));
        Schema::table('settings', fn (Blueprint $t) => $t->dropColumn('low_stock_threshold'));
        Schema::table('products', fn (Blueprint $t) => $t->dropColumn('min_stock'));
    }
};
