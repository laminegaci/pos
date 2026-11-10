<?php

namespace App\Http\Middleware;

use App\Models\Product;
use App\Models\Settings;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'shop' => function () {
                $settings = Settings::current();

                return [
                    'currency' => $settings->currency,
                    'currencySymbol' => $settings->currencySymbol(),
                    'theme' => $settings->theme,
                    'sessionTimeout' => (int) $settings->session_timeout,
                    'paymentMethods' => $settings->enabledPaymentMethods(),
                ];
            },
            'stockAlerts' => function () use ($request) {
                if (! $request->user() || ! Settings::current()->notif_low_stock) {
                    return null;
                }

                $query = Product::query()->lowStock();

                return [
                    'count' => (clone $query)->count(),
                    'items' => $query->orderBy('stock')->limit(5)
                        ->get(['id', 'name', 'stock', 'min_stock'])
                        ->map(fn (Product $p) => [
                            'id' => $p->id,
                            'name' => $p->name,
                            'stock' => $p->stock,
                            'min' => $p->effective_min_stock,
                        ])->all(),
                ];
            },
            'locale' => $request->session()->get('locale', app()->getLocale()),
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'sale' => fn () => $request->session()->get('sale'),
                'return' => fn () => $request->session()->get('return'),
            ],
        ];
    }
}
