<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Client;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\SaleReturnItem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    /** Total refunded through returns in [from, to] (refunds count the day they are made). */
    private function returned(Carbon $from, ?Carbon $to = null): float
    {
        return (float) SaleReturn::query()
            ->where('created_at', '>=', $from)
            ->when($to, fn ($q) => $q->where('created_at', '<=', $to))
            ->sum('amount');
    }

    public function index(): Response
    {
        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $startOfPrevMonth = $now->copy()->subMonthNoOverflow()->startOfMonth();
        $endOfPrevMonth = $now->copy()->subMonthNoOverflow()->endOfMonth();
        $startOfToday = $now->copy()->startOfDay();

        // KPIs globaux
        $revenueMonth = (float) Sale::where('status', 'completed')
            ->where('created_at', '>=', $startOfMonth)
            ->sum('total');
        $returnedMonth = $this->returned($startOfMonth);
        $revenueMonth -= $returnedMonth;

        $revenuePrevMonth = (float) Sale::where('status', 'completed')
            ->whereBetween('created_at', [$startOfPrevMonth, $endOfPrevMonth])
            ->sum('total');
        $revenuePrevMonth -= $this->returned($startOfPrevMonth, $endOfPrevMonth);

        $revenueToday = (float) Sale::where('status', 'completed')
            ->where('created_at', '>=', $startOfToday)
            ->sum('total');
        $revenueToday -= $this->returned($startOfToday);

        $salesCountMonth = Sale::where('status', 'completed')
            ->where('created_at', '>=', $startOfMonth)
            ->count();

        $salesCountToday = Sale::where('status', 'completed')
            ->where('created_at', '>=', $startOfToday)
            ->count();

        $avgBasket = $salesCountMonth > 0 ? $revenueMonth / $salesCountMonth : 0;

        $revenueGrowth = $revenuePrevMonth > 0
            ? (($revenueMonth - $revenuePrevMonth) / $revenuePrevMonth) * 100
            : null;

        // CA des 30 derniers jours — granularité journalière
        $daily = Sale::where('status', 'completed')
            ->where('created_at', '>=', $now->copy()->subDays(29)->startOfDay())
            ->select(DB::raw('DATE(created_at) as day'), DB::raw('SUM(total) as total'), DB::raw('COUNT(*) as count'))
            ->groupBy('day')
            ->orderBy('day')
            ->get()
            ->keyBy('day');

        $dailyReturns = SaleReturn::query()
            ->where('created_at', '>=', $now->copy()->subDays(29)->startOfDay())
            ->select(DB::raw('DATE(created_at) as day'), DB::raw('SUM(amount) as total'))
            ->groupBy('day')
            ->pluck('total', 'day');

        $days = [];
        for ($i = 29; $i >= 0; $i--) {
            $d = $now->copy()->subDays($i)->format('Y-m-d');
            $row = $daily->get($d);
            $days[] = [
                'date' => $d,
                'label' => Carbon::parse($d)->format('d/m'),
                'total' => (float) ($row->total ?? 0) - (float) ($dailyReturns[$d] ?? 0),
                'count' => (int) ($row->count ?? 0),
            ];
        }

        // Refunds of the last 30 days, to subtract from the rankings below.
        $window = $now->copy()->subDays(29)->startOfDay();
        $returnedByProduct = SaleReturnItem::query()
            ->join('sale_returns', 'sale_returns.id', '=', 'sale_return_items.sale_return_id')
            ->where('sale_returns.created_at', '>=', $window)
            ->groupBy('sale_return_items.product_id')
            ->select('sale_return_items.product_id', DB::raw('SUM(sale_return_items.quantity) as qty'), DB::raw('SUM(sale_return_items.line_total) as revenue'))
            ->get()
            ->keyBy('product_id');
        $returnedByCategory = SaleReturnItem::query()
            ->join('sale_returns', 'sale_returns.id', '=', 'sale_return_items.sale_return_id')
            ->join('products', 'products.id', '=', 'sale_return_items.product_id')
            ->where('sale_returns.created_at', '>=', $window)
            ->groupBy('products.category_id')
            ->select('products.category_id', DB::raw('SUM(sale_return_items.line_total) as revenue'))
            ->pluck('revenue', 'category_id');
        $returnedByClient = SaleReturn::query()
            ->join('sales', 'sales.id', '=', 'sale_returns.sale_id')
            ->where('sale_returns.created_at', '>=', $window)
            ->whereNotNull('sales.client_id')
            ->groupBy('sales.client_id')
            ->select('sales.client_id', DB::raw('SUM(sale_returns.amount) as amount'))
            ->pluck('amount', 'client_id');

        // Top produits (30j)
        $topProducts = SaleItem::query()
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->where('sales.status', 'completed')
            ->where('sales.created_at', '>=', $now->copy()->subDays(29)->startOfDay())
            ->select(
                'products.id',
                'products.name',
                'products.category_id',
                DB::raw('SUM(sale_items.quantity) as qty'),
                DB::raw('SUM(sale_items.line_total) as revenue')
            )
            ->groupBy('products.id', 'products.name', 'products.category_id')
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'category_id' => $r->category_id,
                'qty' => (int) $r->qty - (int) ($returnedByProduct[$r->id]->qty ?? 0),
                'revenue' => (float) $r->revenue - (float) ($returnedByProduct[$r->id]->revenue ?? 0),
            ])
            ->sortByDesc('revenue')
            ->take(8)
            ->values();

        // Répartition par catégorie (30j)
        $byCategory = SaleItem::query()
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->where('sales.status', 'completed')
            ->where('sales.created_at', '>=', $now->copy()->subDays(29)->startOfDay())
            ->select('products.category_id', DB::raw('SUM(sale_items.line_total) as revenue'))
            ->groupBy('products.category_id')
            ->get()
            ->map(fn ($r) => [
                'category_id' => $r->category_id,
                'revenue' => (float) $r->revenue - (float) ($returnedByCategory[$r->category_id] ?? 0),
            ])
            ->sortByDesc('revenue')
            ->values();

        // Top clients (30j)
        $topClients = Sale::query()
            ->join('clients', 'clients.id', '=', 'sales.client_id')
            ->where('sales.status', 'completed')
            ->where('sales.created_at', '>=', $now->copy()->subDays(29)->startOfDay())
            ->select('clients.id', 'clients.name', 'clients.type', DB::raw('SUM(sales.total) as revenue'), DB::raw('COUNT(*) as count'))
            ->groupBy('clients.id', 'clients.name', 'clients.type')
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'type' => $r->type,
                'revenue' => (float) $r->revenue - (float) ($returnedByClient[$r->id] ?? 0),
                'count' => (int) $r->count,
            ])
            ->sortByDesc('revenue')
            ->take(5)
            ->values();

        // Ventes récentes
        $recentSales = Sale::with(['client:id,name', 'user:id,name'])
            ->where('status', 'completed')
            ->orderByDesc('created_at')
            ->limit(8)
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'client' => $s->client?->name,
                'user' => $s->user?->name,
                'total' => (float) $s->total,
                'created_at' => $s->created_at?->toIso8601String(),
            ]);

        // Alertes stock
        $lowStock = Product::where('active', true)
            ->where('unlimited_stock', false)
            ->where('stock', '<', 10)
            ->orderBy('stock')
            ->limit(6)
            ->get(['id', 'name', 'stock', 'category_id'])
            ->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'stock' => (int) $p->stock,
                'category_id' => $p->category_id,
            ]);

        return Inertia::render('Reports/Index', [
            'categories' => Category::options(),
            'kpis' => [
                'revenueMonth' => $revenueMonth,
                'returnedMonth' => $returnedMonth,
                'revenueToday' => $revenueToday,
                'salesCountMonth' => $salesCountMonth,
                'salesCountToday' => $salesCountToday,
                'avgBasket' => $avgBasket,
                'revenueGrowth' => $revenueGrowth,
                'clientsCount' => Client::count(),
                'productsCount' => Product::where('active', true)->count(),
            ],
            'daily' => $days,
            'topProducts' => $topProducts,
            'byCategory' => $byCategory,
            'topClients' => $topClients,
            'recentSales' => $recentSales,
            'lowStock' => $lowStock,
        ]);
    }
}
