<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\Settings;
use App\Services\ApprovalService;
use App\Services\ReturnService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class SaleReturnController extends Controller
{
    /** POST /ventes/{sale}/annuler */
    public function cancel(Request $request, Sale $sale, ApprovalService $approval, ReturnService $service): RedirectResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
            'approver_email' => ['nullable', 'string', 'max:255'],
            'approver_password' => ['nullable', 'string', 'max:255'],
        ]);

        $approverId = $approval->approve($request->user(), $data['approver_email'] ?? null, $data['approver_password'] ?? null);
        $service->cancel($sale, trim($data['reason']), $request->user(), $approverId);

        return redirect()->route('sales.show', $sale->id)
            ->with('success', __('returns.cancelled_ok', ['id' => $sale->id]));
    }

    /** POST /ventes/{sale}/retours */
    public function store(Request $request, Sale $sale, ApprovalService $approval, ReturnService $service): RedirectResponse
    {
        $data = $request->validate([
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.sale_item_id' => ['required', 'integer'],
            'lines.*.quantity' => ['required', 'integer', 'min:0'],
            'lines.*.restock' => ['nullable', 'boolean'],
            'reason' => ['required', 'string', 'max:255'],
            'refund_method' => ['required', 'in:'.SaleReturn::REFUND_CASH.','.SaleReturn::REFUND_CREDIT_NOTE],
            'approver_email' => ['nullable', 'string', 'max:255'],
            'approver_password' => ['nullable', 'string', 'max:255'],
        ]);

        $approverId = $approval->approve($request->user(), $data['approver_email'] ?? null, $data['approver_password'] ?? null);
        $return = $service->makeReturn($sale, $data['lines'], trim($data['reason']), $data['refund_method'], $request->user(), $approverId);

        return redirect()->route('sales.show', $sale->id)
            ->with('success', __('returns.returned_ok', ['amount' => Settings::current()->money($return->amount)]))
            // Read by the page to offer printing the return slip.
            ->with('return', [
                'id' => $return->id,
                'amount' => (float) $return->amount,
                'refund_method' => $return->refund_method,
                'credit_note' => $return->creditNote ? ['id' => $return->creditNote->id, 'code' => $return->creditNote->code] : null,
            ]);
    }

    /** GET /retours/{return}/ticket — thermal return slip. */
    public function ticket(Request $request, SaleReturn $return): Response
    {
        $return->load(['sale.client:id,name', 'user:id,name', 'approver:id,name', 'creditNote', 'items.saleItem.product:id,name']);

        $settings = Settings::current();
        $format = $request->query('format');
        if (! in_array($format, ['58mm', '80mm'], true)) {
            $format = $settings->paper_size === '58mm' ? '58mm' : '80mm';
        }

        return response()->view('invoices.return-ticket', [
            'return' => $return,
            'sale' => $return->sale,
            'settings' => $settings,
            'format' => $format,
        ]);
    }
}
