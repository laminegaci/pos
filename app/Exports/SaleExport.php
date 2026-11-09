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
        // Cancelled sales are listed too (with their status) so the export matches the history.
        return Sale::with(['client:id,name', 'user:id,name'])
            ->withSum('returns as returned_amount', 'amount')
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
                'Remboursé (DA)' => (float) ($s->returned_amount ?? 0),
                'Payé par avoir (DA)' => (float) $s->credit_note_amount,
                'Statut' => $s->isCancelled() ? 'Annulée' : 'Terminée',
            ]);
    }

    public function headings(): array
    {
        return [
            'ID', 'Date', 'Client', 'Caissier', 'Sous-total (DA)', 'Remise (DA)', 'Total (DA)',
            'Remboursé (DA)', 'Payé par avoir (DA)', 'Statut',
        ];
    }
}
