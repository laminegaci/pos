<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Product;
use App\Models\Sale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    private const LIMIT = 5;

    public function __invoke(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));

        if (mb_strlen($q) < 2 && ! ctype_digit($q)) {
            return response()->json(['products' => [], 'clients' => [], 'sales' => []]);
        }

        $like = '%'.addcslashes($q, '%_\\').'%';

        $products = Product::query()
            ->where(fn ($w) => $w->where('name', 'like', $like)
                ->orWhere('sku', 'like', $like)
                ->orWhere('barcode', 'like', $like)
                ->orWhere('description', 'like', $like))
            ->orderByDesc('active')
            ->orderBy('name')
            ->limit(self::LIMIT)
            ->get(['id', 'name', 'sku', 'price', 'stock', 'active'])
            ->map(fn (Product $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'sku' => $p->sku,
                'price' => (float) $p->price,
                'stock' => $p->stock,
                'active' => (bool) $p->active,
            ]);

        $clients = Client::query()
            ->where(fn ($w) => $w->where('name', 'like', $like)
                ->orWhere('phone', 'like', $like)
                ->orWhere('email', 'like', $like))
            ->orderBy('name')
            ->limit(self::LIMIT)
            ->get(['id', 'name', 'phone', 'email'])
            ->map(fn (Client $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'phone' => $c->phone,
                'email' => $c->email,
            ]);

        $saleId = ltrim(preg_replace('/^#/', '', $q), '0');

        $sales = Sale::query()
            ->with('client:id,name')
            ->where(function ($w) use ($like, $saleId) {
                if ($saleId !== '' && ctype_digit($saleId)) {
                    $w->where('id', (int) $saleId);
                }
                $w->orWhereHas('client', fn ($c) => $c->where('name', 'like', $like));
            })
            ->orderByDesc('created_at')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (Sale $s) => [
                'id' => $s->id,
                'client' => $s->client?->name,
                'total' => (float) $s->total,
                'status' => $s->status,
                'created_at' => $s->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'products' => $products,
            'clients' => $clients,
            'sales' => $sales,
        ]);
    }
}
