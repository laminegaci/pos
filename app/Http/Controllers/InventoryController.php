<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exports\InventoryExport;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\InventoryLine;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class InventoryController extends Controller
{
    public function index(Request $request): Response
    {
        $inventories = Inventory::query()->with('user:id,name')->latest('id')->get()->map(function (Inventory $i) {
            $lines = $i->lines()->get(['expected_qty', 'counted_qty', 'unit_cost']);
            $counted = $lines->whereNotNull('counted_qty');

            return [
                'id' => $i->id,
                'reference' => $i->reference,
                'status' => $i->status,
                'category_slug' => $i->category_slug,
                'user' => $i->user?->name,
                'created_at' => $i->created_at?->toIso8601String(),
                'validated_at' => $i->validated_at?->toIso8601String(),
                'lines_total' => $lines->count(),
                'lines_counted' => $counted->count(),
                'gap_qty' => (int) $counted->sum(fn ($l) => $l->counted_qty - $l->expected_qty),
                'gap_value' => round((float) $counted->sum(fn ($l) => ($l->counted_qty - $l->expected_qty) * (float) $l->unit_cost), 2),
            ];
        });

        return Inertia::render('Inventories/Index', [
            'inventories' => $inventories,
            'categories' => Category::options(),
            'canManage' => $request->user()->canManageStock(),
        ]);
    }

    public function store(Request $request, InventoryService $service): RedirectResponse
    {
        abort_unless($request->user()->canManageStock(), 403);
        $data = $request->validate(['category_slug' => ['nullable', 'string', Rule::exists('categories', 'slug')]]);

        $inventory = $service->start($data['category_slug'] ?? null, $request->user());

        return redirect()->route('inventories.show', $inventory);
    }

    public function show(Request $request, Inventory $inventory): Response
    {
        $lines = $inventory->lines()->with('product:id,name,sku,barcode,image,category_id')->get()
            ->sortBy(fn ($l) => mb_strtolower((string) $l->product?->name))->values();

        return Inertia::render('Inventories/Show', [
            'inventory' => [
                'id' => $inventory->id,
                'reference' => $inventory->reference,
                'status' => $inventory->status,
                'category_slug' => $inventory->category_slug,
                'created_at' => $inventory->created_at?->toIso8601String(),
                'validated_at' => $inventory->validated_at?->toIso8601String(),
            ],
            'lines' => $lines,
            'canManage' => $request->user()->canManageStock(),
        ]);
    }

    /** Auto-save of one count (JSON). An empty value clears the count. */
    public function count(Request $request, Inventory $inventory, InventoryLine $line): JsonResponse
    {
        abort_unless($line->inventory_id === $inventory->id, 404);
        abort_unless($inventory->isDraft(), 422, __('stock.inventory_closed'));

        $data = $request->validate(['counted_qty' => 'nullable|integer|min:0|max:10000000']);
        $counted = $data['counted_qty'] ?? null;

        $line->update([
            'counted_qty' => $counted,
            'counted_by' => $counted === null ? null : $request->user()->id,
            'counted_at' => $counted === null ? null : now(),
        ]);

        return response()->json(['line' => $line->fresh()]);
    }

    public function validateInventory(Request $request, Inventory $inventory, InventoryService $service): RedirectResponse
    {
        abort_unless($request->user()->canManageStock(), 403);
        $data = $request->validate(['uncounted' => ['required', Rule::in([InventoryService::KEEP, InventoryService::ZERO])]]);

        $service->validate($inventory, $request->user(), $data['uncounted']);

        return redirect()->route('inventories.show', $inventory)->with('success', 'Inventaire validé');
    }

    public function cancel(Request $request, Inventory $inventory, InventoryService $service): RedirectResponse
    {
        abort_unless($request->user()->canManageStock(), 403);
        $service->cancel($inventory);

        return redirect()->route('inventories.index')->with('success', 'Inventaire annulé');
    }

    public function export(Inventory $inventory)
    {
        return Excel::download(new InventoryExport($inventory), $inventory->reference.'.xlsx');
    }
}
