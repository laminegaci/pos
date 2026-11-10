import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { ArrowLeft, Sparkles, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PosLayout from '../../Layouts/PosLayout';
import { formatCurrency } from '../../lib/formatCurrency';
import ProductPicker from '../../Components/Purchasing/ProductPicker';
import FlashToast, { ghostBtn, inputCls, primaryBtn, totalsOf } from '../../Components/Purchasing/FlashToast';

const VAT_RATES = [0, 9, 19];

const fromProduct = (p) => ({
    product_id: p.id,
    name: p.name,
    quantity: 1,
    unit_cost: p.cost_price !== null && p.cost_price !== undefined ? Number(p.cost_price) : 0,
    vat_rate: Number(p.vat_rate ?? 0),
});

export default function PurchaseForm({ order, suppliers, products }) {
    const { t } = useTranslation();
    const [supplierId, setSupplierId] = useState(order?.supplier_id ?? '');
    const [expectedAt, setExpectedAt] = useState(order?.expected_at ?? '');
    const [note, setNote] = useState(order?.note ?? '');
    const [lines, setLines] = useState(
        (order?.lines ?? []).map((l) => ({
            product_id: l.product_id,
            name: l.product?.name,
            quantity: l.quantity_ordered,
            unit_cost: Number(l.unit_cost),
            vat_rate: Number(l.vat_rate),
        })),
    );
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const [info, setInfo] = useState(null);
    const totals = totalsOf(lines);

    const patch = (i, key, value) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)));

    const suggest = async () => {
        const res = await fetch('/achats/suggestions', { headers: { Accept: 'application/json' } });
        const list = res.ok ? await res.json() : [];
        const have = new Set(lines.map((l) => l.product_id));
        const fresh = list.filter((s) => !have.has(s.product_id)).map((s) => ({
            product_id: s.product_id, name: s.name, quantity: s.quantity, unit_cost: s.unit_cost, vat_rate: s.vat_rate,
        }));
        setInfo(fresh.length === 0 ? t('purchases.noSuggestions') : null);
        setLines((ls) => [...ls, ...fresh]);
    };

    const submit = (e) => {
        e.preventDefault();
        setBusy(true);
        const payload = {
            supplier_id: supplierId,
            expected_at: expectedAt || null,
            note: note || null,
            lines: lines.map(({ product_id, quantity, unit_cost, vat_rate }) => ({ product_id, quantity, unit_cost, vat_rate })),
        };
        const opts = { onError: setErrors, onFinish: () => setBusy(false) };
        if (order) router.put(`/achats/${order.id}`, payload, opts);
        else router.post('/achats', payload, opts);
    };

    const title = order ? `${t('purchases.edit')} ${order.reference}` : t('purchases.new');

    return (
        <>
            <Head title={title} />
            <PosLayout>
                <FlashToast />
                <form onSubmit={submit} className="flex flex-1 flex-col overflow-auto p-4 md:px-8 md:py-6">
                    <Link href="/achats" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
                        <ArrowLeft size={15} /> {t('purchases.title')}
                    </Link>
                    <h1 className="mb-5 text-xl font-bold text-slate-900">{title}</h1>

                    <div className="mb-4 grid gap-3 md:grid-cols-3">
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-500">{t('purchases.supplier')}</span>
                            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputCls} required>
                                <option value="">{t('purchases.chooseSupplier')}</option>
                                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            {errors.supplier_id && <span className="text-xs text-red-600">{errors.supplier_id}</span>}
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-500">{t('purchases.expected')}</span>
                            <input type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} className={inputCls} />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-500">{t('purchases.note')}</span>
                            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
                        </label>
                    </div>

                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <div className="min-w-60 flex-1 md:max-w-md">
                            <ProductPicker products={products} excludeIds={lines.map((l) => l.product_id)} onPick={(p) => setLines((ls) => [...ls, fromProduct(p)])} />
                        </div>
                        <button type="button" onClick={suggest} className={ghostBtn}>
                            <Sparkles size={15} /> {t('purchases.suggest')}
                        </button>
                        {info && <span className="text-sm text-slate-500">{info}</span>}
                    </div>
                    {(errors.lines || Object.keys(errors).some((k) => k.startsWith('lines.'))) && (
                        <div className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
                            {errors.lines ?? Object.entries(errors).find(([k]) => k.startsWith('lines.'))?.[1]}
                        </div>
                    )}
                    {errors.purchase && <div className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{errors.purchase}</div>}

                    <div className="overflow-auto rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                        {lines.length === 0 ? (
                            <p className="p-6 text-center text-sm text-slate-400">{t('purchases.noLines')}</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">{t('purchases.product')}</th>
                                        <th className="w-28 px-2 py-3">{t('purchases.qty')}</th>
                                        <th className="w-36 px-2 py-3">{t('purchases.unitCost')}</th>
                                        <th className="w-24 px-2 py-3">{t('purchases.vat')}</th>
                                        <th className="px-4 py-3 text-right">{t('purchases.lineTotal')}</th>
                                        <th className="w-10" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {lines.map((l, i) => (
                                        <tr key={l.product_id}>
                                            <td className="px-4 py-2 font-medium text-slate-800">{l.name}</td>
                                            <td className="px-2 py-2"><input type="number" min="1" value={l.quantity} onChange={(e) => patch(i, 'quantity', e.target.value)} className={inputCls} required /></td>
                                            <td className="px-2 py-2"><input type="number" min="0" step="0.01" value={l.unit_cost} onChange={(e) => patch(i, 'unit_cost', e.target.value)} className={inputCls} required /></td>
                                            <td className="px-2 py-2">
                                                <select value={l.vat_rate} onChange={(e) => patch(i, 'vat_rate', Number(e.target.value))} className={inputCls}>
                                                    {VAT_RATES.map((v) => <option key={v} value={v}>{v}%</option>)}
                                                </select>
                                            </td>
                                            <td className="px-4 py-2 text-right tabular-nums">{formatCurrency((Number(l.quantity) || 0) * (Number(l.unit_cost) || 0))}</td>
                                            <td className="px-2 py-2">
                                                <button type="button" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                        <dl className="space-y-1 text-sm">
                            <div className="flex gap-6"><dt className="w-28 text-slate-500">{t('purchases.totalHt')}</dt><dd className="tabular-nums">{formatCurrency(totals.ht)}</dd></div>
                            <div className="flex gap-6"><dt className="w-28 text-slate-500">{t('purchases.totalVat')}</dt><dd className="tabular-nums">{formatCurrency(totals.vat)}</dd></div>
                            <div className="flex gap-6 font-bold"><dt className="w-28">{t('purchases.totalTtc')}</dt><dd className="tabular-nums">{formatCurrency(totals.ttc)}</dd></div>
                        </dl>
                        <button type="submit" disabled={busy || lines.length === 0} className={primaryBtn}>{t('purchases.save')}</button>
                    </div>
                </form>
            </PosLayout>
        </>
    );
}
