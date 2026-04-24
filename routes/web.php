<?php

use App\Http\Controllers\ClientController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportController;
use App\Models\Product;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;


Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/', function () {
        $categories = [
            ['id' => 'all', 'label' => 'Tout'],
            ['id' => 'bureaux', 'label' => 'Bureaux'],
            ['id' => 'rangement_bureau', 'label' => 'Rangement'],
            ['id' => 'bureaux_direction', 'label' => 'Bureaux Direction'],
            ['id' => 'bureaux_compacts', 'label' => 'Bureaux Compacts'],
            ['id' => 'bureaux_ergonomiques', 'label' => 'Bureaux Ergonomiques'],
            ['id' => 'bureaux_gaming', 'label' => 'Bureaux Gaming'],
            ['id' => 'mobilier_professionnel', 'label' => 'Mobilier Pro'],
            ['id' => 'bureaux_partages', 'label' => 'Bureaux Partagés'],
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
    Route::post('/produits/upload-image', [ProductController::class, 'uploadImage'])->name('products.uploadImage');
    Route::put('/produits/{product}', [ProductController::class, 'update'])->name('products.update');
    Route::delete('/produits/{product}', [ProductController::class, 'destroy'])->name('products.destroy');

    Route::get('/clients', [ClientController::class, 'index'])->name('clients.index');
    Route::post('/clients', [ClientController::class, 'store'])->name('clients.store');
    Route::put('/clients/{client}', [ClientController::class, 'update'])->name('clients.update');
    Route::delete('/clients/{client}', [ClientController::class, 'destroy'])->name('clients.destroy');

    Route::get('/rapports', [ReportController::class, 'index'])->name('reports.index');

    Route::get('/parametres', fn () => Inertia::render('Settings/Index'));

    Route::get('/profile', [ProfileController::class, 'index'])->name('profile.index');
    Route::get('/profile/password', [ProfileController::class, 'password'])->name('profile.password');
});

Route::middleware(['auth'])->group(function () {
    Route::post('/logout', [ProfileController::class, 'logout'])->name('logout');
});
