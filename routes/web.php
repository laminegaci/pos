<?php

use App\Http\Controllers\ProductController;
use App\Models\Product;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    $categories = [
        ['id' => 'all', 'label' => 'Tout'],
        ['id' => 'plaques', 'label' => 'Plaques'],
        ['id' => 'profiles', 'label' => 'Profilés'],
        ['id' => 'visserie', 'label' => 'Visserie'],
        ['id' => 'enduits', 'label' => 'Enduits'],
        ['id' => 'peintures', 'label' => 'Peintures'],
        ['id' => 'accessoires', 'label' => 'Accessoires'],
    ];

    $products = Product::where('active', true)->get()->map(function ($p) {
        return [
            'id' => $p->id,
            'name' => $p->name,
            'description' => $p->description,
            'price' => (float) $p->price,
            'category_id' => $p->category_id,
            'image' => $p->image ?: "https://picsum.photos/seed/{$p->sku}/400/300",
            'stock' => $p->stock,
        ];
    });

    return Inertia::render('Sales/Index', [
        'user' => ['name' => 'Yacine Demo', 'role' => 'Caissier', 'initials' => 'YD'],
        'caisse' => ['number' => '01', 'status' => 'open'],
        'categories' => $categories,
        'products' => $products,
    ]);
});

Route::get('/scan', function () {
    $products = Product::where('active', true)->get()->map(function ($p) {
        return [
            'id' => $p->id,
            'name' => $p->name,
            'description' => $p->description,
            'price' => (float) $p->price,
            'category_id' => $p->category_id,
            'sku' => $p->sku,
            'stock' => $p->stock,
        ];
    });

    return Inertia::render('Scan/Index', [
        'products' => $products,
    ]);
});

Route::get('/produits', [ProductController::class, 'index'])->name('products.index');
Route::post('/produits', [ProductController::class, 'store'])->name('products.store');
Route::put('/produits/{product}', [ProductController::class, 'update'])->name('products.update');
Route::delete('/produits/{product}', [ProductController::class, 'destroy'])->name('products.destroy');

foreach ([
    '/rapports' => 'Rapports',
    '/clients' => 'Clients',
    '/parametres' => 'Paramètres',
] as $path => $title) {
    Route::get($path, fn () => Inertia::render('Stub', ['title' => $title]));
}
