<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\CreditNote;
use App\Models\Settings;
use App\Services\CreditNoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class CreditNoteController extends Controller
{
    /** GET /avoirs */
    public function index(Request $request): InertiaResponse
    {
        $query = CreditNote::query()->with('client:id,name')->latest('id');

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', '%'.$search.'%')
                    ->orWhereHas('client', fn ($c) => $c->where('name', 'like', '%'.$search.'%'));
            });
        }

        if ($request->input('status') === 'open') {
            $query->where('balance', '>', 0);
        }

        $notes = $query->paginate(20)->withQueryString();
        $notes->getCollection()->transform(fn (CreditNote $n) => [
            'id' => $n->id,
            'code' => $n->code,
            'client' => $n->client?->name,
            'amount' => (float) $n->amount,
            'balance' => (float) $n->balance,
            'created_at' => $n->created_at?->toIso8601String(),
        ]);

        return Inertia::render('CreditNotes/Index', [
            'notes' => $notes,
            'filters' => ['search' => $request->input('search', ''), 'status' => $request->input('status', 'all')],
            'totals' => [
                'outstanding' => round((float) CreditNote::query()->sum('balance'), 2),
                'open' => CreditNote::query()->where('balance', '>', 0)->count(),
            ],
        ]);
    }

    /** GET /avoirs/lookup?code= — used by the till before paying with a credit note. */
    public function lookup(Request $request, CreditNoteService $service): JsonResponse
    {
        $note = $service->find((string) $request->query('code', ''));

        if (! $note) {
            return response()->json(['message' => __('returns.credit_not_found')], 404);
        }

        return response()->json([
            'code' => $note->code,
            'balance' => (float) $note->balance,
            'amount' => (float) $note->amount,
            'client' => $note->client?->name,
        ]);
    }

    /** GET /avoirs/{creditNote}/ticket — thermal credit note slip. */
    public function ticket(Request $request, CreditNote $creditNote): Response
    {
        $creditNote->load(['client:id,name', 'saleReturn.sale:id']);

        $settings = Settings::current();
        $format = $request->query('format');
        if (! in_array($format, ['58mm', '80mm'], true)) {
            $format = $settings->paper_size === '58mm' ? '58mm' : '80mm';
        }

        return response()->view('invoices.credit-note-ticket', [
            'note' => $creditNote,
            'settings' => $settings,
            'format' => $format,
        ]);
    }
}
