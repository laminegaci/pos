<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->timestamp('cancelled_at')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('cancel_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('cancel_reason')->nullable();
            // Part of the total paid with a credit note (not a discount: the sale still counts in revenue).
            $table->decimal('credit_note_amount', 10, 2)->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cancel_approved_by');
            $table->dropConstrainedForeignId('cancelled_by');
            $table->dropColumn(['cancelled_at', 'cancel_reason', 'credit_note_amount']);
        });
    }
};
