<?php

use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\CreditNoteController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\SaleReturnController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\UserController;
use App\Models\Category;
use App\Models\Client;
use App\Models\Product;
use App\Models\Settings;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/', function () {
        $categories = [['id' => 'all', 'label' => 'Tout'], ...Category::options()];

        $products = Product::where('active', true)->get()->map(function ($p) {
            return [
                'id' => $p->id,
                'name' => $p->name,
                'description' => $p->description,
                'price' => (float) $p->price,
                'category_id' => $p->category_id,
                'barcode' => $p->barcode,
                'sku' => $p->sku,
                'image' => $p->image ?: "https://picsum.photos/seed/{$p->sku}/400/300",
                'stock' => $p->stock,
                'unlimited_stock' => (bool) $p->unlimited_stock,
            ];
        });

        $clients = Client::where('active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'phone'])
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'phone' => $c->phone,
            ]);

        return Inertia::render('Sales/Index', [
            'caisse' => ['number' => '01', 'status' => 'open'],
            'categories' => $categories,
            'products' => $products,
            'clients' => $clients,
            'printAuto' => (bool) Settings::current()->print_auto,
            'paperSize' => Settings::current()->paper_size,
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
                'barcode' => $p->barcode,
                'stock' => $p->stock,
                'unlimited_stock' => (bool) $p->unlimited_stock,
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
    Route::get('/produits/{product}/mouvements', [ProductController::class, 'movements'])->name('products.movements');
    Route::post('/produits/generer-ean', [ProductController::class, 'generateEan'])->name('products.generateEan');
    Route::get('/produits/etiquettes', [ProductController::class, 'labels'])->name('products.labels');
    Route::get('/produits/export', [ProductController::class, 'export'])->name('products.export');

    Route::post('/categories', [CategoryController::class, 'store'])->name('categories.store');
    Route::put('/categories/{category}', [CategoryController::class, 'update'])->name('categories.update');
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy');

    Route::get('/clients', [ClientController::class, 'index'])->name('clients.index');
    Route::post('/clients', [ClientController::class, 'store'])->name('clients.store');
    Route::put('/clients/{client}', [ClientController::class, 'update'])->name('clients.update');
    Route::delete('/clients/{client}', [ClientController::class, 'destroy'])->name('clients.destroy');
    Route::get('/clients/export', [ClientController::class, 'export'])->name('clients.export');

    Route::get('/recherche', SearchController::class)->name('search');

    Route::get('/rapports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('/ventes/export', [SaleController::class, 'export'])->name('sales.export');
    Route::get('/ventes', [SaleController::class, 'index'])->name('sales.index');
    Route::post('/ventes', [SaleController::class, 'store'])->name('sales.store');
    Route::get('/ventes/{sale}', [SaleController::class, 'show'])->name('sales.show');
    Route::get('/ventes/{sale}/facture', [SaleController::class, 'invoice'])->name('sales.invoice');
    Route::get('/ventes/{sale}/ticket', [SaleController::class, 'ticket'])->name('sales.ticket');

    // Cancellation and returns (a cashier needs a manager's credentials, see ApprovalService).
    Route::post('/ventes/{sale}/annuler', [SaleReturnController::class, 'cancel'])->name('sales.cancel');
    Route::post('/ventes/{sale}/retours', [SaleReturnController::class, 'store'])->name('sales.returns.store');
    Route::get('/retours/{return}/ticket', [SaleReturnController::class, 'ticket'])->name('returns.ticket');

    Route::get('/avoirs', [CreditNoteController::class, 'index'])->name('credit-notes.index');
    Route::get('/avoirs/lookup', [CreditNoteController::class, 'lookup'])->name('credit-notes.lookup');
    Route::get('/avoirs/{creditNote}/ticket', [CreditNoteController::class, 'ticket'])->name('credit-notes.ticket');

    Route::get('/parametres', [UserController::class, 'settings'])->name('settings.index');
    Route::put('/parametres', [UserController::class, 'updateSettings'])->name('settings.update');
    Route::post('/parametres/logo', [UserController::class, 'uploadLogo'])->name('settings.logo.upload');
    Route::delete('/parametres/logo', [UserController::class, 'deleteLogo'])->name('settings.logo.delete');
    Route::put('/parametres/utilisateurs/{user}/role', [UserController::class, 'updateRole'])->name('settings.users.role');

    Route::get('/profile', [ProfileController::class, 'index'])->name('profile.index');
    Route::get('/profile/password', [ProfileController::class, 'password'])->name('profile.password');
});

Route::middleware(['auth'])->group(function () {
    Route::post('/logout', [ProfileController::class, 'logout'])->name('logout');
});
