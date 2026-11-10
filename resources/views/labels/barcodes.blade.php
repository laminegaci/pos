<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Étiquettes code-barres</title>
    @php $thermal = $format === 'thermal'; @endphp
    <style>
        @page { size: {{ $thermal ? '50mm 30mm' : 'A4' }}; margin: {{ $thermal ? '0' : '10mm 0' }}; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .sheet { {{ $thermal ? '' : 'width: 210mm; display: flex; flex-wrap: wrap; align-content: flex-start;' }} }
        .label {
            width: {{ $thermal ? '50mm' : '70mm' }};
            height: {{ $thermal ? '30mm' : '37mm' }};
            padding: {{ $thermal ? '1.5mm 2mm' : '2.5mm 4mm' }};
            overflow: hidden;
            display: flex; flex-direction: column; align-items: center; justify-content: space-between;
            {{ $thermal ? 'page-break-after: always; break-after: page;' : 'break-inside: avoid;' }}
        }
        .shop { font-size: 6.5pt; color: #444; letter-spacing: .03em; text-transform: uppercase; }
        .name { font-size: {{ $thermal ? '8pt' : '9pt' }}; font-weight: 700; text-align: center; line-height: 1.15; max-height: 2.4em; overflow: hidden; }
        .code { width: 100%; flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; }
        .code svg { max-width: 100%; max-height: 100%; height: 100%; }
        .nocode { font-size: 7pt; color: #b91c1c; }
        .price { font-size: {{ $thermal ? '11pt' : '13pt' }}; font-weight: 800; }
        @media screen { body { background: #e5e7eb; } .sheet { background: #fff; margin: 0 auto; } .label { outline: 1px dashed #cbd5e1; } }
    </style>
</head>
<body>
<div class="sheet">
    @foreach ($labels as $l)
        <div class="label">
            <div class="shop">{{ $settings->shop_name }}</div>
            <div class="name">{{ $l['name'] }}</div>
            <div class="code">
                @if ($l['svg'])
                    {!! $l['svg'] !!}
                @else
                    <span class="nocode">Pas de code EAN-13</span>
                @endif
            </div>
            <div class="price">{{ $settings->money($l['price']) }}</div>
        </div>
    @endforeach
</div>
@if (request()->boolean('print'))
    <script>window.addEventListener('load', () => window.print());</script>
@endif
</body>
</html>
