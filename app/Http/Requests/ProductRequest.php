<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Product;
use App\Support\Ean13;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * With unlimited stock the quantity is irrelevant, so it may be left empty.
     */
    protected function prepareForValidation(): void
    {
        if ($this->boolean('unlimited_stock') && ! is_numeric($this->input('stock'))) {
            $this->merge(['stock' => 0]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'vat_rate' => ['sometimes', 'required', 'numeric', Rule::in(Product::VAT_RATES)],
            'barcode' => [
                'nullable', 'string', 'size:13',
                Rule::unique('products', 'barcode')->ignore($this->route('product')),
                fn (string $attr, mixed $value, \Closure $fail) => Ean13::isValid($value) ? null : $fail(__('validation.ean13')),
            ],
            'category_id' => ['required', 'string', Rule::exists('categories', 'slug')],
            'stock' => 'required|integer|min:0',
            'unlimited_stock' => 'boolean',
            'min_stock' => 'nullable|integer|min:0|max:1000000',
            'sku' => 'nullable|string|max:255',
            'active' => 'boolean',

            'images' => ['nullable', 'array', 'max:'.Product::MEDIA_MAX_FILES],
            'images.*' => ['image', 'mimes:jpeg,jpg,png,webp', 'max:'.Product::MEDIA_MAX_KB],
            'remove_media' => ['nullable', 'array'],
            'remove_media.*' => ['integer', 'min:1'],
            'cover_media_id' => ['nullable', 'integer', 'min:1'],
            'remove_legacy_image' => ['boolean'],
        ];
    }
}
