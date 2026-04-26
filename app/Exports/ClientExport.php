<?php

declare(strict_types=1);

namespace App\Exports;

use App\Models\Client;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class ClientExport implements FromCollection, WithHeadings
{
    public function collection()
    {
        return Client::withCount('sales')
            ->withSum('sales', 'total')
            ->orderBy('name')
            ->get()
            ->map(fn ($c) => [
                'ID' => $c->id,
                'Nom' => $c->name,
                'Email' => $c->email,
                'Téléphone' => $c->phone,
                'Adresse' => $c->address,
                'Ville' => $c->city,
                'Type' => $c->type === 'professionnel' ? 'Professionnel' : 'Particulier',
                'Notes' => $c->notes,
                'Actif' => $c->active ? 'Oui' : 'Non',
                'Nb Ventes' => $c->sales_count ?? 0,
                'Total Dépensé (DA)' => (float) ($c->sales_sum_total ?? 0),
                'Créé le' => $c->created_at?->format('d/m/Y H:i'),
            ]);
    }

    public function headings(): array
    {
        return [
            'ID', 'Nom', 'Email', 'Téléphone', 'Adresse', 'Ville', 'Type', 'Notes', 'Actif', 'Nb Ventes', 'Total Dépensé (DA)', 'Créé le',
        ];
    }
}
