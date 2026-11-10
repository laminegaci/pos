<?php

declare(strict_types=1);

namespace App\Exports;

use App\Models\Category;
use App\Models\Product;
use App\Models\Settings;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class ProductExport implements FromCollection, WithHeadings
{
    private string $currency;

    public function __construct()
    {
        $this->currency = Settings::current()->currencySymbol();
    }

    public function collection()
    {
        $categories = Category::query()->pluck('name', 'slug');

        return Product::orderBy('name')->get()->map(fn ($p) => [
            'ID' => $p->id,
            'Nom' => $p->name,
            'Description' => $p->description,
            'Catégorie' => $categories[$p->category_id] ?? $p->category_id,
            'Prix TTC ('.$this->currency.')' => (float) $p->price,
            'TVA (%)' => (float) $p->vat_rate,
            'Prix HT ('.$this->currency.')' => $p->price_ht,
            'Coût HT ('.$this->currency.')' => $p->cost_price === null ? null : (float) $p->cost_price,
            'Marge ('.$this->currency.')' => $p->margin,
            'Marge (%)' => $p->margin_rate,
            'Stock' => $p->unlimited_stock ? 'Illimité' : $p->stock,
            'SKU' => $p->sku,
            'EAN-13' => $p->barcode ? "\t".$p->barcode : null,
            'Actif' => $p->active ? 'Oui' : 'Non',
            'Créé le' => $p->created_at?->format('d/m/Y H:i'),
        ]);
    }

    public function headings(): array
    {
        return ['ID', 'Nom', 'Description', 'Catégorie', 'Prix TTC ('.$this->currency.')', 'TVA (%)', 'Prix HT ('.$this->currency.')', 'Coût HT ('.$this->currency.')', 'Marge ('.$this->currency.')', 'Marge (%)', 'Stock', 'SKU', 'EAN-13', 'Actif', 'Créé le'];
    }
}
