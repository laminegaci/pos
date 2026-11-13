<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exports\ProductExport;
use App\Http\Requests\ProductRequest;
use App\Models\Category;
use App\Models\Product;
use App\Models\Settings;
use App\Services\ProductMediaService;
use App\Services\StockService;
use App\Support\Ean13;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class ProductController extends Controller
{
    public function index(): Response
    {
        $products = Product::query()
            ->with('media')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (Product $product) => $product->append(['image_url', 'images', 'cover_media_id']));
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
     * Product columns only: media fields are handled by ProductMediaService.
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function productAttributes(array $validated): array
    {
        return array_diff_key($validated, array_flip([
            'images',
            'remove_media',
            'cover_media_id',
            'remove_legacy_image',
        ]));
    }

    public function store(ProductRequest $request, StockService $stock, ProductMediaService $media): RedirectResponse
    {
        $validated = $request->validated();
        // No rate sent: the shop-wide one from Settings.
        $validated['vat_rate'] ??= Settings::current()->vat_rate;
        $attributes = $this->productAttributes($validated);

        $product = DB::transaction(function () use ($attributes, $stock, $request) {
            $product = Product::create($attributes);
            $stock->initial($product, $request->user()?->id);

            return $product;
        });

        $media->sync(
            $product,
            (array) $request->file('images', []),
            (array) ($validated['remove_media'] ?? []),
            isset($validated['cover_media_id']) ? (int) $validated['cover_media_id'] : null,
            (bool) ($validated['remove_legacy_image'] ?? false),
        );

        return redirect()->route('products.index')->with('success', 'Produit créé avec succès');
    }

    public function update(ProductRequest $request, Product $product, ProductMediaService $media): RedirectResponse
    {
        // The quantity is never edited here: every change goes through a reasoned adjustment
        // (StockAdjustmentController) or an inventory, so the journal always says why.
        $request->merge(['stock' => $product->stock]);
        $validated = $request->validated();
        unset($validated['stock']);

        $product->update($this->productAttributes($validated));

        $media->sync(
            $product,
            (array) $request->file('images', []),
            (array) ($validated['remove_media'] ?? []),
            isset($validated['cover_media_id']) ? (int) $validated['cover_media_id'] : null,
            (bool) ($validated['remove_legacy_image'] ?? false),
        );

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

    public function destroy(Product $product, ProductMediaService $media): RedirectResponse
    {
        $media->deleteLegacyImage($product);
        $product->delete();

        return redirect()->route('products.index')->with('success', 'Produit supprimé avec succès');
    }

    public function export()
    {
        return Excel::download(new ProductExport, 'produits-'.now()->format('Y-m-d').'.xlsx');
    }
}
