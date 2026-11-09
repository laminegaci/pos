<?php

declare(strict_types=1);

namespace App\Exports;

use App\Models\Sale;
use App\Models\Settings;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class SaleExport implements FromCollection, WithHeadings
{
    private string $currency;

    public function __construct()
    {
        $this->currency = Settings::current()->currencySymbol();
    }

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
                'Sous-total ('.$this->currency.')' => (float) $s->subtotal,
                'Remise ('.$this->currency.')' => (float) $s->remise,
                'Total ('.$this->currency.')' => (float) $s->total,
                'Remboursé ('.$this->currency.')' => (float) ($s->returned_amount ?? 0),
                'Payé par avoir ('.$this->currency.')' => (float) $s->credit_note_amount,
                'Paiement' => $s->payment_method ? ['cash' => 'Espèces', 'card' => 'Carte', 'credit' => 'Crédit'][$s->payment_method] ?? $s->payment_method : '—',
                'Statut' => $s->isCancelled() ? 'Annulée' : 'Terminée',
            ]);
    }

    public function headings(): array
    {
        return [
            'ID', 'Date', 'Client', 'Caissier', 'Sous-total ('.$this->currency.')', 'Remise ('.$this->currency.')', 'Total ('.$this->currency.')',
            'Remboursé ('.$this->currency.')', 'Payé par avoir ('.$this->currency.')', 'Paiement', 'Statut',
        ];
    }
}
