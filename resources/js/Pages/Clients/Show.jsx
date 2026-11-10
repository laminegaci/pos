import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { ArrowLeft, Banknote, FileText, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PosLayout from '../../Layouts/PosLayout';
import { formatCurrency } from '../../lib/formatCurrency';
import FlashToast, { ghostBtn, inputCls, primaryBtn } from '../../Components/Purchasing/FlashToast';

const statusTone = {
    paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    partial: 'bg-sky-50 text-sky-700 ring-sky-200',
    unpaid: 'bg-amber-50 text-amber-700 ring-amber-200',
    overdue: 'bg-red-50 text-red-700 ring-red-200',
};

function Stat({ label, value, tone = '' }) {
    return (
        <div className="rounded-2xl border border-slate-200/60 bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
            <div className={`text-lg font-bold tabular-nums ${tone || 'text-slate-900'}`}>{value}</div>
        </div>
    );
}

export default function ClientShow({ client, creditSales, payments, history, methods, canManage }) {
    const { t, i18n } = useTranslation();
    const [tab, setTab] = useState('creditSales');
    const [paying, setPaying] = useState(false);
    const [form, setForm] = useState({ amount: '', method: 'cash', reference: '' });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const [period, setPeriod] = useState({ from: '', to: '' });
    const date = (d) => (d ? new Date(d).toLocaleDateString(i18n.resolvedLanguage) : '—');

    const openPay = () => {
        setForm({ amount: client.balance > 0 ? String(client.balance) : '', method: 'cash', reference: '' });
        setErrors({});
        setPaying(true);
    };

    const pay = (e) => {
        e.preventDefault();
        setBusy(true);
        router.post(`/clients/${client.id}/reglements`, form, {
            preserveScroll: true,
            onError: setErrors,
            onSuccess: () => setPaying(false),
            onFinish: () => setBusy(false),
        });
    };

    const removePayment = (id) => {
        if (window.confirm(t('clients.deletePayment'))) router.delete(`/reglements-clients/${id}`, { preserveScroll: true });
    };

    const statementUrl = () => {
        const q = new URLSearchParams({ stream: '1' });
        if (period.from) q.set('from', period.from);
        if (period.to) q.set('to', period.to);
        return `/clients/${client.id}/releve?${q.toString()}`;
    };

    const tabs = [
        ['creditSales', t('clients.tabs.creditSales'), creditSales.length],
        ['payments', t('clients.tabs.payments'), payments.length],
        ['history', t('clients.tabs.history'), history.length],
    ];

    return (
        <>
            <Head title={client.name} />
            <PosLayout>
                <FlashToast />
                <div className="flex flex-1 flex-col overflow-auto p-4 md:px-8 md:py-6">
                    <Link href="/clients" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
                        <ArrowLeft size={15} /> {t('clients.back')}
                    </Link>

                    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">{client.name}</h1>
                            <p className="text-sm text-slate-500">{[client.phone, client.email, client.city].filter(Boolean).join(' · ')}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button onClick={openPay} disabled={client.balance <= 0} className={primaryBtn}>
                                <Banknote size={16} /> {t('clients.collect')}
                            </button>
                        </div>
                    </div>

                    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Stat label={t('clients.balance')} value={formatCurrency(client.balance)} tone={client.balance > 0 ? 'text-red-600' : ''} />
                        <Stat label={t('clients.overdue')} value={formatCurrency(client.overdue)} tone={client.overdue > 0 ? 'text-red-600' : ''} />
                        <Stat label={t('clients.creditLimit')} value={client.credit_limit === null ? t('clients.unlimited') : formatCurrency(client.credit_limit)} />
                        <Stat label={t('clients.available')} value={client.available === null ? t('clients.unlimited') : formatCurrency(Math.max(0, client.available))} />
                    </div>

                    <div className="mb-5 flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200/60 bg-white p-3">
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-500">{t('clients.statementFrom')}</span>
                            <input type="date" value={period.from} onChange={(e) => setPeriod({ ...period, from: e.target.value })} className={inputCls} />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-500">{t('clients.statementTo')}</span>
                            <input type="date" value={period.to} onChange={(e) => setPeriod({ ...period, to: e.target.value })} className={inputCls} />
                        </label>
                        <a href={statementUrl()} target="_blank" rel="noreferrer" className={ghostBtn}>
                            <FileText size={15} /> {t('clients.statement')}
                        </a>
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

                    <div className="overflow-auto rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                        {tab === 'creditSales' && (
                            creditSales.length === 0 ? <p className="p-6 text-sm text-slate-400">{t('clients.noCreditSales')}</p> : (
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="px-4 py-3">{t('clients.ticket')}</th>
                                            <th className="px-4 py-3">{t('clients.date')}</th>
                                            <th className="px-4 py-3">{t('clients.dueDate')}</th>
                                            <th className="px-4 py-3 text-right">{t('clients.credit')}</th>
                                            <th className="px-4 py-3 text-right">{t('clients.outstanding')}</th>
                                            <th className="px-4 py-3" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {creditSales.map((s) => (
                                            <tr key={s.id} className="hover:bg-slate-50/60">
                                                <td className="px-4 py-3 font-semibold"><Link href={`/ventes/${s.id}`} className="hover:text-indigo-600">#{s.id}</Link></td>
                                                <td className="px-4 py-3 text-slate-500">{date(s.created_at)}</td>
                                                <td className="px-4 py-3 text-slate-500">{date(s.due_at)}</td>
                                                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(s.credit_amount)}</td>
                                                <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(s.outstanding)}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusTone[s.status]}`}>{t(`clients.status.${s.status}`)}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )
                        )}

                        {tab === 'payments' && (
                            payments.length === 0 ? <p className="p-6 text-sm text-slate-400">{t('clients.noPayments')}</p> : (
                                <table className="w-full text-sm">
                                    <tbody className="divide-y divide-slate-100">
                                        {payments.map((p) => (
                                            <tr key={p.id} className="hover:bg-slate-50/60">
                                                <td className="px-4 py-3 text-slate-500">{date(p.paid_at)}</td>
                                                <td className="px-4 py-3">{t(`clients.methods.${p.method}`)}</td>
                                                <td className="px-4 py-3 text-slate-500">{p.reference}</td>
                                                <td className="px-4 py-3 text-xs text-slate-400">{t('clients.settles')} {p.sales.map((id) => `#${id}`).join(', ')}</td>
                                                <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(p.amount)}</td>
                                                <td className="px-4 py-3 text-right">
                                                    {canManage && (
                                                        <button onClick={() => removePayment(p.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )
                        )}

                        {tab === 'history' && (
                            history.length === 0 ? <p className="p-6 text-sm text-slate-400">{t('clients.noHistory')}</p> : (
                                <table className="w-full text-sm">
                                    <tbody className="divide-y divide-slate-100">
                                        {history.map((s) => (
                                            <tr key={s.id} className="hover:bg-slate-50/60">
                                                <td className="px-4 py-3 font-semibold"><Link href={`/ventes/${s.id}`} className="hover:text-indigo-600">#{s.id}</Link></td>
                                                <td className="px-4 py-3 text-slate-500">{date(s.created_at)}</td>
                                                <td className="px-4 py-3 text-slate-500">{s.payment_method ? t(`clients.methods.${s.payment_method}`) : '—'}</td>
                                                <td className="px-4 py-3 text-xs text-slate-400">{s.status === 'cancelled' ? t('clients.cancelledSale') : ''}</td>
                                                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(s.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )
                        )}
                    </div>
                </div>

                {paying && (
                    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
                        <form onSubmit={pay} className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-5 shadow-xl">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-900">{t('clients.collectTitle')}</h2>
                                <button type="button" onClick={() => setPaying(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
                            </div>
                            <p className="text-xs text-slate-500">{t('clients.settlesHint')}</p>
                            <label className="block">
                                <span className="mb-1 block text-xs font-medium text-slate-500">{t('clients.amount')}</span>
                                <input type="number" step="0.01" min="0.01" max={client.balance} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} autoFocus required />
                                {errors.amount && <span className="text-xs text-red-600">{errors.amount}</span>}
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs font-medium text-slate-500">{t('clients.method')}</span>
                                <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className={inputCls}>
                                    {methods.map((m) => <option key={m} value={m}>{t(`clients.methods.${m}`)}</option>)}
                                </select>
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs font-medium text-slate-500">{t('clients.reference')}</span>
                                <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className={inputCls} />
                            </label>
                            <div className="flex justify-end gap-2 pt-1">
                                <button type="button" onClick={() => setPaying(false)} className={ghostBtn}>{t('clients.cancel')}</button>
                                <button type="submit" disabled={busy} className={primaryBtn}>{t('clients.save')}</button>
                            </div>
                        </form>
                    </div>
                )}
            </PosLayout>
        </>
    );
}
