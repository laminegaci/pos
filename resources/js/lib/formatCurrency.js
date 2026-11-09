const formatter = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
});

const SYMBOLS = { DZD: 'DA', EUR: '€', USD: '$' };

// Shop currency symbol, kept in sync with the shared `shop` Inertia prop (see app.jsx).
let symbol = 'DA';

export function setCurrency(code) {
    symbol = SYMBOLS[code] ?? code ?? 'DA';
}

export function currencySymbol() {
    return symbol;
}

/** `compact` drops the ",00" for whole amounts (chart axes, KPIs). */
export function formatCurrency(value, { compact = false } = {}) {
    return `${(compact ? compactFormatter : formatter).format(value)} ${symbol}`;
}
