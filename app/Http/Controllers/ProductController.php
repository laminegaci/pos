<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(): Response
    {
        $products = Product::orderBy('created_at', 'desc')->get();
        $categories = [
            ['id' => 'plaques', 'label' => 'Plaques'],
            ['id' => 'profiles', 'label' => 'Profilés'],
            ['id' => 'visserie', 'label' => 'Visserie'],
            ['id' => 'enduits', 'label' => 'Enduits'],
            ['id' => 'peintures', 'label' => 'Peintures'],
            ['id' => 'accessoires', 'label' => 'Accessoires'],
        ];

        return Inertia::render('Products/Index', [
            'products' => $products,
            'categories' => $categories,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'category_id' => 'required|string',
            'stock' => 'required|integer|min:0',
            'sku' => 'nullable|string|max:255',
            'image' => 'nullable|string',
            'active' => 'boolean',
        ]);

        Product::create($validated);

        return redirect()->route('products.index')->with('success', 'Produit créé avec succès');
    }

    public function update(Request $request, Product $product): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'category_id' => 'required|string',
            'stock' => 'required|integer|min:0',
            'sku' => 'nullable|string|max:255',
            'image' => 'nullable|string',
            'active' => 'boolean',
        ]);

        $product->update($validated);

        return redirect()->route('products.index')->with('success', 'Produit mis à jour avec succès');
    }

    public function destroy(Product $product): RedirectResponse
    {
        if ($product->image && str_starts_with($product->image, '/storage/')) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $product->image));
        }
        $product->delete();

        return redirect()->route('products.index')->with('success', 'Produit supprimé avec succès');
    }

    public function uploadImage(Request $request): array
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        $path = $request->file('image')->store('products', 'public');

        return [
            'url' => '/storage/'.$path,
        ];
    }
}
