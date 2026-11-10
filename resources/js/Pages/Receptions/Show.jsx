import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PosLayout from '../../Layouts/PosLayout';
import { formatCurrency } from '../../lib/formatCurrency';
import FlashToast from '../../Components/Purchasing/FlashToast';

export default function ReceptionShow({ reception, items, payments }) {
    const { t, i18n } = useTranslation();

    return (
        <>
            <Head title={reception.reference} />
            <PosLayout>
                <FlashToast />
                <div className="flex flex-1 flex-col overflow-auto p-4 md:px-8 md:py-6">
                    <Link
                        href={reception.order ? `/achats/${reception.order.id}` : `/fournisseurs/${reception.supplier.id}`}
                        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
                    >
                        <ArrowLeft size={15} /> {reception.order ? reception.order.reference : reception.supplier.name}
                    </Link>
                    <h1 className="text-xl font-bold text-slate-900">{reception.reference}</h1>
                    <p className="mb-5 text-sm text-slate-500">
                        <Link href={`/fournisseurs/${reception.supplier.id}`} className="font-medium text-slate-700 hover:text-indigo-600">{reception.supplier.name}</Link>
                        {' · '}{t('purchases.received_on')} {new Date(reception.received_at).toLocaleString(i18n.resolvedLanguage)}
                        {reception.user && <> · {t('purchases.by')} {reception.user}</>}
                        {reception.supplier_invoice_ref && <> · {reception.supplier_invoice_ref}</>}
                    </p>

                    <div className="overflow-auto rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">{t('purchases.product')}</th>
                                    <th className="px-4 py-3 text-right">{t('purchases.qty')}</th>
                                    <th className="px-4 py-3 text-right">{t('purchases.unitCost')}</th>
                                    <th className="px-4 py-3 text-right">{t('purchases.vat')}</th>
                                    <th className="px-4 py-3 text-right">{t('purchases.costChange')}</th>
                                    <th className="px-4 py-3 text-right">{t('purchases.lineTotal')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((i) => (
                                    <tr key={i.id}>
                                        <td className="px-4 py-3 font-medium text-slate-800">{i.product?.name}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{i.quantity}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(i.unit_cost)}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{Number(i.vat_rate)}%</td>
                                        <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                                            {i.cost_before !== null ? formatCurrency(i.cost_before) : '—'} → <span className="font-semibold text-slate-800">{formatCurrency(i.cost_after)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(i.quantity * i.unit_cost)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <dl className="mt-4 ml-auto space-y-1 text-sm">
                        <div className="flex gap-6"><dt className="w-28 text-slate-500">{t('purchases.totalHt')}</dt><dd className="tabular-nums">{formatCurrency(reception.total_ht)}</dd></div>
                        <div className="flex gap-6"><dt className="w-28 text-slate-500">{t('purchases.totalVat')}</dt><dd className="tabular-nums">{formatCurrency(reception.total_vat)}</dd></div>
                        <div className="flex gap-6 font-bold"><dt className="w-28">{t('purchases.totalTtc')}</dt><dd className="tabular-nums">{formatCurrency(reception.total_ttc)}</dd></div>
                        {payments.map((p) => (
                            <div key={p.id} className="flex gap-6 text-emerald-600">
                                <dt className="w-28">{t(`suppliers.methods.${p.method}`)}</dt>
                                <dd className="tabular-nums">− {formatCurrency(p.amount)}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </PosLayout>
        </>
    );
}
