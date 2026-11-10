<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Carts put aside at the till ("tickets en attente"), shared between tills. No stock is reserved.
        Schema::create('held_carts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();
            $table->string('label', 60)->nullable();
            $table->json('items');
            $table->json('discount')->nullable();
            $table->unsignedInteger('items_count')->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->timestamps();
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('held_carts');
    }
};
