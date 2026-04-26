<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SaleController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Sale::with(['client:id,name', 'user:id,name'])
            ->where('status', 'completed')
            ->orderByDesc('created_at');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                    ->orWhereHas('client', fn ($c) => $c->where('name', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->input('date'));
        }

        $sales = $query->paginate(20)->withQueryString();

        $sales->getCollection()->transform(fn ($sale) => [
            'id' => $sale->id,
            'client' => $sale->client?->name,
            'user' => $sale->user?->name,
            'subtotal' => (float) $sale->subtotal,
            'remise' => (float) $sale->remise,
            'total' => (float) $sale->total,
            'status' => $sale->status,
            'created_at' => $sale->created_at?->toIso8601String(),
            'items_count' => $sale->items()->count(),
        ]);

        return Inertia::render('Sales/List', [
            'sales' => $sales,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'remise' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $sale = DB::transaction(function () use ($data, $request) {
            $productIds = collect($data['items'])->pluck('product_id')->all();
            $products = Product::whereIn('id', $productIds)->get()->keyBy('id');

            $subtotal = 0;
            $lines = [];
            foreach ($data['items'] as $item) {
                $product = $products[$item['product_id']];
                $unitPrice = (float) $product->price;
                $lineTotal = $unitPrice * $item['quantity'];
                $subtotal += $lineTotal;
                $lines[] = [
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => $unitPrice,
                    'line_total' => $lineTotal,
                ];
            }

            $remise = (float) ($data['remise'] ?? 0);
            $total = max(0, $subtotal - $remise);

            $sale = Sale::create([
                'user_id' => $request->user()->id,
                'client_id' => $data['client_id'] ?? null,
                'subtotal' => $subtotal,
                'remise' => $remise,
                'total' => $total,
                'status' => 'completed',
            ]);

            foreach ($lines as $line) {
                SaleItem::create([...$line, 'sale_id' => $sale->id]);
            }

            return $sale;
        });

        return redirect('/')->with('success', "Vente #{$sale->id} enregistrée avec succès.");
    }

    public function show(int $id): Response
    {
        $sale = Sale::with(['client:id,name,email,phone', 'user:id,name'])
            ->where('status', 'completed')
            ->findOrFail($id);

        $items = SaleItem::where('sale_id', $id)
            ->leftJoin('products', 'products.id', '=', 'sale_items.product_id')
            ->select(
                'sale_items.id',
                'sale_items.product_id',
                'products.name as product_name',
                'sale_items.quantity',
                'sale_items.unit_price',
                'sale_items.line_total'
            )
            ->get()
            ->map(fn ($item) => [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product_name ?? 'Article #'.$item->product_id,
                'quantity' => (int) $item->quantity,
                'price' => (float) $item->unit_price,
                'line_total' => (float) $item->line_total,
            ]);

        return Inertia::render('Sales/Show', [
            'sale' => [
                'id' => $sale->id,
                'client' => $sale->client?->name,
                'client_email' => $sale->client?->email,
                'client_phone' => $sale->client?->phone,
                'user' => $sale->user?->name,
                'subtotal' => (float) $sale->subtotal,
                'remise' => (float) $sale->remise,
                'total' => (float) $sale->total,
                'status' => $sale->status,
                'created_at' => $sale->created_at?->toIso8601String(),
            ],
            'items' => $items,
        ]);
    }
}
