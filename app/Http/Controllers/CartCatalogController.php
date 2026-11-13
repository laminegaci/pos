<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Product;
use App\Models\Settings;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

/**
 * Data the till needs to build a ticket (products, credit clients, print settings).
 * The cart is shown on every page, so pages other than the till load it through this endpoint.
 */
class CartCatalogController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'products' => self::products(),
            'clients' => self::clients(),
            'printAuto' => (bool) Settings::current()->print_auto,
            'paperSize' => Settings::current()->paper_size,
        ]);
    }

    public static function products(): Collection
    {
        return Product::with('media')->where('active', true)->get()->map(fn ($p) => [
            'id' => $p->id,
            'name' => $p->name,
            'description' => $p->description,
            'price' => (float) $p->price,
            'category_id' => $p->category_id,
            'barcode' => $p->barcode,
            'sku' => $p->sku,
            'image' => $p->image_url,
            'stock' => $p->stock,
            'unlimited_stock' => (bool) $p->unlimited_stock,
            'effective_min_stock' => $p->effective_min_stock,
        ]);
    }

    public static function clients(): Collection
    {
        return Client::query()->withBalance()->where('active', true)
            ->orderBy('name')
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'phone' => $c->phone,
                // Credit account, shown at the till when paying on credit.
                'balance' => round((float) $c->credit_balance, 2),
                'credit_limit' => $c->credit_limit === null ? null : (float) $c->credit_limit,
                'overdue' => round((float) $c->overdue_amount, 2),
                'terms' => (int) $c->payment_terms_days,
            ]);
    }
}
