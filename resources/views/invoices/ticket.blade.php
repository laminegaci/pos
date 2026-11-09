@php
    $money = fn ($value) => $settings->money($value);
    // Printable width: an 80 mm roll prints ~72 mm, a 58 mm roll ~48 mm.
    $width = $format === '58mm' ? '48mm' : '72mm';
    $small = $format === '58mm';
    $itemsCount = collect($items)->sum('quantity');
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Ticket #{{ $sale->id }}</title>
    <style>
        @page { size: {{ $format }} auto; margin: 0; }

        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #fff; color: #000; }
        body {
            font-family: 'Consolas', 'Courier New', ui-monospace, monospace;
            font-size: {{ $small ? '10.5px' : '12px' }};
            line-height: 1.35;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .ticket { width: {{ $width }}; margin: 0 auto; padding: 3mm 0 8mm; }
        .center { text-align: center; }
        .logo { display: block; margin: 0 auto 2mm; max-width: 60%; max-height: 22mm; filter: grayscale(1) contrast(1.3); }
        .right { text-align: right; }
        .bold { font-weight: 700; }
        .shop { font-size: {{ $small ? '14px' : '17px' }}; font-weight: 800; letter-spacing: .5px; text-transform: uppercase; }
        .muted { font-size: {{ $small ? '9.5px' : '10.5px' }}; }
        .sep { border: 0; border-top: 1px dashed #000; margin: 2.5mm 0; }
        .sep.solid { border-top-style: solid; border-top-width: 2px; }

        .row { display: flex; justify-content: space-between; gap: 2mm; }
        .row > span:last-child { white-space: nowrap; text-align: right; }

        .item { margin-bottom: 1.5mm; break-inside: avoid; }
        .item-name { word-break: break-word; }
        .item-detail { display: flex; justify-content: space-between; gap: 2mm; padding-left: 3mm; }

        .total { font-size: {{ $small ? '15px' : '18px' }}; font-weight: 800; }
        .footer { margin-top: 3mm; white-space: pre-line; }
        .cut { margin-top: 4mm; text-align: center; font-size: 9px; letter-spacing: 2px; }

        /* On screen: show the ticket as a paper strip with a print button. */
        @media screen {
            html { background: #e5e7eb; }
            body { padding: 16px 0 32px; background: #e5e7eb; }
            .ticket { background: #fff; padding: 4mm 3mm 8mm; width: calc({{ $width }} + 6mm); box-shadow: 0 2px 10px rgba(0,0,0,.15); }
            .toolbar { display: flex; justify-content: center; gap: 8px; margin-bottom: 12px; font-family: system-ui, sans-serif; }
            .toolbar button { cursor: pointer; border: 0; border-radius: 999px; padding: 8px 18px; font-size: 13px; font-weight: 600; background: #4f46e5; color: #fff; }
        }
        @media print {
            .toolbar, .cut { display: none; }
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <button type="button" onclick="window.print()">Imprimer</button>
    </div>

    <div class="ticket">
        {{-- Shop header --}}
        <div class="center">
        @if ($settings->show_logo && $settings->logoUrl())
            <img class="logo" src="{{ $settings->logoUrl() }}" alt="">
        @endif
            <div class="shop">{{ $settings->shop_name ?: config('app.name') }}</div>
            @if ($settings->company && $settings->company !== $settings->shop_name)
                <div>{{ $settings->company }}</div>
            @endif
            @if ($settings->address)
                <div class="muted">{{ $settings->address }}</div>
            @endif
            @if ($settings->phone)
                <div class="muted">Tél : {{ $settings->phone }}</div>
            @endif
            @if ($settings->rc || $settings->nif)
                <div class="muted">
                    @if ($settings->rc) RC : {{ $settings->rc }} @endif
                    @if ($settings->rc && $settings->nif) · @endif
                    @if ($settings->nif) NIF : {{ $settings->nif }} @endif
                </div>
            @endif
        </div>

        @if ($sale->isCancelled())
            <div class="center bold" style="border:2px solid #000; margin:2mm 0; padding:1.5mm 0; font-size:15px; letter-spacing:2px;">
                *** ANNULÉ ***
            </div>
            @if ($sale->cancelled_at)
                <div class="center muted">le {{ $sale->cancelled_at->format('d/m/Y H:i') }}</div>
            @endif
        @endif

        <hr class="sep">

        {{-- Sale info --}}
        <div class="row"><span class="bold">Ticket N° {{ $sale->id }}</span><span>{{ $sale->created_at->format('d/m/Y H:i') }}</span></div>
        <div class="row"><span>Caisse</span><span>{{ $settings->shop_code }}</span></div>
        @if ($sale->user)
            <div class="row"><span>Caissier</span><span>{{ $sale->user->name }}</span></div>
        @endif
        @if ($sale->payment_method)
            <div class="row"><span>Paiement</span><span>{{ ['cash' => 'Espèces', 'card' => 'Carte', 'credit' => 'Crédit'][$sale->payment_method] ?? $sale->payment_method }}</span></div>
        @endif
        <div class="row"><span>Client</span><span>{{ $sale->client?->name ?? 'Client de passage' }}</span></div>

        <hr class="sep">

        {{-- Items --}}
        @foreach ($items as $item)
            <div class="item">
                <div class="item-name bold">{{ $item['product_name'] }}</div>
                <div class="item-detail">
                    <span>{{ $item['quantity'] }} x {{ $money($item['price']) }}</span>
                    <span>{{ $money($item['line_total']) }}</span>
                </div>
            </div>
        @endforeach

        <hr class="sep">

        {{-- Totals --}}
        <div class="row"><span>Articles</span><span>{{ $itemsCount }}</span></div>
        <div class="row"><span>Sous-total</span><span>{{ $money($sale->subtotal) }}</span></div>
        @if ((float) $sale->remise > 0)
            <div class="row"><span>Remise</span><span>-{{ $money($sale->remise) }}</span></div>
        @endif
        <hr class="sep solid">
        <div class="row total"><span>TOTAL</span><span>{{ $money($sale->total) }}</span></div>

        @if ((float) $sale->credit_note_amount > 0)
            <div class="row"><span>Payé par avoir</span><span>-{{ $money($sale->credit_note_amount) }}</span></div>
            <div class="row bold"><span>Reste à payer</span><span>{{ $money(max(0, (float) $sale->total - (float) $sale->credit_note_amount)) }}</span></div>
        @endif

        @if ($received !== null)
            <hr class="sep">
            <div class="row"><span>Espèces reçues</span><span>{{ $money($received) }}</span></div>
            <div class="row bold"><span>Rendu</span><span>{{ $money($change) }}</span></div>
        @endif

        <hr class="sep">

        @if ($settings->receipt_footer)
            <div class="center footer">{{ $settings->receipt_footer }}</div>
        @endif
        <div class="center muted" style="margin-top:2mm">Merci de votre visite</div>

        <div class="cut">- - - - - - - - - - - - -</div>
    </div>

    @if (request()->boolean('print'))
        <script>window.addEventListener('load', () => setTimeout(() => window.print(), 300));</script>
    @endif
</body>
</html>
