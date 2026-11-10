<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            // Null = no limit; 0 = every credit sale needs a manager.
            $table->decimal('credit_limit', 12, 2)->nullable()->after('notes');
            $table->unsignedSmallInteger('payment_terms_days')->default(30)->after('credit_limit');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->decimal('deposit_amount', 12, 2)->default(0)->after('credit_note_amount');
            $table->string('deposit_method', 20)->nullable()->after('deposit_amount');
            // Part of the ticket put on the customer account, then what was paid / returned against it.
            $table->decimal('credit_amount', 12, 2)->default(0)->after('deposit_method');
            $table->decimal('credit_paid', 12, 2)->default(0)->after('credit_amount');
            $table->decimal('credit_returned', 12, 2)->default(0)->after('credit_paid');
            $table->date('due_at')->nullable()->after('credit_returned');
            $table->foreignId('credit_approved_by')->nullable()->after('due_at')->constrained('users')->nullOnDelete();
            $table->index(['client_id', 'status']);
        });

        Schema::create('client_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->restrictOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('method', 20);
            $table->timestamp('paid_at');
            $table->string('reference', 60)->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->text('note')->nullable();
            $table->timestamps();
        });

        Schema::create('client_payment_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_payment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_id')->constrained()->restrictOnDelete();
            $table->decimal('amount', 12, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_payment_allocations');
        Schema::dropIfExists('client_payments');

        Schema::table('sales', function (Blueprint $table) {
            $table->dropConstrainedForeignId('credit_approved_by');
            $table->dropIndex(['client_id', 'status']);
            $table->dropColumn(['deposit_amount', 'deposit_method', 'credit_amount', 'credit_paid', 'credit_returned', 'due_at']);
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn(['credit_limit', 'payment_terms_days']);
        });
    }
};
