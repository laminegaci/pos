@php
    $money = fn ($value) => $settings->money($value);
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Avoir {{ $note->code }}</title>
    @include('invoices._ticket-style', ['format' => $format])
</head>
<body>
    <div class="toolbar">
        <button type="button" onclick="window.print()">Imprimer</button>
    </div>

    <div class="ticket">
        <div class="center">
        @if ($settings->show_logo && $settings->logoUrl())
            <img class="logo" src="{{ $settings->logoUrl() }}" alt="">
        @endif
            <div class="shop">{{ $settings->shop_name ?: config('app.name') }}</div>
            @if ($settings->address)
                <div class="muted">{{ $settings->address }}</div>
            @endif
            @if ($settings->phone)
                <div class="muted">Tél : {{ $settings->phone }}</div>
            @endif
        </div>

        <div class="center title">Avoir</div>

        <div class="code">{{ $note->code }}</div>

        <div class="row"><span>Émis le</span><span>{{ $note->created_at->format('d/m/Y H:i') }}</span></div>
        @if ($note->saleReturn?->sale)
            <div class="row"><span>Vente d'origine</span><span>N° {{ $note->saleReturn->sale->id }}</span></div>
        @endif
        <div class="row"><span>Client</span><span>{{ $note->client?->name ?? '—' }}</span></div>

        <hr class="sep solid">
        <div class="row total"><span>MONTANT</span><span>{{ $money($note->amount) }}</span></div>
        <div class="row bold"><span>Solde</span><span>{{ $money($note->balance) }}</span></div>

        <hr class="sep">
        <div class="center muted">À présenter en caisse pour régler un achat.</div>
        <div class="center muted">Le solde reste utilisable jusqu'à épuisement.</div>
        <div class="cut">- - - - - - - - - - - - -</div>
    </div>

    @if (request()->boolean('print'))
        <script>window.addEventListener('load', () => setTimeout(() => window.print(), 300));</script>
    @endif
</body>
</html>
