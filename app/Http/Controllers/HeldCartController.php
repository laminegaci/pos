<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\HeldCart;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * "Tickets en attente": the till puts a cart aside and serves the next customer.
 * JSON only: the till keeps its state client-side and must not reload its props.
 */
class HeldCartController extends Controller
{
    public function index(): JsonResponse
    {
        // Lazy purge: no scheduler needed, yesterday's tickets disappear on the next look.
        HeldCart::purgeExpired();

        $carts = HeldCart::query()->today()->with(['user:id,name', 'client:id,name'])->latest('id')->get()
            ->map(fn (HeldCart $c) => [
                'id' => $c->id,
                'label' => $c->label,
                'user' => $c->user?->name,
                'client' => $c->client?->name,
                'items_count' => $c->items_count,
                'total' => (float) $c->total,
                'created_at' => $c->created_at?->toIso8601String(),
            ]);

        return response()->json(['carts' => $carts]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'discount' => ['nullable', 'array'],
            'discount.type' => ['required_with:discount', Rule::in(['amount', 'percent'])],
            'discount.value' => ['nullable', 'numeric', 'min:0'],
            'label' => ['nullable', 'string', 'max:60'],
        ]);

        // Same product twice => one line.
        $quantities = [];
        foreach ($data['items'] as $item) {
            $id = (int) $item['product_id'];
            $quantities[$id] = ($quantities[$id] ?? 0) + (int) $item['quantity'];
        }

        // Total at hold time, for the list only (same discount rule as the till and SaleController::store).
        $prices = Product::query()->whereIn('id', array_keys($quantities))->pluck('price', 'id');
        $subtotal = 0.0;
        foreach ($quantities as $id => $qty) {
            $subtotal += (float) $prices[$id] * $qty;
        }
        $discount = [
            'type' => $data['discount']['type'] ?? 'amount',
            'value' => (float) ($data['discount']['value'] ?? 0),
        ];
        $remise = $discount['type'] === 'percent' ? $subtotal * $discount['value'] / 100 : $discount['value'];
        $remise = min($subtotal, round($remise, 2));

        $cart = HeldCart::query()->create([
            'user_id' => $request->user()->id,
            'client_id' => $data['client_id'] ?? null,
            'label' => filled($data['label'] ?? null) ? trim($data['label']) : null,
            'items' => collect($quantities)->map(fn ($q, $id) => ['product_id' => $id, 'quantity' => $q])->values()->all(),
            'discount' => $discount,
            'items_count' => array_sum($quantities),
            'total' => max(0, round($subtotal - $remise, 2)),
        ]);

        return response()->json(['cart' => ['id' => $cart->id]], 201);
    }

    /** Takes the ticket back to the till. Atomic: two tills cannot resume the same ticket. */
    public function resume(int $heldCart): JsonResponse
    {
        $cart = DB::transaction(function () use ($heldCart) {
            $cart = HeldCart::query()->whereKey($heldCart)->lockForUpdate()->first();
            if (! $cart) {
                return null;
            }
            $deleted = HeldCart::query()->whereKey($cart->id)->delete();

            return $deleted ? $cart : null;
        });

        if (! $cart) {
            return response()->json(['message' => __('sales_hold.already_resumed')], 404);
        }

        $products = Product::query()->whereIn('id', collect($cart->items)->pluck('product_id'))->get()->keyBy('id');

        return response()->json([
            'client_id' => $cart->client_id,
            'discount' => $cart->discount,
            'label' => $cart->label,
            'lines' => collect($cart->items)->map(function ($line) use ($products) {
                $p = $products[$line['product_id']] ?? null;

                return [
                    'product_id' => (int) $line['product_id'],
                    'quantity' => (int) $line['quantity'],
                    'name' => $p?->name,
                    'active' => (bool) ($p?->active ?? false),
                    // null = unlimited stock (no cap).
                    'available' => $p ? ($p->unlimited_stock ? null : (int) $p->stock) : 0,
                ];
            })->values(),
        ]);
    }

    public function destroy(int $heldCart): JsonResponse
    {
        HeldCart::query()->whereKey($heldCart)->delete();

        return response()->json(['ok' => true]);
    }
}
