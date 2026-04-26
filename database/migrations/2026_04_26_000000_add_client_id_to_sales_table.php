<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('sales', 'client_id')) {
            Schema::table('sales', function (Blueprint $table) {
                $table->foreignId('client_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('sales', 'client_id')) {
            Schema::table('sales', function (Blueprint $table) {
                $table->dropConstrainedForeignId('client_id');
            });
        }
    }
};
