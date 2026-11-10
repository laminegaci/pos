import { Link } from '@inertiajs/react';
import { CheckCircle2, Download, ExternalLink, Loader2, Plus, Printer, X } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../lib/formatCurrency';
import usePrintDocument from '../../lib/printDocument';

/**
 * Thermal ticket (58/80 mm, printable HTML) or A4 invoice PDF, depending on the paper setting.
 */
function printUrlFor(saleId, paperSize, received) {
    if (paperSize === 'A4') return `/ventes/${saleId}/facture?stream=1`;
    const params = new URLSearchParams({ format: paperSize === '58mm' ? '58mm' : '80mm' });
    const amount = parseFloat(received);
    if (amount > 0) params.set('recu', String(amount));
    return `/ventes/${saleId}/ticket?${params}`;
}

export default function SaleConfirmationModal({ sale, lines = [], received = null, autoPrint = false, paperSize = '80mm', onClose }) {
    const { t, i18n } = useTranslation();
    const { print: printDocument, printing } = usePrintDocument();
    const isTicket = paperSize !== 'A4';
    const print = useCallback(
        (saleId) => printDocument(printUrlFor(saleId, paperSize, received)),
        [printDocument, paperSize, received],
    );
    const printButtonRef = useRef(null);
    const autoPrinted = useRef(null);

    const open = !!sale;
    const receivedAmount = received != null && received !== '' ? parseFloat(received) : null;
    const creditPaid = sale?.credit_note_amount ?? 0;
    const due = sale ? Math.max(0, sale.total - creditPaid) : 0;
    const change = receivedAmount != null && sale ? receivedAmount - due : null;

    useEffect(() => {
        if (!open) return;
        printButtonRef.current?.focus();
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    // "Impression automatique" setting: print once per sale.
    useEffect(() => {
        if (open && autoPrint && autoPrinted.current !== sale.id) {
            autoPrinted.current = sale.id;
            print(sale.id);
        }
    }, [open, autoPrint, sale, print]);

    if (!open) return null;

    const date = sale.created_at
        ? new Date(sale.created_at).toLocaleString(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short' })
        : null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="sale-confirm-title">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

            <div className="relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl dark:bg-slate-900">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label={t('common.close')}
                >
                    <X size={16} />
                </button>

                {/* Header */}
                <div className="flex flex-col items-center bg-gradient-to-b from-emerald-50 to-white px-6 pb-4 pt-7 text-center dark:from-emerald-500/10 dark:to-slate-900">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                        <CheckCircle2 size={30} />
                    </div>
                    <h2 id="sale-confirm-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {t('saleConfirm.title', { id: sale.id })}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {[date, sale.client || t('saleConfirm.walkIn')].filter(Boolean).join(' · ')}
                    </p>
                </div>

                {/* Receipt */}
                <div className="flex-1 overflow-y-auto px-6">
                    {lines.length > 0 && (
                        <ul className="divide-y divide-dashed divide-slate-200 border-y border-dashed border-slate-200 text-sm dark:divide-slate-700 dark:border-slate-700">
                            {lines.map((l) => (
                                <li key={l.productId} className="flex items-baseline justify-between gap-3 py-2">
                                    <span className="min-w-0 truncate text-slate-700 dark:text-slate-300">
                                        <span className="font-semibold text-slate-900 tabular-nums dark:text-slate-100">{l.quantity}×</span> {l.name}
                                    </span>
                                    <span className="shrink-0 font-medium text-slate-900 tabular-nums dark:text-slate-100">{formatCurrency(l.subtotal)}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    <dl className="space-y-1.5 py-3 text-sm">
                        {sale.payment_method && (
                            <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                <dt>{t('cart.paymentMethod')}</dt>
                                <dd>{t(`payment.${sale.payment_method}`)}</dd>
                            </div>
                        )}
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                            <dt>{t('sales.subtotal')}</dt>
                            <dd className="tabular-nums">{formatCurrency(sale.subtotal)}</dd>
                        </div>
                        {sale.remise > 0 && (
                            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                <dt>{t('sales.discount')}</dt>
                                <dd className="tabular-nums">−{formatCurrency(sale.remise)}</dd>
                            </div>
                        )}
                        <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-700">
                            <dt className="font-bold text-slate-900 dark:text-slate-100">{t('sales.total')}</dt>
                            <dd className="text-xl font-bold text-indigo-600 tabular-nums dark:text-indigo-400">{formatCurrency(sale.total)}</dd>
                        </div>
                        {creditPaid > 0 && (
                            <>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <dt>{t('creditNotes.paidBy')}</dt>
                                    <dd className="tabular-nums">−{formatCurrency(creditPaid)}</dd>
                                </div>
                                <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200">
                                    <dt>{t('creditNotes.toPay')}</dt>
                                    <dd className="tabular-nums">{formatCurrency(due)}</dd>
                                </div>
                            </>
                        )}
                        {sale.credit_amount > 0 && (
                            <>
                                {sale.deposit_amount > 0 && (
                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                        <dt>{t('sales.credit.deposit')}</dt>
                                        <dd className="tabular-nums">{formatCurrency(sale.deposit_amount)}</dd>
                                    </div>
                                )}
                                <div className="flex justify-between font-semibold text-amber-700 dark:text-amber-300">
                                    <dt>{t('sales.credit.onAccount')}</dt>
                                    <dd className="tabular-nums">{formatCurrency(sale.credit_amount)}</dd>
                                </div>
                            </>
                        )}
                        {receivedAmount != null && (
                            <>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <dt>{t('cart.received')}</dt>
                                    <dd className="tabular-nums">{formatCurrency(receivedAmount)}</dd>
                                </div>
                                <div className="flex justify-between rounded-lg bg-emerald-50 px-2 py-1.5 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                    <dt>{t('cart.change')}</dt>
                                    <dd className="tabular-nums">{formatCurrency(Math.max(0, change))}</dd>
                                </div>
                            </>
                        )}
                    </dl>
                </div>

                {/* Actions */}
                <div className="space-y-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
                    <button
                        ref={printButtonRef}
                        type="button"
                        onClick={() => print(sale.id)}
                        disabled={printing}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-wait disabled:opacity-70 dark:focus:ring-indigo-500/30"
                    >
                        {printing ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
                        {printing
                            ? t('saleConfirm.preparing')
                            : isTicket
                              ? t('saleConfirm.printTicket', { format: paperSize === '58mm' ? '58 mm' : '80 mm' })
                              : t('saleConfirm.print')}
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <a
                            href={`/ventes/${sale.id}/facture`}
                            className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            <Download size={15} /> {t('saleConfirm.downloadA4')}
                        </a>
                        <Link
                            href={`/ventes/${sale.id}`}
                            className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            <ExternalLink size={15} /> {t('saleConfirm.view')}
                        </Link>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                    >
                        <Plus size={16} /> {t('saleConfirm.newSale')}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
