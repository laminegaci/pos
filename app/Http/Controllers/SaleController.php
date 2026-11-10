<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exports\SaleExport;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Settings;
use App\Services\CreditNoteService;
use App\Services\ReturnService;
use App\Services\StockService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class SaleController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Sale::with(['client:id,name', 'user:id,name'])
            ->withSum('returns as returned_amount', 'amount')
            ->orderByDesc('created_at');

        // Filter by status: completed | cancelled | returned (has a refund). Default: everything.
        $status = $request->input('status');
        if ($status === 'completed') {
            $query->where('status', Sale::STATUS_COMPLETED)->whereDoesntHave('returns');
        } elseif ($status === 'cancelled') {
            $query->where('status', Sale::STATUS_CANCELLED);
        } elseif ($status === 'returned') {
            $query->whereHas('returns');
        }

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
            'display_status' => $this->displayStatus($sale, (float) ($sale->returned_amount ?? 0)),
            'returned_amount' => (float) ($sale->returned_amount ?? 0),
            'created_at' => $sale->created_at?->toIso8601String(),
            'items_count' => $sale->items()->count(),
        ]);

        return Inertia::render('Sales/List', [
            'sales' => $sales,
            'filters' => ['status' => $status ?: 'all'],
        ]);
    }

    /** completed | partially_returned | returned | cancelled */
    private function displayStatus(Sale $sale, float $returned): string
    {
        if ($sale->isCancelled()) {
            return 'cancelled';
        }
        if ($returned <= 0) {
            return 'completed';
        }

        return $returned + 0.005 >= (float) $sale->total ? 'returned' : 'partially_returned';
    }

    public function store(Request $request, StockService $stock, CreditNoteService $creditNotes): RedirectResponse
    {
        $data = $request->validate([
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'remise' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            // Part of the total paid with a credit note (a payment, not a discount).
            'credit_note_code' => ['nullable', 'string', 'max:20', 'required_with:credit_note_amount'],
            'credit_note_amount' => ['nullable', 'numeric', 'gt:0', 'required_with:credit_note_code'],
            'payment_method' => ['nullable', Rule::in(Sale::PAYMENT_METHODS)],
        ]);

        // Same product sent twice => one line, so the stock check sees the real total.
        $quantities = [];
        foreach ($data['items'] as $item) {
            $id = (int) $item['product_id'];
            $quantities[$id] = ($quantities[$id] ?? 0) + (int) $item['quantity'];
        }

        $sale = DB::transaction(function () use ($data, $request, $stock, $creditNotes, $quantities) {
            $products = Product::whereIn('id', array_keys($quantities))->get()->keyBy('id');

            $subtotal = 0;
            $lines = [];
            foreach ($quantities as $productId => $quantity) {
                $product = $products[$productId];
                $unitPrice = (float) $product->price;
                $lineTotal = $unitPrice * $quantity;
                $subtotal += $lineTotal;
                $lines[] = [
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    // Cost and VAT frozen at sale time, so the margin stays true if they change later.
                    'unit_cost' => $product->cost_price === null ? null : (float) $product->cost_price,
                    'vat_rate' => (float) $product->vat_rate,
                    'line_total' => $lineTotal,
                ];
            }

            $remise = (float) ($data['remise'] ?? 0);
            $total = max(0, $subtotal - $remise);

            $creditAmount = round((float) ($data['credit_note_amount'] ?? 0), 2);
            if ($creditAmount > round($total, 2)) {
                throw ValidationException::withMessages(['credit_note_amount' => __('returns.credit_exceeds_total')]);
            }

            // What is left to pay once the credit note has paid its part.
            $paymentMethod = null;
            if (round($total - $creditAmount, 2) > 0) {
                $enabled = Settings::current()->enabledPaymentMethods();
                // No method sent (older client): the first enabled one.
                $paymentMethod = $data['payment_method'] ?? ($enabled[0] ?? null);
                if (! $paymentMethod || ! in_array($paymentMethod, $enabled, true)) {
                    throw ValidationException::withMessages(['payment_method' => __('messages.payment_method_invalid')]);
                }
                if ($paymentMethod === Sale::PAYMENT_CREDIT && empty($data['client_id'])) {
                    throw ValidationException::withMessages(['payment_method' => __('messages.payment_credit_needs_client')]);
                }
            }

            $sale = Sale::create([
                'user_id' => $request->user()->id,
                'client_id' => $data['client_id'] ?? null,
                'subtotal' => $subtotal,
                'remise' => $remise,
                'total' => $total,
                'credit_note_amount' => $creditAmount,
                'payment_method' => $paymentMethod,
                'status' => Sale::STATUS_COMPLETED,
            ]);

            foreach ($lines as $line) {
                SaleItem::create([...$line, 'sale_id' => $sale->id]);
            }

            // Atomic check + decrement + journal. Throws (and rolls the whole sale
            // back) if any product is inactive or lacks stock.
            $stock->takeForSale($quantities, $products, $sale, $request->user()->id);

            // Atomic debit of the credit note: same rollback guarantee as the stock.
            if ($creditAmount > 0) {
                $creditNotes->redeem((string) $data['credit_note_code'], $creditAmount, $sale);
            }

            return $sale;
        });

        $sale->load('client:id,name');

        return redirect('/')
            ->with('success', "Vente #{$sale->id} enregistrée avec succès.")
            // Read by the Sales page to open the purchase confirmation modal.
            ->with('sale', [
                'id' => $sale->id,
                'client' => $sale->client?->name,
                'subtotal' => (float) $sale->subtotal,
                'remise' => (float) $sale->remise,
                'total' => (float) $sale->total,
                'credit_note_amount' => (float) $sale->credit_note_amount,
                'payment_method' => $sale->payment_method,
                'items_count' => (int) array_sum($quantities),
                'created_at' => $sale->created_at?->toIso8601String(),
            ]);
    }

    public function show(Request $request, ReturnService $returnService, string $id): Response
    {
        // Cancelled sales stay readable (history, audit): they are only excluded from the figures.
        $sale = Sale::with(['client:id,name,email,phone', 'user:id,name', 'canceller:id,name', 'cancelApprover:id,name'])
            ->findOrFail($id);

        $returned = $returnService->returnedQuantities($sale);

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
                'returned' => $returned[$item->id] ?? 0,
                'remaining' => (int) $item->quantity - ($returned[$item->id] ?? 0),
                'price' => (float) $item->unit_price,
                'line_total' => (float) $item->line_total,
            ]);

        $returns = $sale->returns()
            ->with(['user:id,name', 'approver:id,name', 'creditNote:id,code,sale_return_id,amount,balance', 'items'])
            ->latest('id')
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'reason' => $r->reason,
                'refund_method' => $r->refund_method,
                'amount' => (float) $r->amount,
                'user' => $r->user?->name,
                'approved_by' => $r->approver?->name,
                'credit_note' => $r->creditNote ? ['id' => $r->creditNote->id, 'code' => $r->creditNote->code, 'balance' => (float) $r->creditNote->balance] : null,
                'items_count' => (int) $r->items->sum('quantity'),
                'created_at' => $r->created_at?->toIso8601String(),
            ]);

        $refunded = (float) $returns->sum('amount');

        return Inertia::render('Sales/Show', [
            'can' => [
                // Whether the current user needs a manager to type their credentials.
                'needs_approval' => ! $request->user()->isManager(),
                'cancel' => $sale->canBeCancelled(),
                'return' => ! $sale->isCancelled() && collect($items)->contains(fn ($i) => $i['remaining'] > 0),
            ],
            'returns' => $returns,
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
                'display_status' => $this->displayStatus($sale, $refunded),
                'refunded' => $refunded,
                'credit_note_amount' => (float) $sale->credit_note_amount,
                'payment_method' => $sale->payment_method,
                'cancel_reason' => $sale->cancel_reason,
                'cancelled_at' => $sale->cancelled_at?->toIso8601String(),
                'cancelled_by' => $sale->canceller?->name,
                'cancel_approved_by' => $sale->cancelApprover?->name,
                'created_at' => $sale->created_at?->toIso8601String(),
            ],
            'items' => $items,
        ]);
    }

    public function export()
    {
        return Excel::download(new SaleExport, 'ventes-'.now()->format('Y-m-d').'.xlsx');
    }

    public function invoice(Request $request, string $id): HttpResponse
    {
        [$sale, $items] = $this->loadSaleWithItems($id);

        $pdf = Pdf::loadView('invoices.sale', ['sale' => $sale, 'items' => $items, 'settings' => Settings::current()])->setPaper('a4');
        $filename = "facture-{$sale->id}.pdf";

        return $request->boolean('stream')
            ? $pdf->stream($filename)
            : $pdf->download($filename);
    }

    /**
     * Thermal receipt (58/80 mm roll) as printable HTML.
     * ?format=58mm|80mm overrides the shop setting, ?recu= shows the change due.
     */
    public function ticket(Request $request, string $id): HttpResponse
    {
        [$sale, $items] = $this->loadSaleWithItems($id);
        $settings = Settings::current();

        $format = $request->query('format');
        if (! in_array($format, ['58mm', '80mm'], true)) {
            $format = $settings->paper_size === '58mm' ? '58mm' : '80mm';
        }

        $received = $request->query('recu');
        $received = is_numeric($received) && (float) $received > 0 ? (float) $received : null;

        return response()->view('invoices.ticket', [
            'sale' => $sale,
            'items' => $items,
            'settings' => $settings,
            'format' => $format,
            'received' => $received,
            // Cash due = total minus the part paid with a credit note.
            'change' => $received !== null ? max(0, $received - max(0, (float) $sale->total - (float) $sale->credit_note_amount)) : null,
        ]);
    }

    /**
     * @return array{0: Sale, 1: array<int, array{product_name: string, quantity: int, price: float, line_total: float}>}
     */
    private function loadSaleWithItems(string $id): array
    {
        // Cancelled sales can still be printed (stamped "ANNULÉ" on the document).
        $sale = Sale::with(['client:id,name,email,phone', 'user:id,name'])
            ->findOrFail($id);

        $items = SaleItem::where('sale_id', $id)
            ->leftJoin('products', 'products.id', '=', 'sale_items.product_id')
            ->select(
                'sale_items.id',
                'products.name as product_name',
                'sale_items.quantity',
                'sale_items.unit_price as price',
                'sale_items.line_total'
            )
            ->get()
            ->map(fn ($item) => [
                'product_name' => $item->product_name ?? 'Article',
                'quantity' => (int) $item->quantity,
                'price' => (float) $item->price,
                'line_total' => (float) $item->line_total,
            ])
            ->all();

        return [$sale, $items];
    }
}
