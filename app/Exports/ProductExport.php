<?php

declare(strict_types=1);

namespace App\Exports;

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
        $categories = [
            'bureaux' => 'Bureaux',
            'rangement_bureau' => 'Rangement',
            'bureaux_direction' => 'Bureaux Direction',
            'bureaux_compacts' => 'Bureaux Compacts',
            'bureaux_ergonomiques' => 'Bureaux Ergonomiques',
            'bureaux_gaming' => 'Bureaux Gaming',
            'mobilier_professionnel' => 'Mobilier Pro',
        ];

        return Product::orderBy('name')->get()->map(fn ($p) => [
            'ID' => $p->id,
            'Nom' => $p->name,
            'Description' => $p->description,
            'Catégorie' => $categories[$p->category_id] ?? $p->category_id,
            'Prix ('.$this->currency.')' => (float) $p->price,
            'Stock' => $p->unlimited_stock ? 'Illimité' : $p->stock,
            'SKU' => $p->sku,
            'Actif' => $p->active ? 'Oui' : 'Non',
            'Créé le' => $p->created_at?->format('d/m/Y H:i'),
        ]);
    }

    public function headings(): array
    {
        return ['ID', 'Nom', 'Description', 'Catégorie', 'Prix ('.$this->currency.')', 'Stock', 'SKU', 'Actif', 'Créé le'];
    }
}
