<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Relevé de compte – {{ $client->name }}</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #1f2937; margin: 0; padding: 32px; }
        .header { display: table; width: 100%; margin-bottom: 28px; }
        .header > div { display: table-cell; vertical-align: top; }
        .brand { font-size: 22px; font-weight: bold; color: #4f46e5; }
        .muted { color: #6b7280; font-size: 11px; }
        .meta { text-align: right; }
        .meta h1 { margin: 0 0 6px; font-size: 20px; color: #111827; }
        .party { padding: 12px 14px; background: #f9fafb; border-radius: 8px; margin-bottom: 20px; }
        .label { font-size: 10px; text-transform: uppercase; letter-spacing: .5px; color: #6b7280; margin-bottom: 4px; }
        .name { font-weight: bold; color: #111827; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #4f46e5; color: white; text-align: left; padding: 9px; font-size: 10px; text-transform: uppercase; }
        th.r, td.r { text-align: right; }
        td { padding: 8px 9px; border-bottom: 1px solid #e5e7eb; }
        tr.opening td { background: #f3f4f6; font-style: italic; }
        .totals { width: 300px; margin-left: auto; }
        .totals .row { display: table; width: 100%; padding: 5px 0; }
        .totals .row > span { display: table-cell; }
        .totals .row > span:last-child { text-align: right; }
        .totals .grand { border-top: 2px solid #111827; margin-top: 6px; padding-top: 9px; font-size: 15px; font-weight: bold; }
        .alert { margin-top: 14px; padding: 10px 12px; background: #fef2f2; color: #991b1b; border-radius: 8px; font-weight: bold; }
        .footer { margin-top: 40px; padding-top: 14px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="brand">{{ $settings->shop_name ?? config('app.name') }}</div>
            <div class="muted">
                @if (!empty($settings->rc)) RC : {{ $settings->rc }} @endif
                @if (!empty($settings->nif)) &nbsp; NIF : {{ $settings->nif }} @endif
            </div>
        </div>
        <div class="meta">
            <h1>Relevé de compte</h1>
            <div class="muted">Édité le {{ now()->format('d/m/Y') }}</div>
            @if ($from || $to)
                <div class="muted">Période : {{ $from ? $from->format('d/m/Y') : '…' }} → {{ $to ? $to->format('d/m/Y') : '…' }}</div>
            @endif
        </div>
    </div>

    <div class="party">
        <div class="label">Client</div>
        <div class="name">{{ $client->name }}</div>
        <div class="muted">
            {{ collect([$client->address, $client->city, $client->phone])->filter()->implode(' · ') }}
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Opération</th>
                <th>Échéance</th>
                <th class="r">Débit</th>
                <th class="r">Crédit</th>
                <th class="r">Solde</th>
            </tr>
        </thead>
        <tbody>
            <tr class="opening">
                <td colspan="5">Solde initial</td>
                <td class="r">{{ $settings->money($statement['opening']) }}</td>
            </tr>
            @forelse ($statement['rows'] as $row)
                <tr>
                    <td>{{ \Illuminate\Support\Carbon::parse($row['date'])->format('d/m/Y') }}</td>
                    <td>
                        @if ($row['type'] === 'sale') Vente {{ $row['label'] }}
                        @elseif ($row['type'] === 'payment') Règlement ({{ $row['label'] }})
                        @else Retour vente {{ $row['label'] }}
                        @endif
                    </td>
                    <td>{{ $row['due_at'] ? \Illuminate\Support\Carbon::parse($row['due_at'])->format('d/m/Y') : '' }}</td>
                    <td class="r">{{ $row['debit'] > 0 ? $settings->money($row['debit']) : '' }}</td>
                    <td class="r">{{ $row['credit'] > 0 ? $settings->money($row['credit']) : '' }}</td>
                    <td class="r">{{ $settings->money($row['balance']) }}</td>
                </tr>
            @empty
                <tr><td colspan="6" class="muted">Aucune opération sur la période.</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="totals">
        <div class="row grand"><span>Solde dû</span><span>{{ $settings->money($statement['closing']) }}</span></div>
    </div>

    @if ($overdue > 0)
        <div class="alert">Dont échu : {{ $settings->money($overdue) }}. Merci de régulariser dans les meilleurs délais.</div>
    @endif

    <div class="footer">{{ $settings->shop_name ?? config('app.name') }}</div>
</body>
</html>
