<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            ['name' => 'Bureau simple moderne', 'description' => '13mm - 2,50m x 1,20m', 'price' => 13000, 'category_id' => 'plaques', 'stock' => 100, 'sku' => 'Ak26-1-simple'],
            ['name' => 'Bureau avec rangement intégré', 'description' => '13mm - Hydrofuge', 'price' => 22000, 'category_id' => 'plaques', 'stock' => 80, 'sku' => 'Ak26-2-avec'],
            ['name' => 'Bureau en L (angle)', 'description' => '13mm - Anti-feu', 'price' => 25000, 'category_id' => 'plaques', 'stock' => 60, 'sku' => 'Ak26-3-en'],
            ['name' => 'Bureau exécutif (direction)', 'description' => '48mm - 3m', 'price' => 55000, 'category_id' => 'profiles', 'stock' => 200, 'sku' => 'Ak26-4-exécutif'],
            ['name' => 'Bureau compact pour petit espace', 'description' => '48mm - 3m', 'price' => 8000, 'category_id' => 'profiles', 'stock' => 200, 'sku' => 'Ak26-5-compact'],
            ['name' => 'Bureau avec tiroirs', 'description' => 'Boîte 100 pcs', 'price' => 18000, 'category_id' => 'visserie', 'stock' => 50, 'sku' => 'Ak26-6-avec'],
            ['name' => 'Bureau réglable en hauteur', 'description' => '25kg - Prêt à l\'emploi', 'price' => 13000, 'category_id' => 'enduits', 'stock' => 30, 'sku' => 'Ak26-7-réglable'],
            ['name' => 'Bureau gaming', 'description' => '25kg - Finition', 'price' => 22000, 'category_id' => 'enduits', 'stock' => 30, 'sku' => 'Ak26-8-gaming'],
            ['name' => 'Bureau avec bibliothèque', 'description' => '50mm × 30m', 'price' => 30000, 'category_id' => 'accessoires', 'stock' => 100, 'sku' => 'Ak26-9-avec'],
            ['name' => 'Bureau pliable', 'description' => '6×40mm - 100 pcs', 'price' => 8000, 'category_id' => 'visserie', 'stock' => 80, 'sku' => 'Ak26-10-pliable'],
            ['name' => 'Bureau industriel', 'description' => '10L - Intérieur', 'price' => 25000, 'category_id' => 'peintures', 'stock' => 20, 'sku' => 'Ak26-11-industriel'],
            ['name' => 'Bureau double (2 personnes)', 'description' => 'Manuelle - 210×105', 'price' => 45000, 'category_id' => 'accessoires', 'stock' => 50, 'sku' => 'Ak26-12-double'],
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
