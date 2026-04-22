<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
    ['name' => 'Bureau simple moderne', 'description' => '120x60 cm - Bois MDF + métal', 'price' => 13000, 'category_id' => 'bureaux', 'stock' => 100, 'sku' => 'Ak26-1-simple'],

    ['name' => 'Bureau avec rangement intégré', 'description' => '140x60 cm - Avec étagères', 'price' => 22000, 'category_id' => 'rangement_bureau', 'stock' => 80, 'sku' => 'Ak26-2-avec'],

    ['name' => 'Bureau en L (angle)', 'description' => '160x140 cm - Gain d’espace', 'price' => 25000, 'category_id' => 'bureaux', 'stock' => 60, 'sku' => 'Ak26-3-en'],

    ['name' => 'Bureau exécutif (direction)', 'description' => '180x80 cm - Bois massif', 'price' => 55000, 'category_id' => 'bureaux_direction', 'stock' => 200, 'sku' => 'Ak26-4-executif'],

    ['name' => 'Bureau compact pour petit espace', 'description' => '90x50 cm - Idéal studio', 'price' => 8000, 'category_id' => 'bureaux_compacts', 'stock' => 200, 'sku' => 'Ak26-5-compact'],

    ['name' => 'Bureau avec tiroirs', 'description' => '3 tiroirs - rangement documents', 'price' => 18000, 'category_id' => 'rangement_bureau', 'stock' => 50, 'sku' => 'Ak26-6-avec'],

    ['name' => 'Bureau réglable en hauteur', 'description' => 'Assis/debout - ergonomique', 'price' => 30000, 'category_id' => 'bureaux_ergonomiques', 'stock' => 30, 'sku' => 'Ak26-7-reglable'],

    ['name' => 'Bureau gaming', 'description' => 'LED + support écran', 'price' => 22000, 'category_id' => 'bureaux_gaming', 'stock' => 30, 'sku' => 'Ak26-8-gaming'],

    ['name' => 'Bureau avec bibliothèque', 'description' => 'Avec étagère haute', 'price' => 30000, 'category_id' => 'rangement_bureau', 'stock' => 100, 'sku' => 'Ak26-9-avec'],

    ['name' => 'Bureau pliable', 'description' => 'Gain de place - rabattable', 'price' => 8000, 'category_id' => 'bureaux_compacts', 'stock' => 80, 'sku' => 'Ak26-10-pliable'],

    ['name' => 'Bureau industriel', 'description' => 'Bois + métal style loft', 'price' => 25000, 'category_id' => 'mobilier_professionnel', 'stock' => 20, 'sku' => 'Ak26-11-industriel'],

    ['name' => 'Bureau double (2 personnes)', 'description' => 'Open space - 2 postes', 'price' => 45000, 'category_id' => 'bureaux_partages', 'stock' => 50, 'sku' => 'Ak26-12-double'],
];

        foreach ($products as $index => $product) {
            Product::create([
                ...$product,
                'image' => database_path('images/'. ($index + 1) . '.png'),
                'active' => true,
            ]);
        }
    }
}
