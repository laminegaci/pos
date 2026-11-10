<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\SupplierPayment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->canManageStock(), 403);

        $suppliers = Supplier::query()->withBalance()->orderBy('name')->get()->map(fn (Supplier $s) => [
            ...$s->only(['id', 'name', 'contact_name', 'phone', 'email', 'address', 'tax_id', 'rc', 'payment_terms_days', 'note', 'active']),
            'balance' => $s->balanceFromSums(),
        ]);

        return Inertia::render('Suppliers/Index', [
            'suppliers' => $suppliers,
            'totalDebt' => round($suppliers->where('balance', '>', 0)->sum('balance'), 2),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()->canManageStock(), 403);
        Supplier::query()->create($this->validated($request));

        return back()->with('success', 'Fournisseur créé');
    }

    public function update(Request $request, Supplier $supplier): RedirectResponse
    {
        abort_unless($request->user()->canManageStock(), 403);
        $supplier->update($this->validated($request));

        return back()->with('success', 'Fournisseur mis à jour');
    }

    /** A supplier with history is only deactivated (receptions and payments must stay traceable). */
    public function destroy(Request $request, Supplier $supplier): RedirectResponse
    {
        abort_unless($request->user()->canManageStock(), 403);

        if ($supplier->hasHistory()) {
            $supplier->update(['active' => false]);

            return redirect()->route('suppliers.index')->with('success', 'Fournisseur désactivé');
        }

        $supplier->delete();

        return redirect()->route('suppliers.index')->with('success', 'Fournisseur supprimé');
    }

    public function show(Request $request, Supplier $supplier): Response
    {
        abort_unless($request->user()->canManageStock(), 403);

        $orders = $supplier->purchaseOrders()->latest('id')->get(['id', 'reference', 'status', 'total_ttc', 'created_at']);
        $receptions = $supplier->receptions()->latest('id')->get(['id', 'reference', 'purchase_order_id', 'total_ttc', 'supplier_invoice_ref', 'received_at']);
        $payments = $supplier->payments()->latest('id')->get(['id', 'reception_id', 'amount', 'method', 'paid_at', 'reference', 'note']);

        return Inertia::render('Suppliers/Show', [
            'supplier' => [
                ...$supplier->only(['id', 'name', 'contact_name', 'phone', 'email', 'address', 'tax_id', 'rc', 'payment_terms_days', 'note', 'active']),
                'balance' => $supplier->balance(),
            ],
            'orders' => $orders,
            'receptions' => $receptions,
            'payments' => $payments,
            'methods' => SupplierPayment::METHODS,
        ]);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'tax_id' => ['nullable', 'string', 'max:40'],
            'rc' => ['nullable', 'string', 'max:40'],
            'payment_terms_days' => ['nullable', 'integer', 'min:0', 'max:365'],
            'note' => ['nullable', 'string', 'max:2000'],
            'active' => ['sometimes', 'boolean'],
        ]);
    }
}
