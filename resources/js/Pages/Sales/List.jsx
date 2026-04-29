import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { Download, Eye, Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PosLayout from '../../Layouts/PosLayout';

export default function SalesList({ sales }) {
    const { t } = useTranslation();
    const [selectedSale, setSelectedSale] = useState(null);

    return (
        <PosLayout>
            <Head title={t('sales.history')} />
            <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/60 px-6 py-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">{t('sales.history')}</h1>
                        <p className="text-sm text-slate-500">{t('sales.salesCount', { count: sales.total })}</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                        <button
                            onClick={() => window.location.href = '/ventes/export'}
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

                <div className="flex-1 overflow-auto p-6">
                    <div className="rounded-2xl border border-slate-200/60 bg-white/60">
                        <table className="w-full">
                            <thead className="border-b border-slate-200/60 bg-slate-50/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">#</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('sales.date')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('sales.client')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('sales.cashier')}</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">{t('sales.amount')}</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">{t('sales.status')}</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/40">
                                {sales.data.map((sale) => (
                                    <tr key={sale.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3 text-sm font-medium text-slate-900">#{sale.id}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {new Date(sale.created_at).toLocaleString('fr-FR', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-900">{sale.client || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{sale.user}</td>
                                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                                            {sale.total.toLocaleString('fr-FR', { style: 'currency', currency: 'DZD' })}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                                {sale.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Link
                                                href={`/ventes/${sale.id}`}
                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
                                            >
                                                <Eye size={14} />
                                                {t('common.view')}
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {sales.data.length === 0 && (
                            <div className="py-12 text-center text-slate-500">
                                {t('sales.noSaleFound')}
                            </div>
                        )}
                    </div>

                    {sales.last_page > 1 && (
                        <div className="mt-4 flex items-center justify-center gap-2">
                            {sales.prev_page_url && (
                                <Link href={sales.prev_page_url} preserveScroll className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">
                                    {t('common.previous')}
                                </Link>
                            )}
                            <span className="text-sm text-slate-600">
                                {t('common.page')} {sales.current_page} {t('common.of')} {sales.last_page}
                            </span>
                            {sales.next_page_url && (
                                <Link href={sales.next_page_url} preserveScroll className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">
                                    {t('common.next')}
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {selectedSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">{t('sales.sale')} #{selectedSale.id}</h2>
                            <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-500">{t('sales.date')}</p>
                                <p className="text-sm text-slate-900">
                                    {new Date(selectedSale.created_at).toLocaleString('fr-FR')}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">{t('sales.client')}</p>
                                <p className="text-sm text-slate-900">{selectedSale.client || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">{t('sales.cashier')}</p>
                                <p className="text-sm text-slate-900">{selectedSale.user}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">{t('sales.amount')}</p>
                                <p className="text-lg font-bold text-slate-900">
                                    {selectedSale.total.toLocaleString('fr-FR', { style: 'currency', currency: 'DZD' })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </PosLayout>
    );
}
