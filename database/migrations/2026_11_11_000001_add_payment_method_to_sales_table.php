<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->string('payment_method')->nullable()->after('credit_note_amount');
        });

        // Every sale so far was taken at the till in cash.
        DB::table('sales')->whereNull('payment_method')->update(['payment_method' => 'cash']);
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn('payment_method');
        });
    }
};
