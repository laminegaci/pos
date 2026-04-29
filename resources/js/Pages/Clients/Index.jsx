import { Head, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    Building2,
    Download,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Plus,
    Search,
    Trash2,
    Upload,
    User,
    Users,
    Wallet,
    X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PosLayout from '../../Layouts/PosLayout';
import { formatCurrency } from '../../lib/formatCurrency';

function StatCard({ icon: Icon, label, value, tone = 'indigo', hint }) {
    const tones = {
        indigo: 'from-indigo-500 to-violet-500',
        emerald: 'from-emerald-500 to-teal-500',
        amber: 'from-amber-500 to-orange-500',
        sky: 'from-sky-500 to-cyan-500',
    };
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:gap-4 sm:p-4">
            <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tones[tone]} text-white shadow-sm sm:h-11 sm:w-11`}
            >
                <Icon size={18} className="sm:hidden" />
                <Icon size={20} className="hidden sm:block" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs">{label}</div>
                <div className="truncate text-base font-bold text-slate-900 sm:text-xl">{value}</div>
                {hint && <div className="text-xs text-slate-400">{hint}</div>}
            </div>
        </div>
    );
}

function initials(name) {
    return name
        .split(/\s+/)
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function formatDate(iso) {
    if (!iso) return '—';
    try {
        return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
    } catch {
        return '—';
    }
}

export default function ClientsIndex({ clients }) {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState(emptyForm());

    function emptyForm() {
        return {
            name: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            type: 'particulier',
            notes: '',
            active: true,
        };
    }

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return clients.filter((c) => {
            if (filterType !== 'all' && c.type !== filterType) return false;
            if (!q) return true;
            return (
                c.name.toLowerCase().includes(q) ||
                (c.email || '').toLowerCase().includes(q) ||
                (c.phone || '').toLowerCase().includes(q) ||
                (c.city || '').toLowerCase().includes(q)
            );
        });
    }, [clients, searchQuery, filterType]);

    const stats = useMemo(() => {
        const total = clients.length;
        const pro = clients.filter((c) => c.type === 'professionnel').length;
        const particulier = total - pro;
        const revenue = clients.reduce((acc, c) => acc + (c.total_spent || 0), 0);
        return { total, pro, particulier, revenue };
    }, [clients]);

    function openCreate() {
        setEditing(null);
        setFormData(emptyForm());
        setErrors({});
        setShowModal(true);
    }

    function openEdit(c) {
        setEditing(c);
        setFormData({
            name: c.name || '',
            email: c.email || '',
            phone: c.phone || '',
            address: c.address || '',
            city: c.city || '',
            type: c.type || 'particulier',
            notes: c.notes || '',
            active: !!c.active,
        });
        setErrors({});
        setShowModal(true);
    }

    function closeModal() {
        setShowModal(false);
        setEditing(null);
        setErrors({});
    }

    function submit(e) {
        e.preventDefault();
        setSubmitting(true);
        setErrors({});
        const payload = { ...formData };
        const opts = {
            onSuccess: () => {
                setSubmitting(false);
                closeModal();
            },
            onError: (errs) => {
                setSubmitting(false);
                setErrors(errs);
            },
            preserveScroll: true,
        };
        if (editing) {
            router.put(`/clients/${editing.id}`, payload, opts);
        } else {
            router.post('/clients', payload, opts);
        }
    }

    function remove(c) {
        if (!confirm(t('clients.confirmDelete', { name: c.name }))) return;
        router.delete(`/clients/${c.id}`, { preserveScroll: true });
    }

    return (
        <PosLayout>
            <Head title={t('clients.title')} />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-3 sm:p-5 lg:p-6">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3 lg:mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{t('clients.title')}</h1>
                        <p className="text-xs text-slate-500 sm:text-sm">{t('clients.subtitle')}</p>
                    </div>
                    <button
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-violet-700 sm:px-4 sm:py-2.5"
                    >
                        <Plus size={16} /> <span className="hidden sm:inline">{t('clients.newClient')}</span><span className="sm:hidden">{t('clients.newClientShort')}</span>
                    </button>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:mb-6 lg:grid-cols-4">
                    <StatCard icon={Users} label={t('clients.totalClients')} value={stats.total} tone="indigo" />
                    <StatCard icon={Building2} label={t('clients.professionals')} value={stats.pro} tone="sky" />
                    <StatCard icon={User} label={t('clients.individuals')} value={stats.particulier} tone="emerald" />
                    <StatCard icon={Wallet} label={t('clients.revenueGenerated')} value={formatCurrency(stats.revenue)} tone="amber" />
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="relative w-full min-w-0 flex-1 sm:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('clients.searchClient')}
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                        />
                    </div>
                    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                        {[
                            { id: 'all', label: t('clients.all') },
                            { id: 'particulier', label: t('clients.individuals') },
                            { id: 'professionnel', label: t('clients.pros') },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setFilterType(tab.id)}
                                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                                    filterType === tab.id
                                        ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                        <button
                            onClick={() => window.location.href = '/clients/export'}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:text-slate-900"
                            title={t('common.export')}
                        >
                            <Download size={15} />
                        </button>
                        <label
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:text-slate-900"
                            title={t('common.import')}
                        >
                            <Upload size={15} />
                            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" />
                        </label>
                    </div>
                </div>

                {/* Mobile cards (md and below) */}
                <div className="flex-1 space-y-3 overflow-y-auto md:hidden">
                    {filtered.length === 0 && (
                        <div className="rounded-2xl border border-slate-200/60 bg-white p-8 text-center text-sm text-slate-400">
                            {t('clients.noClientFound')}
                        </div>
                    )}
                    {filtered.map((c) => (
                        <div key={c.id} className="rounded-2xl border border-slate-200/60 bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                            <div className="flex items-start gap-3">
                                <div
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                                        c.type === 'professionnel'
                                            ? 'bg-gradient-to-br from-sky-500 to-cyan-500'
                                            : 'bg-gradient-to-br from-emerald-500 to-teal-500'
                                    }`}
                                >
                                    {initials(c.name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="truncate font-semibold text-slate-900">{c.name}</div>
                                            <div className="truncate text-xs text-slate-500">{c.city || '—'}</div>
                                        </div>
                                        <span
                                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${
                                                c.type === 'professionnel'
                                                    ? 'bg-sky-50 text-sky-700 ring-sky-200'
                                                    : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                            }`}
                                        >
                                            {c.type === 'professionnel' ? t('clients.pro') : t('clients.individual')}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex flex-col gap-0.5 text-xs text-slate-600">
                                        {c.email && (
                                            <span className="inline-flex items-center gap-1 truncate">
                                                <Mail size={11} /> {c.email}
                                            </span>
                                        )}
                                        {c.phone && (
                                            <span className="inline-flex items-center gap-1">
                                                <Phone size={11} /> {c.phone}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                                        <div className="text-xs text-slate-500">
                                            <span className="tabular-nums">{c.sales_count}</span> {t('navigation.sales').toLowerCase()} ·{' '}
                                            <span className="font-semibold text-indigo-600 tabular-nums">{formatCurrency(c.total_spent)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => openEdit(c)}
                                                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600"
                                                aria-label={t('common.edit')}
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                onClick={() => remove(c)}
                                                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                                                aria-label={t('common.delete')}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop table (md and up) */}
                <div className="hidden flex-1 overflow-auto rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] md:block">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-50/80 backdrop-blur">
                            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <th className="px-4 py-3">{t('sales.client')}</th>
                                <th className="px-4 py-3">{t('clients.contact')}</th>
                                <th className="px-4 py-3">{t('clients.city')}</th>
                                <th className="px-4 py-3">{t('clients.type')}</th>
                                <th className="px-4 py-3 text-right">{t('clients.salesCount')}</th>
                                <th className="px-4 py-3 text-right">{t('clients.totalSpent')}</th>
                                <th className="px-4 py-3">{t('clients.lastPurchase')}</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                                        {t('clients.noClientFound')}
                                    </td>
                                </tr>
                            )}
                            {filtered.map((c) => (
                                <tr key={c.id} className="hover:bg-slate-50/60">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white ${
                                                    c.type === 'professionnel'
                                                        ? 'bg-gradient-to-br from-sky-500 to-cyan-500'
                                                        : 'bg-gradient-to-br from-emerald-500 to-teal-500'
                                                }`}
                                            >
                                                {initials(c.name)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900">{c.name}</div>
                                                {c.address && (
                                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                                        <MapPin size={11} /> {c.address}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-0.5 text-xs text-slate-600">
                                            {c.email && (
                                                <span className="inline-flex items-center gap-1">
                                                    <Mail size={11} /> {c.email}
                                                </span>
                                            )}
                                            {c.phone && (
                                                <span className="inline-flex items-center gap-1">
                                                    <Phone size={11} /> {c.phone}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{c.city || '—'}</td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
                                                c.type === 'professionnel'
                                                    ? 'bg-sky-50 text-sky-700 ring-sky-200'
                                                    : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                            }`}
                                        >
                                            {c.type === 'professionnel' ? t('clients.pro') : t('clients.individual')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{c.sales_count}</td>
                                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-indigo-600">
                                        {formatCurrency(c.total_spent)}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(c.last_purchase)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => openEdit(c)}
                                                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                onClick={() => remove(c)}
                                                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
                    <form
                        onSubmit={submit}
                        className="flex max-h-[95dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                            <h2 className="text-lg font-bold text-slate-900">
                                {editing ? t('clients.editClient') : t('clients.newClient')}
                            </h2>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto px-4 py-4 sm:grid-cols-2 sm:px-6 sm:py-5">
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs font-semibold text-slate-600">{t('clients.name')} *</label>
                                <input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                                />
                                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">{t('clients.type')}</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                                >
                                    <option value="particulier">{t('clients.individual')}</option>
                                    <option value="professionnel">{t('clients.professional')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">{t('clients.city')}</label>
                                <input
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">{t('clients.email')}</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                                />
                                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">{t('clients.phone')}</label>
                                <input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs font-semibold text-slate-600">{t('clients.address')}</label>
                                <input
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs font-semibold text-slate-600">{t('clients.notes')}</label>
                                <textarea
                                    rows={3}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                                />
                            </div>
                            <label className="inline-flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
                                <input
                                    type="checkbox"
                                    checked={formData.active}
                                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                {t('clients.active')}
                            </label>
                        </div>
                        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-6">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50"
                            >
                                {submitting ? t('common.saving') : editing ? t('common.update') : t('common.create')}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </PosLayout>
    );
}
