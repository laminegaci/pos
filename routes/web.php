<?php

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

    $products = [
        ['id' => 'plaque-ba13-standard', 'name' => 'Plaque BA13 Standard', 'description' => '13mm - 2,50m x 1,20m', 'price' => 450, 'category_id' => 'plaques'],
        ['id' => 'plaque-ba13-hydro', 'name' => 'Plaque BA13 Hydro', 'description' => '13mm - Hydrofuge', 'price' => 520, 'category_id' => 'plaques'],
        ['id' => 'plaque-ba13-feu', 'name' => 'Plaque BA13 Feu', 'description' => '13mm - Anti-feu', 'price' => 560, 'category_id' => 'plaques'],
        ['id' => 'montant-m48', 'name' => 'Montant M48', 'description' => '48mm - 3m', 'price' => 180, 'category_id' => 'profiles'],
        ['id' => 'rail-r48', 'name' => 'Rail R48', 'description' => '48mm - 3m', 'price' => 150, 'category_id' => 'profiles'],
        ['id' => 'vis-ttpc-25', 'name' => 'Vis TTPC 25mm', 'description' => 'Boîte 100 pcs', 'price' => 350, 'category_id' => 'visserie'],
        ['id' => 'enduit-jointoyage-pret', 'name' => 'Enduit Jointoyage', 'description' => '25kg - Prêt à l\'emploi', 'price' => 1850, 'category_id' => 'enduits'],
        ['id' => 'enduit-jointoyage-finition', 'name' => 'Enduit Jointoyage', 'description' => '25kg - Finition', 'price' => 1720, 'category_id' => 'enduits'],
        ['id' => 'bande-joint', 'name' => 'Bande à Joint', 'description' => '50mm × 30m', 'price' => 320, 'category_id' => 'accessoires'],
        ['id' => 'cheville-frapper', 'name' => 'Cheville à Frapper', 'description' => '6×40mm - 100 pcs', 'price' => 280, 'category_id' => 'visserie'],
        ['id' => 'peinture-mat-blanc', 'name' => 'Peinture Mat Blanc', 'description' => '10L - Intérieur', 'price' => 3200, 'category_id' => 'peintures'],
        ['id' => 'cale-poncer', 'name' => 'Cale à Poncer', 'description' => 'Manuelle - 210×105', 'price' => 150, 'category_id' => 'accessoires'],
    ];

    $products = array_map(function ($p) {
        $p['image'] = "https://picsum.photos/seed/{$p['id']}/400/300";
        return $p;
    }, $products);

    return Inertia::render('Sales/Index', [
        'user' => ['name' => 'Yacine Demo', 'role' => 'Caissier', 'initials' => 'YD'],
        'caisse' => ['number' => '01', 'status' => 'open'],
        'categories' => $categories,
        'products' => $products,
    ]);
});
