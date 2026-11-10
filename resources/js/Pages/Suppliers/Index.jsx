import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { Building2, Plus, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PosLayout from '../../Layouts/PosLayout';
import { formatCurrency } from '../../lib/formatCurrency';
import FlashToast, { ghostBtn, inputCls, primaryBtn } from '../../Components/Purchasing/FlashToast';

const empty = {
    name: '', contact_name: '', phone: '', email: '', address: '', tax_id: '', rc: '', payment_terms_days: '', note: '',
};

export function SupplierModal({ supplier, onClose }) {
    const { t } = useTranslation();
    const [form, setForm] = useState(supplier ? { ...empty, ...Object.fromEntries(Object.entries(supplier).filter(([k]) => k in empty).map(([k, v]) => [k, v ?? ''])) } : empty);
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = (e) => {
        e.preventDefault();
        setBusy(true);
        const opts = { preserveScroll: true, onError: setErrors, onSuccess: onClose, onFinish: () => setBusy(false) };
        const payload = { ...form, payment_terms_days: form.payment_terms_days === '' ? null : form.payment_terms_days };
        if (supplier) router.put(`/fournisseurs/${supplier.id}`, payload, opts);
        else router.post('/fournisseurs', payload, opts);
    };

    const field = (k, label, props = {}) => (
        <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
            <input value={form[k]} onChange={set(k)} className={inputCls} {...props} />
            {errors[k] && <span className="text-xs text-red-600">{errors[k]}</span>}
        </label>
    );

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
            <form onSubmit={submit} className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-auto rounded-2xl bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">{supplier ? t('suppliers.edit') : t('suppliers.new')}</h2>
                    <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                        <X size={18} />
                    </button>
                </div>
                {field('name', t('suppliers.name'), { required: true, autoFocus: true })}
                <div className="grid grid-cols-2 gap-3">
                    {field('contact_name', t('suppliers.contact'))}
                    {field('phone', t('suppliers.phone'))}
                    {field('email', t('suppliers.email'), { type: 'email' })}
                    {field('payment_terms_days', t('suppliers.terms'), { type: 'number', min: 0 })}
                    {field('tax_id', t('suppliers.taxId'))}
                    {field('rc', t('suppliers.rc'))}
                </div>
                {field('address', t('suppliers.address'))}
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-500">{t('suppliers.note')}</span>
                    <textarea value={form.note} onChange={set('note')} rows={2} className={inputCls} />
                </label>
                <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={onClose} className={ghostBtn}>{t('suppliers.cancel')}</button>
                    <button type="submit" disabled={busy} className={primaryBtn}>{t('suppliers.save')}</button>
                </div>
            </form>
        </div>
    );
}

export default function SuppliersIndex({ suppliers, totalDebt }) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, object = edit

    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        return suppliers.filter((s) => !q || [s.name, s.contact_name, s.phone].some((v) => v && v.toLowerCase().includes(q)));
    }, [suppliers, query]);

    return (
        <>
            <Head title={t('suppliers.title')} />
            <PosLayout>
                <FlashToast />
                <div className="flex flex-1 flex-col overflow-hidden p-4 md:px-8 md:py-6">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">{t('suppliers.title')}</h1>
                            <p className="text-sm text-slate-500">{t('suppliers.subtitle')}</p>
                        </div>
                        <button onClick={() => setEditing(null)} className={primaryBtn}>
                            <Plus size={16} /> {t('suppliers.new')}
                        </button>
                    </div>

                    <div className="mb-4 flex flex-wrap items-center gap-3">
                        <div className="rounded-2xl border border-slate-200/60 bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                            <div className="text-xs uppercase tracking-wide text-slate-500">{t('suppliers.totalDebt')}</div>
                            <div className="text-lg font-bold tabular-nums text-slate-900">{formatCurrency(totalDebt)}</div>
                        </div>
                        <div className="relative min-w-60 flex-1 md:max-w-sm">
                            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('suppliers.search')} className={`${inputCls} pl-9`} />
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                        {rows.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-slate-400">
                                <Building2 size={36} />
                                <p className="text-sm">{t('suppliers.empty')}</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">{t('suppliers.name')}</th>
                                        <th className="px-4 py-3">{t('suppliers.contact')}</th>
                                        <th className="px-4 py-3">{t('suppliers.phone')}</th>
                                        <th className="px-4 py-3 text-right">{t('suppliers.balance')}</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {rows.map((s) => (
                                        <tr key={s.id} className={`hover:bg-slate-50/60 ${s.active ? '' : 'opacity-60'}`}>
                                            <td className="px-4 py-3 font-semibold text-slate-900">
                                                <Link href={`/fournisseurs/${s.id}`} className="hover:text-indigo-600">{s.name}</Link>
                                                {!s.active && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{t('suppliers.inactive')}</span>}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{s.contact_name}</td>
                                            <td className="px-4 py-3 text-slate-600">{s.phone}</td>
                                            <td className={`px-4 py-3 text-right font-semibold tabular-nums ${s.balance > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                                                {formatCurrency(s.balance)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => setEditing(s)} className="rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50">
                                                    {t('suppliers.edit')}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
                {editing !== undefined && <SupplierModal supplier={editing} onClose={() => setEditing(undefined)} />}
            </PosLayout>
        </>
    );
}
