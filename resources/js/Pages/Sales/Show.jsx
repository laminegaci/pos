import { Head, Link, usePage } from '@inertiajs/react';
import { AlertTriangle, ExternalLink, Printer, ReceiptText, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PosLayout from '../../Layouts/PosLayout';
import { CancelSaleModal, ReturnModal } from '../../Components/Sales/ReturnModals';
import Toast from '../../Components/Toast';
import { formatCurrency } from '../../lib/formatCurrency';
import usePrintDocument from '../../lib/printDocument';

const money = (v) => formatCurrency(v);

const STATUS_STYLES = {
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    partially_returned: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    returned: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
};

function StatusBadge({ status }) {
    const { t } = useTranslation();
    return (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.completed}`}>
            {t(`returns.status.${status}`, { defaultValue: status })}
        </span>
    );
}

const fmtDate = (iso, lang) =>
    new Date(iso).toLocaleString(lang, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Shown right after a return: print the return slip and, if any, the credit note. */
function ReturnDoneDialog({ done, onClose }) {
    const { t } = useTranslation();
    const { print, printing } = usePrintDocument();

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
            <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-slate-900">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                    <Undo2 size={26} />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('returns.doneTitle')}</h2>
                <p className="mt-1 text-sm text-slate-500">{t('returns.doneRefunded', { amount: money(done.amount) })}</p>

                {done.credit_note && (
                    <div className="mt-4 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/60 py-3 dark:border-indigo-500/40 dark:bg-indigo-500/10">
                        <div className="text-xs text-slate-500">{t('creditNotes.created')}</div>
                        <div className="text-2xl font-extrabold tracking-widest text-indigo-700 dark:text-indigo-300">{done.credit_note.code}</div>
                    </div>
                )}

                <div className="mt-5 space-y-2">
                    {done.credit_note && (
                        <button
                            type="button"
                            disabled={printing}
                            onClick={() => print(`/avoirs/${done.credit_note.id}/ticket`)}
                            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 disabled:opacity-60"
                        >
                            <Printer size={16} /> {t('creditNotes.print')}
                        </button>
                    )}
                    <button
                        type="button"
                        disabled={printing}
                        onClick={() => print(`/retours/${done.id}/ticket`)}
                        className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-60 ${
                            done.credit_note
                                ? 'border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                                : 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30'
                        }`}
                    >
                        <Printer size={16} /> {t('returns.printSlip')}
                    </button>
                    <button type="button" onClick={onClose} className="h-10 w-full rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function SalesShow({ sale, items, returns = [], can }) {
    const { t, i18n } = useTranslation();
    const { flash } = usePage().props;
    const { print } = usePrintDocument();
    const [modal, setModal] = useState(null); // 'cancel' | 'return'
    const [toast, setToast] = useState(null);
    const [done, setDone] = useState(null);

    useEffect(() => {
        if (flash?.return) {
            setDone(flash.return);
            setToast(null);
        } else if (flash?.success) {
            setToast({ message: flash.success, type: 'success' });
        }
    }, [flash?.return?.id, flash?.success]);

    const lang = i18n.resolvedLanguage || 'fr';
    const hasReturned = items.some((i) => i.returned > 0);
    const cancelled = sale.status === 'cancelled';
    const net = sale.total - sale.refunded;

    return (
        <PosLayout>
            <Head title={`${t('sales.sale')} #${sale.id}`} />
            <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
            {done && <ReturnDoneDialog done={done} onClose={() => setDone(null)} />}
            {modal === 'cancel' && <CancelSaleModal sale={sale} items={items} needsApproval={can.needs_approval} onClose={() => setModal(null)} />}
            {modal === 'return' && <ReturnModal sale={sale} items={items} needsApproval={can.needs_approval} onClose={() => setModal(null)} />}

            <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-slate-200/60 bg-white/60 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link href="/ventes" className="shrink-0 text-sm text-slate-600 hover:text-indigo-600 dark:text-slate-400">
                            ← {t('common.back')}
                        </Link>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-lg font-bold text-slate-900 sm:text-xl dark:text-slate-100">
                                    {t('sales.sale')} #{sale.id}
                                </h1>
                                <StatusBadge status={sale.display_status} />
                            </div>
                            <p className="text-xs text-slate-500 sm:text-sm">{fmtDate(sale.created_at, lang)}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {can.return && (
                            <button
                                type="button"
                                onClick={() => setModal('return')}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 sm:flex-none dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
                            >
                                <Undo2 size={15} /> {t('returns.returnAction')}
                            </button>
                        )}
                        {can.cancel && (
                            <button
                                type="button"
                                onClick={() => setModal('cancel')}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 sm:flex-none dark:border-red-500/30 dark:bg-transparent dark:text-red-300"
                            >
                                <AlertTriangle size={15} /> {t('returns.cancelAction')}
                            </button>
                        )}
                        <a
                            href={`/ventes/${sale.id}/facture?stream=1`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-600 sm:flex-none dark:border-slate-700 dark:bg-transparent dark:text-slate-200"
                        >
                            {t('common.preview')}
                        </a>
                        <a
                            href={`/ventes/${sale.id}/facture`}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 sm:flex-none"
                        >
                            {t('common.downloadPdf')}
                        </a>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-4 sm:p-6">
                    {cancelled && (
                        <div role="alert" className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
                            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
                            <div className="min-w-0 text-sm text-red-800 dark:text-red-200">
                                <div className="font-semibold">{t('returns.cancelledBanner')}</div>
                                <div className="mt-0.5">
                                    {t('returns.reason')} : <span className="font-medium">{sale.cancel_reason}</span>
                                </div>
                                <div className="mt-0.5 text-xs opacity-80">
                                    {sale.cancelled_at && fmtDate(sale.cancelled_at, lang)}
                                    {sale.cancelled_by && ` · ${sale.cancelled_by}`}
                                    {sale.cancel_approved_by && sale.cancel_approved_by !== sale.cancelled_by && ` · ${t('returns.approvedBy', { name: sale.cancel_approved_by })}`}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
                        <div className="space-y-4 sm:space-y-6 lg:col-span-2">
                            <div className={`rounded-2xl border border-slate-200/60 bg-white/60 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900/60 ${cancelled ? 'opacity-70' : ''}`}>
                                <h2 className="mb-4 text-base font-semibold text-slate-900 sm:text-lg dark:text-slate-100">{t('sales.items')}</h2>

                                <div className="hidden overflow-x-auto rounded-xl border border-slate-200 sm:block dark:border-slate-700">
                                    <table className="w-full min-w-[480px]">
                                        <thead className="border-b border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-500">{t('sales.item')}</th>
                                                <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-slate-500">{t('sales.qtyShort')}</th>
                                                {hasReturned && (
                                                    <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-amber-600">{t('returns.returned')}</th>
                                                )}
                                                <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-slate-500">{t('products.price')}</th>
                                                <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-slate-500">{t('sales.total')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {items.map((item) => (
                                                <tr key={item.id}>
                                                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">{item.product_name}</td>
                                                    <td className="px-4 py-3 text-center text-sm text-slate-600 dark:text-slate-300">{item.quantity}</td>
                                                    {hasReturned && (
                                                        <td className="px-4 py-3 text-center text-sm font-medium text-amber-600">{item.returned > 0 ? `−${item.returned}` : '—'}</td>
                                                    )}
                                                    <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-300">{money(item.price)}</td>
                                                    <td className="px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-slate-100">{money(item.line_total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <ul className="space-y-2 sm:hidden">
                                    {items.map((item) => (
                                        <li key={item.id} className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.product_name}</p>
                                                <p className="shrink-0 text-sm font-semibold text-slate-900 dark:text-slate-100">{money(item.line_total)}</p>
                                            </div>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {item.quantity} × {money(item.price)}
                                                {item.returned > 0 && <span className="ml-2 font-medium text-amber-600">{t('returns.returnedCount', { count: item.returned })}</span>}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {returns.length > 0 && (
                                <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900/60">
                                    <h2 className="mb-4 text-base font-semibold text-slate-900 sm:text-lg dark:text-slate-100">{t('returns.history')}</h2>
                                    <ul className="space-y-3">
                                        {returns.map((r) => (
                                            <li key={r.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                            {t('returns.returnNumber', { id: r.id })} · {t('returns.itemsCount', { count: r.items_count })}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {fmtDate(r.created_at, lang)}
                                                            {r.user && ` · ${r.user}`}
                                                            {r.approved_by && r.approved_by !== r.user && ` · ${t('returns.approvedBy', { name: r.approved_by })}`}
                                                        </div>
                                                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{r.reason}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-base font-bold tabular-nums text-orange-600">−{money(r.amount)}</div>
                                                        <div className="text-xs text-slate-500">
                                                            {r.refund_method === 'credit_note' ? t('returns.refundCredit') : t('returns.refundCash')}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => print(`/retours/${r.id}/ticket`)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300"
                                                    >
                                                        <Printer size={13} /> {t('returns.printSlip')}
                                                    </button>
                                                    {r.credit_note && (
                                                        <>
                                                            <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                                                                <ReceiptText size={13} /> {r.credit_note.code} · {t('creditNotes.balance')} {money(r.credit_note.balance)}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => print(`/avoirs/${r.credit_note.id}/ticket`)}
                                                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300"
                                                            >
                                                                <Printer size={13} /> {t('creditNotes.print')}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 sm:space-y-6">
                            <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900/60">
                                <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{t('sales.info')}</h2>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs text-slate-500">{t('sales.client')}</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{sale.client || t('clients.occasional')}</p>
                                        {sale.client_email && <p className="text-xs text-slate-500">{sale.client_email}</p>}
                                        {sale.client_phone && <p className="text-xs text-slate-500">{sale.client_phone}</p>}
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">{t('sales.cashier')}</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{sale.user}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-6 dark:border-slate-800 dark:bg-slate-900/60">
                                <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{t('sales.summary')}</h2>
                                <div className="space-y-2">
                                    {sale.payment_method && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">{t('cart.paymentMethod')}</span>
                                            <span className="text-slate-900 dark:text-slate-100">{t(`payment.${sale.payment_method}`)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">{t('sales.subtotal')}</span>
                                        <span className="text-slate-900 dark:text-slate-100">{money(sale.subtotal)}</span>
                                    </div>
                                    {sale.remise > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">{t('sales.discount')}</span>
                                            <span className="text-red-600">-{money(sale.remise)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-bold dark:border-slate-700">
                                        <span className="text-slate-900 dark:text-slate-100">{t('sales.total')}</span>
                                        <span className={cancelled ? 'text-slate-400 line-through' : 'text-indigo-600'}>{money(sale.total)}</span>
                                    </div>
                                    {sale.credit_amount > 0 && (
                                        <div className="space-y-1 rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-500/10">
                                            <div className="font-semibold text-amber-800 dark:text-amber-300">{t('sales.credit.title')}</div>
                                            {sale.deposit_amount > 0 && (
                                                <div className="flex justify-between"><span>{t('sales.credit.deposit')}</span><span>{money(sale.deposit_amount)}</span></div>
                                            )}
                                            <div className="flex justify-between"><span>{t('sales.credit.onAccount')}</span><span>{money(sale.credit_amount)}</span></div>
                                            {sale.credit_paid > 0 && (
                                                <div className="flex justify-between"><span>{t('sales.credit.paid')}</span><span>−{money(sale.credit_paid)}</span></div>
                                            )}
                                            {sale.credit_returned > 0 && (
                                                <div className="flex justify-between"><span>{t('sales.credit.returned')}</span><span>−{money(sale.credit_returned)}</span></div>
                                            )}
                                            <div className="flex justify-between font-semibold"><span>{t('sales.credit.outstanding')}</span><span>{money(sale.outstanding)}</span></div>
                                            {sale.due_at && (
                                                <div className="flex justify-between text-xs text-slate-500"><span>{t('sales.credit.dueDate')}</span><span>{new Date(sale.due_at).toLocaleDateString()}</span></div>
                                            )}
                                            {sale.client_id && (
                                                <a href={`/clients/${sale.client_id}`} className="block pt-1 text-xs font-medium text-indigo-600 hover:underline">{t('sales.credit.viewAccount')}</a>
                                            )}
                                        </div>
                                    )}
                                    {sale.credit_note_amount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">{t('creditNotes.paidBy')}</span>
                                            <span className="text-slate-900 dark:text-slate-100">{money(sale.credit_note_amount)}</span>
                                        </div>
                                    )}
                                    {sale.refunded > 0 && (
                                        <>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600 dark:text-slate-400">{t('returns.refunded')}</span>
                                                <span className="font-medium text-orange-600">−{money(sale.refunded)}</span>
                                            </div>
                                            <div className="flex justify-between border-t border-dashed border-slate-200 pt-2 text-sm font-semibold dark:border-slate-700">
                                                <span className="text-slate-700 dark:text-slate-200">{t('returns.netRevenue')}</span>
                                                <span className="text-slate-900 dark:text-slate-100">{money(net)}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PosLayout>
    );
}
