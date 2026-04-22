<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class SaleSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first() ?? User::create([
            'name' => 'Yacine Demo',
            'email' => 'yacine@demo.local',
            'password' => bcrypt('password'),
        ]);

        $products = Product::all();
        $clients = Client::all();

        if ($products->isEmpty()) {
            return;
        }

        // Génère 80 ventes réparties sur les 30 derniers jours
        for ($i = 0; $i < 80; $i++) {
            $daysAgo = random_int(0, 29);
            $hour = random_int(9, 19);
            $minute = random_int(0, 59);
            $createdAt = Carbon::now()->subDays($daysAgo)->setTime($hour, $minute);

            $lineCount = random_int(1, 5);
            $pickedProducts = $products->random(min($lineCount, $products->count()));

            $subtotal = 0;
            $items = [];
            foreach ($pickedProducts as $product) {
                $qty = random_int(1, 8);
                $lineTotal = (float) $product->price * $qty;
                $subtotal += $lineTotal;
                $items[] = [
                    'product_id' => $product->id,
                    'quantity' => $qty,
                    'unit_price' => $product->price,
                    'line_total' => $lineTotal,
                ];
            }
            $remise = random_int(0, 4) === 0 ? round($subtotal * 0.05, 2) : 0;
            $total = $subtotal - $remise;

            $sale = Sale::create([
                'user_id' => $user->id,
                'client_id' => $clients->isEmpty() || random_int(0, 2) === 0 ? null : $clients->random()->id,
                'subtotal' => $subtotal,
                'remise' => $remise,
                'total' => $total,
                'status' => 'completed',
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);

            foreach ($items as $it) {
                SaleItem::create([
                    'sale_id' => $sale->id,
                    ...$it,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);
            }
        }
    }
}
