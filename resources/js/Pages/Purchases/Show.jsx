import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { ArrowLeft, PackageCheck, Pencil, Printer, Send, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PosLayout from '../../Layouts/PosLayout';
import { formatCurrency } from '../../lib/formatCurrency';
import FlashToast, { ghostBtn, primaryBtn, statusTone } from '../../Components/Purchasing/FlashToast';

export default function PurchaseShow({ order, items, receptions }) {
    const { t, i18n } = useTranslation();
    const [errors, setErrors] = useState({});
    const date = (d) => (d ? new Date(d).toLocaleDateString(i18n.resolvedLanguage) : '—');
    const post = (path) => router.post(`/achats/${order.id}/${path}`, {}, { preserveScroll: true, onError: setErrors });

    const cancel = () => {
        if (window.confirm(t('purchases.confirmCancel'))) post('annuler');
    };

    const canReceive = ['ordered', 'partial'].includes(order.status);
    const canCancel = ['draft', 'ordered', 'partial'].includes(order.status) && !items.some((i) => i.quantity_received > 0);

    return (
        <>
            <Head title={order.reference} />
            <PosLayout>
                <FlashToast />
                <div className="flex flex-1 flex-col overflow-auto p-4 md:px-8 md:py-6">
                    <Link href="/achats" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 print:hidden">
                        <ArrowLeft size={15} /> {t('purchases.title')}
                    </Link>

                    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-bold text-slate-900">{order.reference}</h1>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusTone[order.status]}`}>
                                    {t(`purchases.statuses.${order.status}`)}
                                </span>
                            </div>
                            <p className="text-sm text-slate-500">
                                <Link href={`/fournisseurs/${order.supplier.id}`} className="font-medium text-slate-700 hover:text-indigo-600">{order.supplier.name}</Link>
                                {' · '}{date(order.ordered_at ?? order.created_at)}
                                {order.expected_at && <> · {t('purchases.expected')} : {date(order.expected_at)}</>}
                            </p>
                            {order.note && <p className="mt-1 text-sm text-slate-400">{order.note}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2 print:hidden">
                            {order.status === 'draft' && (
                                <>
                                    <Link href={`/achats/${order.id}/modifier`} className={ghostBtn}><Pencil size={15} /> {t('purchases.edit')}</Link>
                                    <button onClick={() => post('commander')} className={primaryBtn}><Send size={15} /> {t('purchases.order')}</button>
                                </>
                            )}
                            {canReceive && (
                                <Link href={`/achats/${order.id}/receptionner`} className={primaryBtn}><PackageCheck size={15} /> {t('purchases.receive')}</Link>
                            )}
                            <button onClick={() => window.print()} className={ghostBtn}><Printer size={15} /> {t('purchases.print')}</button>
                            {canCancel && (
                                <button onClick={cancel} className={`${ghostBtn} text-red-600`}><XCircle size={15} /> {t('purchases.cancelOrder')}</button>
                            )}
                        </div>
                    </div>
                    {errors.purchase && <div className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{errors.purchase}</div>}

                    <div className="overflow-auto rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">{t('purchases.product')}</th>
                                    <th className="px-4 py-3 text-right">{t('purchases.qtyOrdered')}</th>
                                    <th className="px-4 py-3 text-right">{t('purchases.qtyReceived')}</th>
                                    <th className="px-4 py-3 text-right">{t('purchases.qtyRemaining')}</th>
                                    <th className="px-4 py-3 text-right">{t('purchases.unitCost')}</th>
                                    <th className="px-4 py-3 text-right">{t('purchases.vat')}</th>
                                    <th className="px-4 py-3 text-right">{t('purchases.lineTotal')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((i) => (
                                    <tr key={i.id}>
                                        <td className="px-4 py-3 font-medium text-slate-800">{i.product?.name}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{i.quantity_ordered}</td>
                                        <td className="px-4 py-3 text-right tabular-nums text-emerald-600">{i.quantity_received}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{i.remaining}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(i.unit_cost)}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{Number(i.vat_rate)}%</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(i.quantity_ordered * i.unit_cost)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <dl className="mt-4 ml-auto space-y-1 text-sm">
                        <div className="flex gap-6"><dt className="w-28 text-slate-500">{t('purchases.totalHt')}</dt><dd className="tabular-nums">{formatCurrency(order.total_ht)}</dd></div>
                        <div className="flex gap-6"><dt className="w-28 text-slate-500">{t('purchases.totalVat')}</dt><dd className="tabular-nums">{formatCurrency(order.total_vat)}</dd></div>
                        <div className="flex gap-6 font-bold"><dt className="w-28">{t('purchases.totalTtc')}</dt><dd className="tabular-nums">{formatCurrency(order.total_ttc)}</dd></div>
                    </dl>

                    {receptions.length > 0 && (
                        <div className="mt-6 print:hidden">
                            <h2 className="mb-2 text-sm font-semibold text-slate-700">{t('purchases.linkedReceptions')}</h2>
                            <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200/60 bg-white text-sm">
                                {receptions.map((r) => (
                                    <li key={r.id} className="flex items-center justify-between px-4 py-3">
                                        <Link href={`/receptions/${r.id}`} className="font-semibold hover:text-indigo-600">{r.reference}</Link>
                                        <span className="text-slate-500">{date(r.received_at)}</span>
                                        <span className="tabular-nums">{formatCurrency(r.total_ttc)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </PosLayout>
        </>
    );
}
