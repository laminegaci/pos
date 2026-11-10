<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Services\PurchaseOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseOrderController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->canManageStock(), 403);

        $orders = PurchaseOrder::query()
            ->with('supplier:id,name')
            ->when($request->query('status'), fn ($q, $v) => $q->where('status', $v))
            ->when($request->query('supplier'), fn ($q, $v) => $q->where('supplier_id', $v))
            ->latest('id')
            ->get()
            ->map(fn (PurchaseOrder $o) => [
                'id' => $o->id,
                'reference' => $o->reference,
                'status' => $o->status,
                'supplier' => $o->supplier?->name,
                'total_ttc' => (float) $o->total_ttc,
                'expected_at' => $o->expected_at?->toDateString(),
                'created_at' => $o->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Purchases/Index', [
            'orders' => $orders,
            'suppliers' => Supplier::query()->orderBy('name')->get(['id', 'name']),
            'filters' => $request->only(['status', 'supplier']),
        ]);
    }

    public function create(Request $request): Response
    {
        abort_unless($request->user()->canManageStock(), 403);

        return Inertia::render('Purchases/Form', [
            'order' => null,
            'suppliers' => $this->activeSuppliers(),
            'products' => $this->productOptions(),
        ]);
    }

    public function store(Request $request, PurchaseOrderService $service): RedirectResponse
    {
        abort_unless($request->user()->canManageStock(), 403);
        $data = $this->validated($request);

        $po = $service->create(Supplier::findOrFail($data['supplier_id']), $data['lines'], $request->user(), $data['note'] ?? null, $data['expected_at'] ?? null);

        return redirect()->route('purchases.show', $po)->with('success', 'Bon de commande créé');
    }

    public function show(Request $request, PurchaseOrder $purchase): Response
    {
        abort_unless($request->user()->canManageStock(), 403);

        return Inertia::render('Purchases/Show', [
            'order' => [
                ...$purchase->only(['id', 'reference', 'status', 'note', 'total_ht', 'total_vat', 'total_ttc']),
                'supplier' => $purchase->supplier()->first(['id', 'name', 'phone']),
                'ordered_at' => $purchase->ordered_at?->toIso8601String(),
                'expected_at' => $purchase->expected_at?->toDateString(),
                'created_at' => $purchase->created_at?->toIso8601String(),
            ],
            'items' => $purchase->items()->with('product:id,name,sku,barcode')->get(),
            'receptions' => $purchase->receptions()->latest('id')->get(['id', 'reference', 'total_ttc', 'received_at']),
        ]);
    }

    public function edit(Request $request, PurchaseOrder $purchase): Response|RedirectResponse
    {
        abort_unless($request->user()->canManageStock(), 403);

        if (! $purchase->isDraft()) {
            return redirect()->route('purchases.show', $purchase);
        }

        return Inertia::render('Purchases/Form', [
            'order' => [
                ...$purchase->only(['id', 'reference', 'supplier_id', 'note']),
                'expected_at' => $purchase->expected_at?->toDateString(),
                'lines' => $purchase->items()->with('product:id,name,sku,barcode')->get(),
            ],
            'suppliers' => $this->activeSuppliers(),
            'products' => $this->productOptions(),
        ]);
    }

    public function update(Request $request, PurchaseOrder $purchase, PurchaseOrderService $service): RedirectResponse
    {
        abort_unless($request->user()->canManageStock(), 403);
        $data = $this->validated($request);

        $service->updateDraft($purchase, Supplier::findOrFail($data['supplier_id']), $data['lines'], $data['note'] ?? null, $data['expected_at'] ?? null);

        return redirect()->route('purchases.show', $purchase)->with('success', 'Bon de commande mis à jour');
    }

    public function order(Request $request, PurchaseOrder $purchase, PurchaseOrderService $service): RedirectResponse
    {
        abort_unless($request->user()->canManageStock(), 403);
        $service->markOrdered($purchase);

        return back()->with('success', 'Commande passée');
    }

    public function cancel(Request $request, PurchaseOrder $purchase, PurchaseOrderService $service): RedirectResponse
    {
        abort_unless($request->user()->canManageStock(), 403);
        $service->cancel($purchase);

        return back()->with('success', 'Commande annulée');
    }

    /** Low-stock products with a suggested quantity to reorder. */
    public function suggestions(Request $request): JsonResponse
    {
        abort_unless($request->user()->canManageStock(), 403);

        return response()->json(
            Product::query()->lowStock()->get()->map(fn (Product $p) => [
                'product_id' => $p->id,
                'name' => $p->name,
                'sku' => $p->sku,
                'stock' => (int) $p->stock,
                'quantity' => max(1, $p->effective_min_stock * 2 - (int) $p->stock),
                'unit_cost' => $p->cost_price !== null ? (float) $p->cost_price : 0,
                'vat_rate' => (float) $p->vat_rate,
            ])->values()
        );
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'expected_at' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:2000'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.quantity' => ['required', 'integer', 'min:1'],
            'lines.*.unit_cost' => ['nullable', 'numeric', 'min:0'],
            'lines.*.vat_rate' => ['nullable', 'numeric', 'in:0,9,19'],
        ]);
    }

    private function activeSuppliers()
    {
        return Supplier::query()->where('active', true)->orderBy('name')->get(['id', 'name']);
    }

    private function productOptions()
    {
        return Product::query()->where('active', true)->orderBy('name')
            ->get(['id', 'name', 'sku', 'barcode', 'stock', 'cost_price', 'vat_rate']);
    }
}
