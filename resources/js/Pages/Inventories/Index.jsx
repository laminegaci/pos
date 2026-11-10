import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { ClipboardList, Download, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PosLayout from '../../Layouts/PosLayout';
import { formatCurrency } from '../../lib/formatCurrency';

const statusTone = {
    draft: 'bg-amber-50 text-amber-700 ring-amber-200',
    validated: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    cancelled: 'bg-slate-100 text-slate-500 ring-slate-200',
};

export default function InventoriesIndex({ inventories, categories, canManage }) {
    const { t, i18n } = useTranslation();
    const [category, setCategory] = useState('');
    const [starting, setStarting] = useState(false);
    const [errors, setErrors] = useState({});
    const hasDraft = inventories.some((i) => i.status === 'draft');
    const categoryLabel = (slug) => categories.find((c) => c.id === slug)?.label ?? slug;

    const start = () => {
        setStarting(true);
        router.post('/inventaires', { category_slug: category || null }, {
            onError: setErrors,
            onFinish: () => setStarting(false),
        });
    };

    return (
        <>
            <Head title={t('inventory.title')} />
            <PosLayout>
                <div className="flex flex-1 flex-col overflow-hidden p-4 md:px-8 md:py-6">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">{t('inventory.title')}</h1>
                            <p className="text-sm text-slate-500">{t('inventory.subtitle')}</p>
                        </div>
                        {canManage && !hasDraft && (
                            <div className="flex flex-wrap items-center gap-2">
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                    aria-label={t('inventory.scope')}
                                >
                                    <option value="">{t('inventory.allCatalogue')}</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.label}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={start}
                                    disabled={starting}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 disabled:opacity-60"
                                >
                                    <Plus size={16} /> {t('inventory.new')}
                                </button>
                            </div>
                        )}
                    </div>
                    {errors.inventory && <div className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{errors.inventory}</div>}

                    <div className="flex-1 overflow-auto rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                        {inventories.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-slate-400">
                                <ClipboardList size={36} />
                                <p className="text-sm">{t('inventory.empty')}</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">{t('inventory.reference')}</th>
                                        <th className="px-4 py-3">{t('common.date', { defaultValue: 'Date' })}</th>
                                        <th className="px-4 py-3">{t('inventory.scope')}</th>
                                        <th className="px-4 py-3 text-right">{t('inventory.progress')}</th>
                                        <th className="px-4 py-3 text-right">{t('inventory.gap')}</th>
                                        <th className="px-4 py-3">{t('inventory.status')}</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {inventories.map((i) => (
                                        <tr key={i.id} className="hover:bg-slate-50/60">
                                            <td className="px-4 py-3 font-semibold text-slate-900">
                                                <Link href={`/inventaires/${i.id}`} className="hover:text-indigo-600">
                                                    {i.reference}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500">
                                                {new Date(i.created_at).toLocaleDateString(i18n.resolvedLanguage)}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {i.category_slug ? categoryLabel(i.category_slug) : t('inventory.allCatalogue')}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums">
                                                {i.lines_counted} / {i.lines_total}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums">
                                                <span className={i.gap_qty < 0 ? 'text-red-600' : i.gap_qty > 0 ? 'text-emerald-600' : 'text-slate-500'}>
                                                    {i.gap_qty > 0 ? `+${i.gap_qty}` : i.gap_qty}
                                                </span>
                                                <span className="ml-2 text-xs text-slate-400">{formatCurrency(i.gap_value)}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusTone[i.status]}`}>
                                                    {t(`inventory.statuses.${i.status}`)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <a
                                                    href={`/inventaires/${i.id}/export`}
                                                    className="inline-flex rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                                                    title={t('inventory.export')}
                                                >
                                                    <Download size={15} />
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </PosLayout>
        </>
    );
}
