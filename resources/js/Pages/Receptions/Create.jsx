import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PosLayout from '../../Layouts/PosLayout';
import { formatCurrency } from '../../lib/formatCurrency';
import ProductPicker from '../../Components/Purchasing/ProductPicker';
import FlashToast, { ghostBtn, inputCls, primaryBtn, round2, totalsOf } from '../../Components/Purchasing/FlashToast';

const VAT_RATES = [0, 9, 19];

/** Same formula as ReceptionService::weightedCost, to preview the new average cost. */
function previewCost(stock, oldCost, qty, unitCost, unlimited) {
    const q = Number(qty) || 0;
    const c = Number(unitCost) || 0;
    if (unlimited || stock <= 0 || oldCost === null || oldCost === undefined) return round2(c);
    if (q <= 0) return round2(Number(oldCost));
    return round2((stock * Number(oldCost) + q * c) / (stock + q));
}

export default function ReceptionCreate({ order, supplier, lines: orderLines, suppliers, products, methods }) {
    const { t } = useTranslation();
    const fromOrder = !!order;
    const [supplierId, setSupplierId] = useState('');
    const [invoiceRef, setInvoiceRef] = useState('');
    const [note, setNote] = useState('');
    const [lines, setLines] = useState(
        orderLines.map((l) => ({
            product_id: l.product_id,
            name: l.product?.name,
            stock: l.product?.stock ?? 0,
            old_cost: l.product?.cost_price ?? null,
            unlimited: !!l.product?.unlimited_stock,
            max: l.remaining,
            quantity: l.remaining,
            unit_cost: Number(l.unit_cost),
            vat_rate: Number(l.vat_rate),
        })),
    );
    const [payNow, setPayNow] = useState(false);
    const [payment, setPayment] = useState({ amount: '', method: methods[0] ?? 'cash' });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const totals = totalsOf(lines);

    const patch = (i, key, value) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)));

    const addProduct = (p) =>
        setLines((ls) => [
            ...ls,
            {
                product_id: p.id,
                name: p.name,
                stock: p.stock ?? 0,
                old_cost: p.cost_price ?? null,
                unlimited: !!p.unlimited_stock,
                max: null,
                quantity: 1,
                unit_cost: p.cost_price !== null && p.cost_price !== undefined ? Number(p.cost_price) : 0,
                vat_rate: Number(p.vat_rate ?? 0),
            },
        ]);

    const submit = (e) => {
        e.preventDefault();
        setBusy(true);
        router.post('/receptions', {
            purchase_order_id: order?.id ?? null,
            supplier_id: fromOrder ? null : supplierId,
            supplier_invoice_ref: invoiceRef || null,
            note: note || null,
            lines: lines.map(({ product_id, quantity, unit_cost, vat_rate }) => ({ product_id, quantity: Number(quantity) || 0, unit_cost, vat_rate })),
            payment: payNow && Number(payment.amount) > 0 ? payment : null,
        }, { onError: setErrors, onFinish: () => setBusy(false) });
    };

    const errorList = Object.entries(errors).filter(([k]) => k === 'reception' || k === 'amount' || k.startsWith('lines') || k.startsWith('payment'));

    return (
        <>
            <Head title={t('purchases.receptionTitle')} />
            <PosLayout>
                <FlashToast />
                <form onSubmit={submit} className="flex flex-1 flex-col overflow-auto p-4 md:px-8 md:py-6">
                    <Link href={fromOrder ? `/achats/${order.id}` : '/achats'} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
                        <ArrowLeft size={15} /> {fromOrder ? order.reference : t('purchases.title')}
                    </Link>
                    <h1 className="mb-5 text-xl font-bold text-slate-900">
                        {t('purchases.receptionTitle')}{fromOrder && ` — ${order.reference}`}
                    </h1>

                    <div className="mb-4 grid gap-3 md:grid-cols-3">
                        {fromOrder ? (
                            <div>
                                <span className="mb-1 block text-xs font-medium text-slate-500">{t('purchases.supplier')}</span>
                                <div className="py-2 text-sm font-semibold text-slate-800">{supplier.name}</div>
                            </div>
                        ) : (
                            <label className="block">
                                <span className="mb-1 block text-xs font-medium text-slate-500">{t('purchases.supplier')}</span>
                                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputCls} required>
                                    <option value="">{t('purchases.chooseSupplier')}</option>
                                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </label>
                        )}
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-500">{t('purchases.invoiceRef')}</span>
                            <input value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} className={inputCls} />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-500">{t('purchases.note')}</span>
                            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
                        </label>
                    </div>

                    {!fromOrder && (
                        <div className="mb-3 max-w-md">
                            <ProductPicker products={products} excludeIds={lines.map((l) => l.product_id)} onPick={addProduct} />
                        </div>
                    )}

                    {errorList.length > 0 && (
                        <div className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{errorList.map(([, v]) => v).join(' · ')}</div>
                    )}

                    <div className="overflow-auto rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                        {lines.length === 0 ? (
                            <p className="p-6 text-center text-sm text-slate-400">{t('purchases.noLines')}</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">{t('purchases.product')}</th>
                                        <th className="px-2 py-3 text-right">{t('purchases.currentStock')}</th>
                                        <th className="w-28 px-2 py-3">{t('purchases.qtyToReceive')}</th>
                                        <th className="w-36 px-2 py-3">{t('purchases.unitCost')}</th>
                                        <th className="w-24 px-2 py-3">{t('purchases.vat')}</th>
                                        <th className="px-4 py-3 text-right">{t('purchases.newCost')}</th>
                                        {!fromOrder && <th className="w-10" />}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {lines.map((l, i) => (
                                        <tr key={l.product_id}>
                                            <td className="px-4 py-2 font-medium text-slate-800">{l.name}</td>
                                            <td className="px-2 py-2 text-right tabular-nums text-slate-500">{l.unlimited ? '∞' : l.stock}</td>
                                            <td className="px-2 py-2">
                                                <input type="number" min="0" max={l.max ?? undefined} value={l.quantity} onChange={(e) => patch(i, 'quantity', e.target.value)} className={inputCls} />
                                                {l.max !== null && <span className="text-xs text-slate-400">/ {l.max}</span>}
                                            </td>
                                            <td className="px-2 py-2"><input type="number" min="0" step="0.01" value={l.unit_cost} onChange={(e) => patch(i, 'unit_cost', e.target.value)} className={inputCls} /></td>
                                            <td className="px-2 py-2">
                                                <select value={l.vat_rate} onChange={(e) => patch(i, 'vat_rate', Number(e.target.value))} className={inputCls}>
                                                    {VAT_RATES.map((v) => <option key={v} value={v}>{v}%</option>)}
                                                </select>
                                            </td>
                                            <td className="px-4 py-2 text-right tabular-nums">
                                                <span className="text-slate-400">{l.old_cost !== null && l.old_cost !== undefined ? formatCurrency(l.old_cost) : '—'} → </span>
                                                <span className="font-semibold">{formatCurrency(previewCost(l.stock, l.old_cost, l.quantity, l.unit_cost, l.unlimited))}</span>
                                            </td>
                                            {!fromOrder && (
                                                <td className="px-2 py-2">
                                                    <button type="button" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                                <input type="checkbox" checked={payNow} onChange={(e) => { setPayNow(e.target.checked); if (e.target.checked && !payment.amount) setPayment((p) => ({ ...p, amount: String(totals.ttc) })); }} />
                                {t('purchases.payNow')}
                            </label>
                            {payNow && (
                                <div className="flex gap-2">
                                    <input type="number" min="0" step="0.01" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} className={`${inputCls} w-36`} />
                                    <select value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })} className={`${inputCls} w-40`}>
                                        {methods.map((m) => <option key={m} value={m}>{t(`suppliers.methods.${m}`)}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        <dl className="space-y-1 text-sm">
                            <div className="flex gap-6"><dt className="w-28 text-slate-500">{t('purchases.totalHt')}</dt><dd className="tabular-nums">{formatCurrency(totals.ht)}</dd></div>
                            <div className="flex gap-6"><dt className="w-28 text-slate-500">{t('purchases.totalVat')}</dt><dd className="tabular-nums">{formatCurrency(totals.vat)}</dd></div>
                            <div className="flex gap-6 font-bold"><dt className="w-28">{t('purchases.totalTtc')}</dt><dd className="tabular-nums">{formatCurrency(totals.ttc)}</dd></div>
                        </dl>
                        <div className="flex gap-2">
                            <Link href={fromOrder ? `/achats/${order.id}` : '/achats'} className={ghostBtn}>{t('suppliers.cancel')}</Link>
                            <button type="submit" disabled={busy || lines.length === 0} className={primaryBtn}>{t('purchases.confirmReceive')}</button>
                        </div>
                    </div>
                </form>
            </PosLayout>
        </>
    );
}
