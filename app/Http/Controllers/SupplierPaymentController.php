<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Services\SupplierPaymentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SupplierPaymentController extends Controller
{
    public function store(Request $request, Supplier $supplier, SupplierPaymentService $service): RedirectResponse
    {
        abort_unless($request->user()->canManageStock(), 403);

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0'],
            'method' => ['required', Rule::in(SupplierPayment::METHODS)],
            'reference' => ['nullable', 'string', 'max:60'],
            'note' => ['nullable', 'string', 'max:500'],
            'reception_id' => ['nullable', Rule::exists('receptions', 'id')->where('supplier_id', $supplier->id)],
        ]);

        $service->record(
            $supplier,
            (float) $data['amount'],
            $data['method'],
            $request->user(),
            $data['reception_id'] ?? null,
            $data['reference'] ?? null,
            $data['note'] ?? null,
        );

        return back()->with('success', 'Règlement enregistré');
    }

    public function destroy(Request $request, SupplierPayment $payment, SupplierPaymentService $service): RedirectResponse
    {
        abort_unless($request->user()->canManageStock(), 403);
        $service->delete($payment);

        return back()->with('success', 'Règlement supprimé');
    }
}
