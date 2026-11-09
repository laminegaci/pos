<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            // products.category_id stores this slug, so existing products keep working untouched.
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('color', 7)->default('#6366f1');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        $known = [
            'bureaux' => ['Bureaux', '#6366f1'],
            'rangement_bureau' => ['Rangement', '#06b6d4'],
            'bureaux_direction' => ['Bureaux Direction', '#f59e0b'],
            'bureaux_compacts' => ['Bureaux Compacts', '#10b981'],
            'bureaux_ergonomiques' => ['Bureaux Ergonomiques', '#ec4899'],
            'bureaux_gaming' => ['Bureaux Gaming', '#8b5cf6'],
            'mobilier_professionnel' => ['Mobilier Pro', '#f97316'],
            'bureaux_partages' => ['Bureaux Partagés', '#14b8a6'],
        ];

        // Also keep any slug already used by a product but missing from the list above.
        $used = DB::table('products')->distinct()->pluck('category_id')->filter()->all();
        foreach ($used as $slug) {
            $known[$slug] ??= [Str::headline($slug), '#94a3b8'];
        }

        $order = 0;
        foreach ($known as $slug => [$name, $color]) {
            DB::table('categories')->insert([
                'slug' => $slug, 'name' => $name, 'color' => $color, 'sort_order' => $order++,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
