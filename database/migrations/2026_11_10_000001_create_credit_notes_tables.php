<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_returns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reason');
            // cash | credit_note
            $table->string('refund_method', 20);
            $table->decimal('amount', 10, 2);
            $table->timestamps();

            $table->index('created_at');
        });

        Schema::create('sale_return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_return_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('line_total', 10, 2);
            $table->boolean('restock')->default(true);
            $table->timestamps();
        });

        Schema::create('credit_notes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('sale_return_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('amount', 10, 2);
            $table->decimal('balance', 10, 2);
            $table->timestamps();
        });

        Schema::create('credit_note_uses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('credit_note_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_note_uses');
        Schema::dropIfExists('credit_notes');
        Schema::dropIfExists('sale_return_items');
        Schema::dropIfExists('sale_returns');
    }
};
