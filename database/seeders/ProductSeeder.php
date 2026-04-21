<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            ['name' => 'Plaque BA13 Standard', 'description' => '13mm - 2,50m x 1,20m', 'price' => 450, 'category_id' => 'plaques', 'stock' => 100, 'sku' => 'PLA-B13-STD'],
            ['name' => 'Plaque BA13 Hydro', 'description' => '13mm - Hydrofuge', 'price' => 520, 'category_id' => 'plaques', 'stock' => 80, 'sku' => 'PLA-B13-HYD'],
            ['name' => 'Plaque BA13 Feu', 'description' => '13mm - Anti-feu', 'price' => 560, 'category_id' => 'plaques', 'stock' => 60, 'sku' => 'PLA-B13-FEU'],
            ['name' => 'Montant M48', 'description' => '48mm - 3m', 'price' => 180, 'category_id' => 'profiles', 'stock' => 200, 'sku' => 'PRO-M48-3M'],
            ['name' => 'Rail R48', 'description' => '48mm - 3m', 'price' => 150, 'category_id' => 'profiles', 'stock' => 200, 'sku' => 'PRO-R48-3M'],
            ['name' => 'Vis TTPC 25mm', 'description' => 'Boîte 100 pcs', 'price' => 350, 'category_id' => 'visserie', 'stock' => 50, 'sku' => 'VIS-TTPC-25'],
            ['name' => 'Enduit Jointoyage', 'description' => '25kg - Prêt à l\'emploi', 'price' => 1850, 'category_id' => 'enduits', 'stock' => 30, 'sku' => 'END-JOINT-PRET'],
            ['name' => 'Enduit Jointoyage', 'description' => '25kg - Finition', 'price' => 1720, 'category_id' => 'enduits', 'stock' => 30, 'sku' => 'END-JOINT-FIN'],
            ['name' => 'Bande à Joint', 'description' => '50mm × 30m', 'price' => 320, 'category_id' => 'accessoires', 'stock' => 100, 'sku' => 'ACC-BANDE-JT'],
            ['name' => 'Cheville à Frapper', 'description' => '6×40mm - 100 pcs', 'price' => 280, 'category_id' => 'visserie', 'stock' => 80, 'sku' => 'VIS-CHF-640'],
            ['name' => 'Peinture Mat Blanc', 'description' => '10L - Intérieur', 'price' => 3200, 'category_id' => 'peintures', 'stock' => 20, 'sku' => 'PEINT-MAT-BLC'],
            ['name' => 'Cale à Poncer', 'description' => 'Manuelle - 210×105', 'price' => 150, 'category_id' => 'accessoires', 'stock' => 50, 'sku' => 'ACC-CALE-PON'],
        ];

        foreach ($products as $product) {
            Product::create([
                ...$product,
                'image' => 'https://picsum.photos/seed/'.$product['sku'].'/400/300',
                'active' => true,
            ]);
        }
    }
}
