const formatter = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export function formatCurrency(value) {
    return `${formatter.format(value)} DA`;
}
