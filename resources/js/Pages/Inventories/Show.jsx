import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, Search, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PosLayout from '../../Layouts/PosLayout';
import useBarcodeScanner from '../../hooks/useBarcodeScanner';
import { formatCurrency } from '../../lib/formatCurrency';

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content;

const gapOf = (l) => (l.counted_qty === null || l.counted_qty === undefined ? null : l.counted_qty - l.expected_qty);

export default function InventoryShow({ inventory, lines: initialLines, canManage }) {
    const { t } = useTranslation();
    const [lines, setLines] = useState(initialLines);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all'); // all | todo | gap
    const [showValidate, setShowValidate] = useState(false);
    const [uncounted, setUncounted] = useState('keep');
    const [error, setError] = useState(null);
    const [highlight, setHighlight] = useState(null);
    const inputs = useRef({});
    const editable = inventory.status === 'draft';

    const save = async (line, value) => {
        const counted = value === '' || value === null ? null : Math.max(0, parseInt(value, 10) || 0);
        setLines((ls) => ls.map((l) => (l.id === line.id ? { ...l, counted_qty: counted } : l)));
        try {
            const res = await fetch(`/inventaires/${inventory.id}/lignes/${line.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify({ counted_qty: counted }),
            });
            if (!res.ok) throw new Error(String(res.status));
            setError(null);
        } catch {
            setError(t('inventory.saveError'));
        }
    };

    // Scanning counts one more unit of the matching product.
    useBarcodeScanner(
        (code) => {
            const line = lines.find((l) => l.product?.barcode === code);
            if (!line) {
                setError(t('inventory.unknownBarcode', { code }));
                return;
            }
            setHighlight(line.id);
            save(line, (line.counted_qty ?? 0) + 1);
            inputs.current[line.id]?.scrollIntoView({ block: 'center' });
        },
        { enabled: editable },
    );

    const stats = useMemo(() => {
        const counted = lines.filter((l) => l.counted_qty !== null && l.counted_qty !== undefined);
        const gapQty = counted.reduce((s, l) => s + gapOf(l), 0);
        const gapValue = counted.reduce((s, l) => s + gapOf(l) * Number(l.unit_cost), 0);
        return { total: lines.length, counted: counted.length, gapQty, gapValue };
    }, [lines]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return lines.filter((l) => {
            const p = l.product;
            const matches = !q || (p?.name ?? '').toLowerCase().includes(q) || (p?.sku ?? '').toLowerCase().includes(q) || (p?.barcode ?? '').includes(q);
            const gap = gapOf(l);
            const byFilter = filter === 'all' || (filter === 'todo' && gap === null) || (filter === 'gap' && gap !== null && gap !== 0);
            return matches && byFilter;
        });
    }, [lines, query, filter]);

    const validate = () =>
        router.post(`/inventaires/${inventory.id}/valider`, { uncounted }, {
            onError: (e) => setError(e.inventory ?? Object.values(e)[0]),
            onSuccess: () => setShowValidate(false),
        });

    const cancel = () => {
        if (confirm(t('inventory.confirmCancel'))) router.post(`/inventaires/${inventory.id}/annuler`);
    };

    const pill = (id, label) => (
        <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
                filter === id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
        >
            {label}
        </button>
    );

    const card = (label, value, tone = 'text-slate-900') => (
        <div className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="text-xs text-slate-500">{label}</div>
            <div className={`mt-1 text-xl font-bold tabular-nums ${tone}`}>{value}</div>
        </div>
    );

    return (
        <>
            <Head title={inventory.reference} />
            <PosLayout>
                <div className="flex flex-1 flex-col overflow-hidden p-4 md:px-8 md:py-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Link href="/inventaires" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={t('common.back', { defaultValue: 'Back' })}>
                                <ArrowLeft size={18} />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900">{inventory.reference}</h1>
                                <p className="text-xs text-slate-500">{t(`inventory.statuses.${inventory.status}`)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <a
                                href={`/inventaires/${inventory.id}/export`}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                            >
                                <Download size={15} /> {t('inventory.export')}
                            </a>
                            {editable && canManage && (
                                <>
                                    <button onClick={cancel} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                                        <XCircle size={15} /> {t('common.cancel')}
                                    </button>
                                    <button
                                        onClick={() => setShowValidate(true)}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/25"
                                    >
                                        <CheckCircle2 size={15} /> {t('inventory.validate')}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {card(t('inventory.progress'), `${stats.counted} / ${stats.total}`)}
                        {card(t('inventory.gapQty'), stats.gapQty > 0 ? `+${stats.gapQty}` : stats.gapQty, stats.gapQty < 0 ? 'text-red-600' : stats.gapQty > 0 ? 'text-emerald-600' : 'text-slate-900')}
                        {card(t('inventory.gapValue'), formatCurrency(stats.gapValue), stats.gapValue < 0 ? 'text-red-600' : 'text-slate-900')}
                        {card(t('inventory.toCount'), stats.total - stats.counted)}
                    </div>

                    {error && <div className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
                    {editable && <p className="mb-3 text-xs text-slate-500">{t('inventory.scanHint')}</p>}

                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={`${t('common.search')}...`}
                                className="w-64 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                        </div>
                        {pill('all', t('common.all'))}
                        {pill('todo', t('inventory.filterTodo'))}
                        {pill('gap', t('inventory.filterGap'))}
                    </div>

                    <div className="flex-1 overflow-auto rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">{t('products.name', { defaultValue: 'Produit' })}</th>
                                    <th className="px-4 py-3 text-right">{t('inventory.expected')}</th>
                                    <th className="px-4 py-3 text-right">{t('inventory.counted')}</th>
                                    <th className="px-4 py-3 text-right">{t('inventory.gap')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visible.map((l) => {
                                    const gap = gapOf(l);
                                    return (
                                        <tr key={l.id} className={highlight === l.id ? 'bg-indigo-50/60' : 'hover:bg-slate-50/60'}>
                                            <td className="px-4 py-2.5">
                                                <div className="font-medium text-slate-900">{l.product?.name}</div>
                                                <div className="text-xs text-slate-400">{l.product?.sku || l.product?.barcode}</div>
                                            </td>
                                            <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{l.expected_qty}</td>
                                            <td className="px-4 py-2.5 text-right">
                                                {editable ? (
                                                    <input
                                                        ref={(el) => (inputs.current[l.id] = el)}
                                                        type="number"
                                                        min="0"
                                                        defaultValue={l.counted_qty ?? ''}
                                                        key={`${l.id}-${l.counted_qty ?? ''}`}
                                                        onBlur={(e) => {
                                                            const v = e.target.value;
                                                            if (v !== String(l.counted_qty ?? '')) save(l, v);
                                                        }}
                                                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                                        className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right tabular-nums focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                                    />
                                                ) : (
                                                    <span className="tabular-nums">{l.counted_qty ?? '-'}</span>
                                                )}
                                            </td>
                                            <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${gap === null || gap === 0 ? 'text-slate-400' : gap < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {gap === null ? '-' : gap > 0 ? `+${gap}` : gap}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {visible.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                                            {t('inventory.noLines')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </PosLayout>

            {showValidate && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setShowValidate(false)}>
                    <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-base font-semibold text-slate-900">{t('inventory.validateTitle')}</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            {t('inventory.validateSummary', { counted: stats.counted, total: stats.total, gap: stats.gapQty })}
                        </p>
                        {stats.counted < stats.total && (
                            <fieldset className="mt-4 space-y-2">
                                <legend className="mb-1 text-xs font-medium text-slate-600">
                                    {t('inventory.uncountedLegend', { count: stats.total - stats.counted })}
                                </legend>
                                {['keep', 'zero'].map((v) => (
                                    <label key={v} className="flex items-start gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                                        <input type="radio" name="uncounted" checked={uncounted === v} onChange={() => setUncounted(v)} className="mt-0.5" />
                                        <span>{t(`inventory.uncounted.${v}`)}</span>
                                    </label>
                                ))}
                            </fieldset>
                        )}
                        <div className="mt-5 flex justify-end gap-2">
                            <button onClick={() => setShowValidate(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                                {t('common.cancel')}
                            </button>
                            <button onClick={validate} className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/25">
                                {t('inventory.validate')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
