{{-- Shared thermal-receipt CSS. Expects $format ('58mm' | '80mm'). --}}
@php
    $small = $format === '58mm';
    $width = $small ? '48mm' : '72mm';
@endphp
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
    .right { text-align: right; }
    .bold { font-weight: 700; }
    .shop { font-size: {{ $small ? '14px' : '17px' }}; font-weight: 800; letter-spacing: .5px; text-transform: uppercase; }
    .title { font-size: {{ $small ? '13px' : '15px' }}; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; border: 2px solid #000; padding: 1.5mm 0; margin: 2mm 0; }
    .muted { font-size: {{ $small ? '9.5px' : '10.5px' }}; }
    .sep { border: 0; border-top: 1px dashed #000; margin: 2.5mm 0; }
    .sep.solid { border-top-style: solid; border-top-width: 2px; }

    .row { display: flex; justify-content: space-between; gap: 2mm; }
    .row > span:last-child { white-space: nowrap; text-align: right; }

    .item { margin-bottom: 1.5mm; break-inside: avoid; }
    .item-name { word-break: break-word; }
    .item-detail { display: flex; justify-content: space-between; gap: 2mm; padding-left: 3mm; }

    .total { font-size: {{ $small ? '15px' : '18px' }}; font-weight: 800; }
    .code { font-size: {{ $small ? '17px' : '22px' }}; font-weight: 800; letter-spacing: 2px; text-align: center; border: 2px dashed #000; padding: 2mm 0; margin: 2mm 0; }
    .footer { margin-top: 3mm; white-space: pre-line; }
    .cut { margin-top: 4mm; text-align: center; font-size: 9px; letter-spacing: 2px; }

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
