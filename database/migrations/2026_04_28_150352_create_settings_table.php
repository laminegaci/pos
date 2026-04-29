<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('shop_name')->default('POS');
            $table->string('shop_code')->default('POS-01');
            $table->string('currency')->default('DZD');
            $table->string('language')->default('fr');
            $table->string('timezone')->default('Africa/Algiers');
            $table->string('company')->nullable();
            $table->string('rc')->nullable();
            $table->string('nif')->nullable();
            $table->string('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->unsignedTinyInteger('vat_rate')->default(19);
            $table->text('receipt_footer')->default('Merci pour votre achat !');
            $table->boolean('show_logo')->default(true);
            $table->boolean('print_auto')->default(true);
            $table->boolean('cash_enabled')->default(true);
            $table->boolean('card_enabled')->default(true);
            $table->boolean('credit_enabled')->default(false);
            $table->string('printer_name')->default('Epson TM-T20III');
            $table->string('paper_size')->default('80mm');
            $table->string('theme')->default('light');
            $table->string('accent_color')->default('indigo');
            $table->boolean('notif_low_stock')->default(true);
            $table->boolean('notif_daily_report')->default(true);
            $table->boolean('notif_new_sale')->default(false);
            $table->boolean('two_factor')->default(false);
            $table->unsignedInteger('session_timeout')->default(30);
            $table->boolean('auto_backup')->default(true);
            $table->string('backup_frequency')->default('daily');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
