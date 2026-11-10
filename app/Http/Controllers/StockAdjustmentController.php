<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockMovement;
use App\Services\StockService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StockAdjustmentController extends Controller
{
    /** Reasoned manual adjustment: breakage, loss, theft, expiry, goods received… */
    public function store(Request $request, Product $product, StockService $stock): RedirectResponse
    {
        abort_unless($request->user()->canManageStock(), 403);

        $data = $request->validate([
            'direction' => ['required', Rule::in(['in', 'out'])],
            'quantity' => 'required|integer|min:1|max:1000000',
            'reason' => ['required', Rule::in(array_unique([...StockMovement::REASONS_IN, ...StockMovement::REASONS_OUT]))],
            'note' => ['nullable', 'string', 'max:255', Rule::requiredIf($request->input('reason') === 'autre')],
        ]);

        $allowed = $data['direction'] === 'in' ? StockMovement::REASONS_IN : StockMovement::REASONS_OUT;
        if (! in_array($data['reason'], $allowed, true)) {
            return back()->withErrors(['reason' => __('stock.reason_direction')]);
        }

        if ($product->unlimited_stock) {
            return back()->withErrors(['quantity' => __('stock.unlimited')]);
        }

        $delta = $data['direction'] === 'in' ? (int) $data['quantity'] : -(int) $data['quantity'];
        $stock->adjust($product, $delta, $request->user()->id, $data['note'] ?? null, StockMovement::TYPE_ADJUSTMENT, null, $data['reason']);

        return back()->with('success', __('stock.adjusted'));
    }
}
