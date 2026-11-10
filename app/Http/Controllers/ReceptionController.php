<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Reception;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Services\ReceptionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ReceptionController extends Controller
{
    public function createFromOrder(Request $request, PurchaseOrder $purchase): Response|RedirectResponse
    {
        abort_unless($request->user()->canManageStock(), 403);

        if (! $purchase->isReceivable()) {
            return redirect()->route('purchases.show', $purchase);
        }

        $items = $purchase->items()->with('product:id,name,sku,stock,cost_price,unlimited_stock')->get()
            ->filter(fn ($i) => $i->remaining > 0)->values();

        return Inertia::render('Receptions/Create', [
            'order' => $purchase->only(['id', 'reference']),
            'supplier' => $purchase->supplier()->first(['id', 'name']),
            'lines' => $items,
            'suppliers' => [],
            'products' => [],
            'methods' => SupplierPayment::METHODS,
        ]);
    }

    public function create(Request $request): Response
    {
        abort_unless($request->user()->canManageStock(), 403);

        return Inertia::render('Receptions/Create', [
            'order' => null,
            'supplier' => null,
            'lines' => [],
            'suppliers' => Supplier::query()->where('active', true)->orderBy('name')->get(['id', 'name']),
            'products' => Product::query()->where('active', true)->orderBy('name')
                ->get(['id', 'name', 'sku', 'barcode', 'stock', 'cost_price', 'vat_rate', 'unlimited_stock']),
            'methods' => SupplierPayment::METHODS,
        ]);
    }

    public function store(Request $request, ReceptionService $service): RedirectResponse
    {
        abort_unless($request->user()->canManageStock(), 403);

        $data = $request->validate([
            'purchase_order_id' => ['nullable', 'exists:purchase_orders,id'],
            'supplier_id' => ['required_without:purchase_order_id', 'nullable', 'exists:suppliers,id'],
            'supplier_invoice_ref' => ['nullable', 'string', 'max:60'],
            'note' => ['nullable', 'string', 'max:2000'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.quantity' => ['required', 'integer', 'min:0'],
            'lines.*.unit_cost' => ['nullable', 'numeric', 'min:0'],
            'lines.*.vat_rate' => ['nullable', 'numeric', 'in:0,9,19'],
            'payment' => ['nullable', 'array'],
            'payment.amount' => ['required_with:payment', 'numeric', 'min:0'],
            'payment.method' => ['required_with:payment', Rule::in(SupplierPayment::METHODS)],
        ]);

        $po = isset($data['purchase_order_id']) ? PurchaseOrder::findOrFail($data['purchase_order_id']) : null;
        $supplier = $po ? $po->supplier : Supplier::findOrFail($data['supplier_id']);

        $reception = $service->receive($po, $supplier, $data['lines'], $request->user(), [
            'invoice_ref' => $data['supplier_invoice_ref'] ?? null,
            'note' => $data['note'] ?? null,
            'payment' => $data['payment'] ?? null,
        ]);

        return redirect()->route('receptions.show', $reception)->with('success', 'Réception enregistrée');
    }

    public function show(Request $request, Reception $reception): Response
    {
        abort_unless($request->user()->canManageStock(), 403);

        return Inertia::render('Receptions/Show', [
            'reception' => [
                ...$reception->only(['id', 'reference', 'supplier_invoice_ref', 'note', 'total_ht', 'total_vat', 'total_ttc']),
                'received_at' => $reception->received_at?->toIso8601String(),
                'supplier' => $reception->supplier()->first(['id', 'name']),
                'order' => $reception->purchaseOrder()->first(['id', 'reference']),
                'user' => $reception->user?->name,
            ],
            'items' => $reception->items()->with('product:id,name,sku')->get(),
            'payments' => $reception->payments()->get(['id', 'amount', 'method', 'paid_at']),
        ]);
    }
}
