import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { ArrowLeft, Banknote, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PosLayout from '../../Layouts/PosLayout';
import { formatCurrency } from '../../lib/formatCurrency';
import FlashToast, { ghostBtn, inputCls, primaryBtn, statusTone } from '../../Components/Purchasing/FlashToast';
import { SupplierModal } from './Index';

export default function SupplierShow({ supplier, orders, receptions, payments, methods }) {
    const { t, i18n } = useTranslation();
    const [tab, setTab] = useState('orders');
    const [editing, setEditing] = useState(false);
    const [paying, setPaying] = useState(false);
    const [form, setForm] = useState({ amount: '', method: 'cash', reference: '' });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const date = (d) => new Date(d).toLocaleDateString(i18n.resolvedLanguage);

    const openPay = () => {
        setForm({ amount: supplier.balance > 0 ? String(supplier.balance) : '', method: 'cash', reference: '' });
        setErrors({});
        setPaying(true);
    };

    const pay = (e) => {
        e.preventDefault();
        setBusy(true);
        router.post(`/fournisseurs/${supplier.id}/paiements`, form, {
            preserveScroll: true,
            onError: setErrors,
            onSuccess: () => setPaying(false),
            onFinish: () => setBusy(false),
        });
    };

    const removePayment = (id) => {
        if (window.confirm(t('suppliers.deletePayment'))) router.delete(`/paiements-fournisseurs/${id}`, { preserveScroll: true });
    };

    const remove = () => {
        if (window.confirm(t('suppliers.confirmDelete'))) router.delete(`/fournisseurs/${supplier.id}`);
    };

    const tabs = [
        ['orders', t('suppliers.orders'), orders.length],
        ['receptions', t('suppliers.receptions'), receptions.length],
        ['payments', t('suppliers.payments'), payments.length],
    ];

    return (
        <>
            <Head title={supplier.name} />
            <PosLayout>
                <FlashToast />
                <div className="flex flex-1 flex-col overflow-auto p-4 md:px-8 md:py-6">
                    <Link href="/fournisseurs" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
                        <ArrowLeft size={15} /> {t('suppliers.title')}
                    </Link>

                    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">{supplier.name}</h1>
                            <p className="text-sm text-slate-500">
                                {[supplier.contact_name, supplier.phone, supplier.email].filter(Boolean).join(' · ')}
                            </p>
                            {supplier.address && <p className="text-sm text-slate-400">{supplier.address}</p>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="rounded-2xl border border-slate-200/60 bg-white px-4 py-2 text-right">
                                <div className="text-xs uppercase tracking-wide text-slate-500">{t('suppliers.balance')}</div>
                                <div className={`text-lg font-bold tabular-nums ${supplier.balance > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                                    {formatCurrency(supplier.balance)}
                                </div>
                            </div>
                            <button onClick={openPay} disabled={supplier.balance <= 0} className={primaryBtn}>
                                <Banknote size={16} /> {t('suppliers.pay')}
                            </button>
                            <button onClick={() => setEditing(true)} className={ghostBtn}>{t('suppliers.edit')}</button>
                            <button onClick={remove} className={`${ghostBtn} text-red-600`} title={t('suppliers.deactivate')}>
                                <Trash2 size={15} />
                            </button>
                        </div>
                    </div>

                    <div className="mb-3 flex gap-1 border-b border-slate-200">
                        {tabs.map(([key, label, count]) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === key ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                {label} <span className="text-xs text-slate-400">({count})</span>
                            </button>
                        ))}
                    </div>

                    <div className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                        {tab === 'orders' && (
                            orders.length === 0 ? <p className="p-6 text-sm text-slate-400">{t('suppliers.noOrders')}</p> : (
                                <table className="w-full text-sm">
                                    <tbody className="divide-y divide-slate-100">
                                        {orders.map((o) => (
                                            <tr key={o.id} className="hover:bg-slate-50/60">
                                                <td className="px-4 py-3 font-semibold"><Link href={`/achats/${o.id}`} className="hover:text-indigo-600">{o.reference}</Link></td>
                                                <td className="px-4 py-3 text-slate-500">{date(o.created_at)}</td>
                                                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusTone[o.status]}`}>{t(`purchases.statuses.${o.status}`)}</span></td>
                                                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(o.total_ttc)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )
                        )}
                        {tab === 'receptions' && (
                            receptions.length === 0 ? <p className="p-6 text-sm text-slate-400">{t('suppliers.noReceptions')}</p> : (
                                <table className="w-full text-sm">
                                    <tbody className="divide-y divide-slate-100">
                                        {receptions.map((r) => (
                                            <tr key={r.id} className="hover:bg-slate-50/60">
                                                <td className="px-4 py-3 font-semibold"><Link href={`/receptions/${r.id}`} className="hover:text-indigo-600">{r.reference}</Link></td>
                                                <td className="px-4 py-3 text-slate-500">{date(r.received_at)}</td>
                                                <td className="px-4 py-3 text-slate-500">{r.supplier_invoice_ref}</td>
                                                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(r.total_ttc)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )
                        )}
                        {tab === 'payments' && (
                            payments.length === 0 ? <p className="p-6 text-sm text-slate-400">{t('suppliers.noPayments')}</p> : (
                                <table className="w-full text-sm">
                                    <tbody className="divide-y divide-slate-100">
                                        {payments.map((p) => (
                                            <tr key={p.id} className="hover:bg-slate-50/60">
                                                <td className="px-4 py-3 text-slate-500">{date(p.paid_at)}</td>
                                                <td className="px-4 py-3">{t(`suppliers.methods.${p.method}`)}</td>
                                                <td className="px-4 py-3 text-slate-500">{p.reference}</td>
                                                <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(p.amount)}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <button onClick={() => removePayment(p.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )
                        )}
                    </div>
                </div>

                {editing && <SupplierModal supplier={supplier} onClose={() => setEditing(false)} />}
                {paying && (
                    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
                        <form onSubmit={pay} className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-5 shadow-xl">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-900">{t('suppliers.payTitle')}</h2>
                                <button type="button" onClick={() => setPaying(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
                            </div>
                            <label className="block">
                                <span className="mb-1 block text-xs font-medium text-slate-500">{t('suppliers.amount')}</span>
                                <input type="number" step="0.01" min="0.01" max={supplier.balance} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} autoFocus required />
                                {errors.amount && <span className="text-xs text-red-600">{errors.amount}</span>}
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs font-medium text-slate-500">{t('suppliers.method')}</span>
                                <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className={inputCls}>
                                    {methods.map((m) => <option key={m} value={m}>{t(`suppliers.methods.${m}`)}</option>)}
                                </select>
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs font-medium text-slate-500">{t('suppliers.reference')}</span>
                                <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className={inputCls} />
                            </label>
                            <div className="flex justify-end gap-2 pt-1">
                                <button type="button" onClick={() => setPaying(false)} className={ghostBtn}>{t('suppliers.cancel')}</button>
                                <button type="submit" disabled={busy} className={primaryBtn}>{t('suppliers.save')}</button>
                            </div>
                        </form>
                    </div>
                )}
            </PosLayout>
        </>
    );
}
