<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exports\ProductExport;
use App\Models\Category;
use App\Models\Product;
use App\Models\Settings;
use App\Services\StockService;
use App\Support\Ean13;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class ProductController extends Controller
{
    public function index(): Response
    {
        $products = Product::orderBy('created_at', 'desc')->get();
        $counts = Product::query()->selectRaw('category_id, COUNT(*) as n')->groupBy('category_id')->pluck('n', 'category_id');
        $categories = array_map(
            fn (array $c) => [...$c, 'products_count' => (int) ($counts[$c['id']] ?? 0)],
            Category::options(),
        );

        return Inertia::render('Products/Index', [
            'products' => $products,
            'categories' => $categories,
            'defaultMinStock' => Product::defaultMinStock(),
            'canManageStock' => (bool) request()->user()?->canManageStock(),
            'defaultVatRate' => (int) Settings::current()->vat_rate,
            'vatRates' => Product::VAT_RATES,
            'shopName' => Settings::current()->shop_name,
        ]);
    }

    /** A free store-internal EAN-13, for products that have no manufacturer barcode. */
    public function generateEan(): JsonResponse
    {
        return response()->json(['barcode' => Ean13::generateInternal()]);
    }

    /** Printable barcode labels: ?ids[]=1&qty[1]=10&format=a4|thermal. */
    public function labels(Request $request): HttpResponse
    {
        $data = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:products,id',
            'qty' => 'nullable|array',
            'qty.*' => 'integer|min:1|max:500',
            'format' => 'nullable|in:a4,thermal',
        ]);

        $products = Product::whereIn('id', $data['ids'])->orderBy('name')->get();
        $labels = [];
        foreach ($products as $p) {
            $svg = $p->barcode ? Ean13::toSvg($p->barcode) : '';
            $count = (int) ($data['qty'][$p->id] ?? 1);
            for ($i = 0; $i < $count; $i++) {
                $labels[] = ['name' => $p->name, 'price' => (float) $p->price, 'barcode' => $p->barcode, 'svg' => $svg];
            }
        }

        $settings = Settings::current();

        return response()->view('labels.barcodes', [
            'labels' => $labels,
            'format' => $data['format'] ?? 'a4',
            'settings' => $settings,
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
            'cost_price' => 'nullable|numeric|min:0',
            'vat_rate' => ['sometimes', 'required', 'numeric', Rule::in(Product::VAT_RATES)],
            'barcode' => [
                'nullable', 'string', 'size:13',
                Rule::unique('products', 'barcode')->ignore($request->route('product')),
                fn (string $attr, mixed $value, \Closure $fail) => Ean13::isValid($value) ? null : $fail(__('validation.ean13')),
            ],
            'category_id' => ['required', 'string', Rule::exists('categories', 'slug')],
            'stock' => 'required|integer|min:0',
            'unlimited_stock' => 'boolean',
            'min_stock' => 'nullable|integer|min:0|max:1000000',
            'sku' => 'nullable|string|max:255',
            'image' => 'nullable|string',
            'active' => 'boolean',
        ]);
    }

    public function store(Request $request, StockService $stock): RedirectResponse
    {
        $validated = $this->validated($request);
        // No rate sent: the shop-wide one from Settings.
        $validated['vat_rate'] ??= Settings::current()->vat_rate;

        $product = DB::transaction(function () use ($validated, $stock, $request) {
            $product = Product::create($validated);
            $stock->initial($product, $request->user()?->id);

            return $product;
        });

        return redirect()->route('products.index')->with('success', 'Produit créé avec succès');
    }

    public function update(Request $request, Product $product): RedirectResponse
    {
        // The quantity is never edited here: every change goes through a reasoned adjustment
        // (StockAdjustmentController) or an inventory, so the journal always says why.
        $request->merge(['stock' => $product->stock]);
        $validated = $this->validated($request);
        unset($validated['stock']);

        $product->update($validated);

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
                'reason' => $m->reason,
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
