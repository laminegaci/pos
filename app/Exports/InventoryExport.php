<?php

declare(strict_types=1);

namespace App\Exports;

use App\Models\Inventory;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class InventoryExport implements FromCollection, WithHeadings
{
    public function __construct(private Inventory $inventory) {}

    public function collection()
    {
        return $this->inventory->lines()->with('product:id,name,sku,barcode')->get()
            ->sortBy(fn ($l) => $l->product?->name)
            ->map(fn ($l) => [
                'Produit' => $l->product?->name,
                'SKU' => $l->product?->sku,
                'EAN-13' => $l->product?->barcode ? "\t".$l->product->barcode : null,
                'Theorique' => $l->expected_qty,
                'Compte' => $l->counted_qty,
                'Ecart' => $l->gap,
                'Cout unitaire' => (float) $l->unit_cost,
                'Valeur ecart' => $l->gap_value,
            ])->values();
    }

    public function headings(): array
    {
        return ['Produit', 'SKU', 'EAN-13', 'Théorique', 'Compté', 'Écart', 'Coût unitaire', 'Valeur écart'];
    }
}
