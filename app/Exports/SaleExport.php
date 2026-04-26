<?php

declare(strict_types=1);

namespace App\Exports;

use App\Models\Sale;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class SaleExport implements FromCollection, WithHeadings
{
    public function collection()
    {
        return Sale::with(['client:id,name', 'user:id,name'])
            ->where('status', 'completed')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($s) => [
                'ID' => $s->id,
                'Date' => $s->created_at?->format('d/m/Y H:i'),
                'Client' => $s->client?->name ?? '—',
                'Caissier' => $s->user?->name ?? '—',
                'Sous-total (DA)' => (float) $s->subtotal,
                'Remise (DA)' => (float) $s->remise,
                'Total (DA)' => (float) $s->total,
                'Statut' => $s->status,
            ]);
    }

    public function headings(): array
    {
        return ['ID', 'Date', 'Client', 'Caissier', 'Sous-total (DA)', 'Remise (DA)', 'Total (DA)', 'Statut'];
    }
}
