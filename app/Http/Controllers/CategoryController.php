<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CategoryController extends Controller
{
    /**
     * @return array<string, mixed>
     */
    private function rules(?Category $category = null): array
    {
        return [
            'name' => ['required', 'string', 'max:100', Rule::unique('categories', 'name')->ignore($category?->id)],
            'color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ];
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validateWithBag('category', $this->rules());
        $name = trim($data['name']);

        Category::query()->create([
            'slug' => Category::uniqueSlug($name),
            'name' => $name,
            'color' => $data['color'] ?? Category::COLORS[Category::query()->count() % count(Category::COLORS)],
            'sort_order' => (int) Category::query()->max('sort_order') + 1,
        ]);

        return back()->with('success', __('categories.created'));
    }

    public function update(Request $request, Category $category): RedirectResponse
    {
        $data = $request->validateWithBag('category', $this->rules($category));

        // The slug never changes: products reference it.
        $category->update(['name' => trim($data['name']), 'color' => $data['color'] ?? $category->color]);

        return back()->with('success', __('categories.updated'));
    }

    public function destroy(Category $category): RedirectResponse
    {
        $count = Product::query()->where('category_id', $category->slug)->count();
        if ($count > 0) {
            throw ValidationException::withMessages(['category' => __('categories.in_use', ['count' => $count])])
                ->errorBag('category');
        }

        $category->delete();

        return back()->with('success', __('categories.deleted'));
    }
}
