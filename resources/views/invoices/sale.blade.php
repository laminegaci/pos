<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Facture #{{ $sale->id }}</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #1f2937; margin: 0; padding: 32px; }
        .header { display: table; width: 100%; margin-bottom: 32px; }
        .header > div { display: table-cell; vertical-align: top; }
        .brand { font-size: 24px; font-weight: bold; color: #4f46e5; }
        .muted { color: #6b7280; font-size: 11px; }
        .meta { text-align: right; }
        .meta h1 { margin: 0 0 8px; font-size: 20px; color: #111827; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; background: #d1fae5; color: #065f46; font-size: 10px; font-weight: bold; text-transform: uppercase; }
        .parties { display: table; width: 100%; margin-bottom: 24px; }
        .parties > div { display: table-cell; width: 50%; padding: 12px 14px; background: #f9fafb; border-radius: 8px; vertical-align: top; }
        .parties .gap { background: transparent; width: 16px; padding: 0; }
        .label { font-size: 10px; text-transform: uppercase; letter-spacing: .5px; color: #6b7280; margin-bottom: 4px; }
        .name { font-weight: bold; color: #111827; font-size: 13px; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        table.items th { background: #4f46e5; color: white; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; }
        table.items th.r, table.items td.r { text-align: right; }
        table.items th.c, table.items td.c { text-align: center; }
        table.items td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
        .totals { width: 280px; margin-left: auto; }
        .totals .row { display: table; width: 100%; padding: 6px 0; }
        .totals .row > span { display: table-cell; }
        .totals .row > span:last-child { text-align: right; }
        .totals .grand { border-top: 2px solid #111827; margin-top: 6px; padding-top: 10px; font-size: 16px; font-weight: bold; }
        .totals .grand span:last-child { color: #4f46e5; }
        .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="brand">{{ config('app.name') }}</div>
            <div class="muted">Point de vente</div>
        </div>
        <div class="meta">
            <h1>Facture #{{ $sale->id }}</h1>
            <div class="muted">Émise le {{ $sale->created_at->format('d/m/Y à H:i') }}</div>
            <div style="margin-top:6px"><span class="badge">{{ $sale->status }}</span></div>
        </div>
    </div>

    <div class="parties">
        <div>
            <div class="label">Client</div>
            <div class="name">{{ $sale->client?->name ?? 'Client occasionnel' }}</div>
            @if ($sale->client?->email)
                <div class="muted">{{ $sale->client->email }}</div>
            @endif
            @if ($sale->client?->phone)
                <div class="muted">{{ $sale->client->phone }}</div>
            @endif
        </div>
        <div class="gap"></div>
        <div>
            <div class="label">Caissier</div>
            <div class="name">{{ $sale->user?->name }}</div>
            <div class="muted">Vente N° {{ $sale->id }}</div>
        </div>
    </div>

    <table class="items">
        <thead>
            <tr>
                <th>Article</th>
                <th class="c" style="width:60px">Qté</th>
                <th class="r" style="width:110px">Prix unitaire</th>
                <th class="r" style="width:110px">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($items as $item)
                <tr>
                    <td>{{ $item['product_name'] }}</td>
                    <td class="c">{{ $item['quantity'] }}</td>
                    <td class="r">{{ number_format($item['price'], 2, ',', ' ') }} DZD</td>
                    <td class="r">{{ number_format($item['line_total'], 2, ',', ' ') }} DZD</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="totals">
        <div class="row"><span>Sous-total</span><span>{{ number_format((float) $sale->subtotal, 2, ',', ' ') }} DZD</span></div>
        @if ((float) $sale->remise > 0)
            <div class="row" style="color:#dc2626"><span>Remise</span><span>-{{ number_format((float) $sale->remise, 2, ',', ' ') }} DZD</span></div>
        @endif
        <div class="row grand"><span>Total</span><span>{{ number_format((float) $sale->total, 2, ',', ' ') }} DZD</span></div>
    </div>

    <div class="footer">
        Merci de votre confiance — {{ config('app.name') }}
    </div>
</body>
</html>
