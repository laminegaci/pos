import { Head, Link, router } from '@inertiajs/react';
import { PackagePlus, Plus, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PosLayout from '../../Layouts/PosLayout';
import { formatCurrency } from '../../lib/formatCurrency';
import FlashToast, { ghostBtn, inputCls, primaryBtn, statusTone } from '../../Components/Purchasing/FlashToast';

const STATUSES = ['draft', 'ordered', 'partial', 'received', 'cancelled'];

export default function PurchasesIndex({ orders, suppliers, filters }) {
    const { t, i18n } = useTranslation();

    const filter = (key, value) => {
        router.get('/achats', { ...filters, [key]: value || undefined }, { preserveState: true, replace: true });
    };

    return (
        <>
            <Head title={t('purchases.title')} />
            <PosLayout>
                <FlashToast />
                <div className="flex flex-1 flex-col overflow-hidden p-4 md:px-8 md:py-6">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">{t('purchases.title')}</h1>
                            <p className="text-sm text-slate-500">{t('purchases.subtitle')}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link href="/receptions/nouvelle" className={ghostBtn}>
                                <PackagePlus size={16} /> {t('purchases.newReception')}
                            </Link>
                            <Link href="/achats/nouveau" className={primaryBtn}>
                                <Plus size={16} /> {t('purchases.new')}
                            </Link>
                        </div>
                    </div>

                    <div className="mb-4 flex flex-wrap gap-2">
                        <select value={filters.status ?? ''} onChange={(e) => filter('status', e.target.value)} className={`${inputCls} w-auto`}>
                            <option value="">{t('purchases.allStatuses')}</option>
                            {STATUSES.map((s) => <option key={s} value={s}>{t(`purchases.statuses.${s}`)}</option>)}
                        </select>
                        <select value={filters.supplier ?? ''} onChange={(e) => filter('supplier', e.target.value)} className={`${inputCls} w-auto`}>
                            <option value="">{t('purchases.allSuppliers')}</option>
                            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div className="flex-1 overflow-auto rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                        {orders.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-slate-400">
                                <Truck size={36} />
                                <p className="text-sm">{t('purchases.empty')}</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">{t('purchases.reference')}</th>
                                        <th className="px-4 py-3">{t('purchases.supplier')}</th>
                                        <th className="px-4 py-3">{t('suppliers.date')}</th>
                                        <th className="px-4 py-3">{t('purchases.expected')}</th>
                                        <th className="px-4 py-3 text-right">{t('purchases.total')}</th>
                                        <th className="px-4 py-3">{t('purchases.status')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {orders.map((o) => (
                                        <tr key={o.id} className="hover:bg-slate-50/60">
                                            <td className="px-4 py-3 font-semibold text-slate-900">
                                                <Link href={`/achats/${o.id}`} className="hover:text-indigo-600">{o.reference}</Link>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{o.supplier}</td>
                                            <td className="px-4 py-3 text-slate-500">{new Date(o.created_at).toLocaleDateString(i18n.resolvedLanguage)}</td>
                                            <td className="px-4 py-3 text-slate-500">
                                                {o.expected_at ? new Date(o.expected_at).toLocaleDateString(i18n.resolvedLanguage) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(o.total_ttc)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusTone[o.status]}`}>
                                                    {t(`purchases.statuses.${o.status}`)}
                                                </span>
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
