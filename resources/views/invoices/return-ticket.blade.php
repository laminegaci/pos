@php
    $currency = ['DZD' => 'DA', 'EUR' => '€', 'USD' => '$'][$settings->currency] ?? $settings->currency;
    $money = fn ($value) => number_format((float) $value, 2, ',', ' ').' '.$currency;
    $viaCreditNote = $return->refund_method === \App\Models\SaleReturn::REFUND_CREDIT_NOTE;
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Retour #{{ $return->id }}</title>
    @include('invoices._ticket-style', ['format' => $format])
</head>
<body>
    <div class="toolbar">
        <button type="button" onclick="window.print()">Imprimer</button>
    </div>

    <div class="ticket">
        <div class="center">
            <div class="shop">{{ $settings->shop_name ?: config('app.name') }}</div>
            @if ($settings->address)
                <div class="muted">{{ $settings->address }}</div>
            @endif
            @if ($settings->phone)
                <div class="muted">Tél : {{ $settings->phone }}</div>
            @endif
        </div>

        <div class="center title">Bon de retour</div>

        <div class="row"><span class="bold">Retour N° {{ $return->id }}</span><span>{{ $return->created_at->format('d/m/Y H:i') }}</span></div>
        <div class="row"><span>Vente d'origine</span><span>N° {{ $sale->id }}</span></div>
        @if ($return->user)
            <div class="row"><span>Caissier</span><span>{{ $return->user->name }}</span></div>
        @endif
        @if ($return->approver && $return->approver->id !== $return->user?->id)
            <div class="row"><span>Validé par</span><span>{{ $return->approver->name }}</span></div>
        @endif
        <div class="row"><span>Client</span><span>{{ $sale->client?->name ?? 'Client de passage' }}</span></div>
        <div class="row"><span>Motif</span><span>{{ $return->reason }}</span></div>

        <hr class="sep">

        @foreach ($return->items as $line)
            <div class="item">
                <div class="item-name bold">{{ $line->saleItem?->product?->name ?? 'Article' }}</div>
                <div class="item-detail">
                    <span>{{ $line->quantity }} x {{ $money($line->unit_price) }}</span>
                    <span>{{ $money($line->line_total) }}</span>
                </div>
                @unless ($line->restock)
                    <div class="item-detail muted"><span>(non remis en stock)</span></div>
                @endunless
            </div>
        @endforeach

        <hr class="sep solid">
        <div class="row total"><span>REMBOURSÉ</span><span>{{ $money($return->amount) }}</span></div>
        <div class="row"><span>Mode</span><span>{{ $viaCreditNote ? 'Avoir' : 'Espèces' }}</span></div>

        @if ($viaCreditNote && $return->creditNote)
            <div class="code">{{ $return->creditNote->code }}</div>
            <div class="center muted">Avoir valable en caisse : présentez ce code.</div>
        @endif

        <hr class="sep">
        <div class="center muted">Merci de votre visite</div>
        <div class="cut">- - - - - - - - - - - - -</div>
    </div>

    @if (request()->boolean('print'))
        <script>window.addEventListener('load', () => setTimeout(() => window.print(), 300));</script>
    @endif
</body>
</html>
