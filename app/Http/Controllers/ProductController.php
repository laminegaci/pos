<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exports\ProductExport;
use App\Models\Product;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class ProductController extends Controller
{
    public function index(): Response
    {
        $products = Product::orderBy('created_at', 'desc')->get();
        $categories = [
            ['id' => 'bureaux', 'label' => 'Bureaux'],
            ['id' => 'rangement_bureau', 'label' => 'Rangement'],
            ['id' => 'bureaux_direction', 'label' => 'Bureaux Direction'],
            ['id' => 'bureaux_compacts', 'label' => 'Bureaux Compacts'],
            ['id' => 'bureaux_ergonomiques', 'label' => 'Bureaux Ergonomiques'],
            ['id' => 'bureaux_gaming', 'label' => 'Bureaux Gaming'],
            ['id' => 'mobilier_professionnel', 'label' => 'Mobilier Pro'],
        ];

        return Inertia::render('Products/Index', [
            'products' => $products,
            'categories' => $categories,
        ]);
    }

    /**
     * With unlimited stock the quantity is irrelevant, so it may be left empty.
     *
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        if ($request->boolean('unlimited_stock') && ! is_numeric($request->input('stock'))) {
            $request->merge(['stock' => 0]);
        }

        return $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'category_id' => 'required|string',
            'stock' => 'required|integer|min:0',
            'unlimited_stock' => 'boolean',
            'stock_note' => 'nullable|string|max:255',
            'sku' => 'nullable|string|max:255',
            'image' => 'nullable|string',
            'active' => 'boolean',
        ]);
    }

    public function store(Request $request, StockService $stock): RedirectResponse
    {
        $validated = $this->validated($request);
        unset($validated['stock_note']);

        $product = DB::transaction(function () use ($validated, $stock, $request) {
            $product = Product::create($validated);
            $stock->initial($product, $request->user()?->id);

            return $product;
        });

        return redirect()->route('products.index')->with('success', 'Produit créé avec succès');
    }

    public function update(Request $request, Product $product, StockService $stock): RedirectResponse
    {
        $validated = $this->validated($request);
        $note = $validated['stock_note'] ?? null;
        unset($validated['stock_note']);

        DB::transaction(function () use ($validated, $product, $stock, $request, $note) {
            $unlimited = (bool) ($validated['unlimited_stock'] ?? false);
            $delta = (int) $validated['stock'] - (int) $product->stock;

            // The quantity is changed through the service (journaled), never by a plain update.
            unset($validated['stock']);
            $product->update($validated);

            if (! $unlimited) {
                $stock->adjust($product, $delta, $request->user()?->id, $note);
            }
        });

        return redirect()->route('products.index')->with('success', 'Produit mis à jour avec succès');
    }

    /** Last stock movements of a product (journal), newest first. */
    public function movements(Product $product): JsonResponse
    {
        $movements = $product->stockMovements()
            ->with(['user:id,name', 'sale:id'])
            ->latest('id')
            ->limit(50)
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'type' => $m->type,
                'quantity' => $m->quantity,
                'stock_before' => $m->stock_before,
                'stock_after' => $m->stock_after,
                'note' => $m->note,
                'user' => $m->user?->name,
                'sale_id' => $m->sale_id,
                'created_at' => $m->created_at?->toIso8601String(),
            ]);

        return response()->json(['movements' => $movements]);
    }

    public function destroy(Product $product): RedirectResponse
    {
        if ($product->image && str_starts_with($product->image, '/storage/')) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $product->image));
        }
        $product->delete();

        return redirect()->route('products.index')->with('success', 'Produit supprimé avec succès');
    }

    public function uploadImage(Request $request): array
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        $path = $request->file('image')->store('products', 'public');

        return [
            'url' => '/storage/'.$path,
        ];
    }

    public function export()
    {
        return Excel::download(new ProductExport, 'produits-'.now()->format('Y-m-d').'.xlsx');
    }
}
