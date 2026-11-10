import { useForm } from '@inertiajs/react';
import { AlertTriangle, Banknote, Loader2, Minus, Plus, ReceiptText, ShieldCheck, Undo2, Wallet, X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../lib/formatCurrency';

const inputCls = (error) =>
    `w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-4 dark:bg-slate-800 dark:text-slate-100 ${
        error
            ? 'border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-100 dark:border-red-500/50'
            : 'border-slate-200 bg-white focus:border-indigo-400 focus:ring-indigo-100 dark:border-slate-700 dark:focus:ring-indigo-500/20'
    }`;

function ModalShell({ title, subtitle, icon: Icon, tone = 'indigo', busy, onClose, children }) {
    const { t } = useTranslation();

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && !busy && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [busy, onClose]);

    const tones = {
        indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300',
        red: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300',
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !busy && onClose()} aria-hidden="true" />
            <div className="relative flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl dark:bg-slate-900">
                <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
                        <Icon size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
                        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-slate-800"
                        aria-label={t('common.close')}
                    >
                        <X size={16} />
                    </button>
                </div>
                {children}
            </div>
        </div>,
        document.body,
    );
}

function Field({ label, error, children }) {
    return (
        <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</label>
            {children}
            {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}

/** Asked only when the logged-in user is not a manager: a manager types their credentials on the spot. */
function ApprovalFields({ form }) {
    const { t } = useTranslation();
    return (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
                <ShieldCheck size={16} /> {t('returns.approvalTitle')}
            </div>
            <p className="mb-3 text-xs text-amber-700 dark:text-amber-300">{t('returns.approvalHint')}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t('returns.managerEmail')} error={form.errors.approver_email}>
                    <input
                        type="email"
                        autoComplete="off"
                        value={form.data.approver_email}
                        onChange={(e) => form.setData('approver_email', e.target.value)}
                        className={inputCls(form.errors.approver_email)}
                    />
                </Field>
                <Field label={t('returns.managerPassword')} error={form.errors.approver_password}>
                    <input
                        type="password"
                        autoComplete="new-password"
                        value={form.data.approver_password}
                        onChange={(e) => form.setData('approver_password', e.target.value)}
                        className={inputCls(form.errors.approver_password)}
                    />
                </Field>
            </div>
        </div>
    );
}

function ErrorBanner({ message }) {
    if (!message) return null;
    return (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span>{message}</span>
        </div>
    );
}

/* ------------------------------------------------------------------------------------ cancel */

export function CancelSaleModal({ sale, items, needsApproval, onClose }) {
    const { t } = useTranslation();
    const form = useForm({ reason: '', approver_email: '', approver_password: '' });
    const reasonRef = useRef(null);

    useEffect(() => reasonRef.current?.focus(), []);

    const submit = (e) => {
        e.preventDefault();
        form.post(`/ventes/${sale.id}/annuler`, {
            preserveScroll: true,
            onSuccess: onClose,
            onError: () => form.reset('approver_password'),
        });
    };

    return (
        <ModalShell
            title={t('returns.cancelTitle', { id: sale.id })}
            subtitle={t('returns.cancelSubtitle')}
            icon={AlertTriangle}
            tone="red"
            busy={form.processing}
            onClose={onClose}
        >
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                    <ErrorBanner message={form.errors.sale} />

                    <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('returns.willBeRestocked')}</div>
                        <ul className="space-y-1">
                            {items.map((i) => (
                                <li key={i.id} className="flex justify-between gap-3 text-slate-700 dark:text-slate-300">
                                    <span className="truncate">{i.product_name}</span>
                                    <span className="shrink-0 font-semibold tabular-nums">× {i.quantity}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-500 dark:border-slate-700">
                            {t('returns.cancelEffect', { total: formatCurrency(sale.total) })}
                        </div>
                    </div>

                    <Field label={t('returns.reason')} error={form.errors.reason}>
                        <input
                            ref={reasonRef}
                            type="text"
                            maxLength={255}
                            value={form.data.reason}
                            onChange={(e) => form.setData('reason', e.target.value)}
                            placeholder={t('returns.cancelReasonPlaceholder')}
                            className={inputCls(form.errors.reason)}
                        />
                    </Field>

                    {needsApproval && <ApprovalFields form={form} />}
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end dark:border-slate-800">
                    <button type="button" onClick={onClose} disabled={form.processing} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                        {t('common.cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={form.processing || !form.data.reason.trim()}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {form.processing && <Loader2 size={15} className="animate-spin" />}
                        {t('returns.confirmCancel')}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}

/* ------------------------------------------------------------------------------------ return */

const round2 = (n) => Math.round(n * 100) / 100;

export function ReturnModal({ sale, items, needsApproval, onClose }) {
    const { t } = useTranslation();
    const returnable = useMemo(() => items.filter((i) => i.remaining > 0), [items]);

    const form = useForm({
        lines: returnable.map((i) => ({ sale_item_id: i.id, quantity: 0, restock: true })),
        reason: '',
        refund_method: 'cash',
        approver_email: '',
        approver_password: '',
    });

    const setLine = (index, patch) =>
        form.setData(
            'lines',
            form.data.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)),
        );

    // Same rule as the server: refund at the price really paid (discount spread over lines),
    // and the return that empties the ticket refunds the exact remainder.
    const refund = useMemo(() => {
        const gross = returnable.reduce((sum, item, i) => sum + item.price * (form.data.lines[i]?.quantity || 0), 0);
        const ratio = sale.subtotal > 0 ? sale.total / sale.subtotal : 1;
        const emptied = items.every((item) => {
            const idx = returnable.findIndex((r) => r.id === item.id);
            const now = idx >= 0 ? form.data.lines[idx].quantity : 0;
            return item.returned + now >= item.quantity;
        });
        const amount = emptied && gross > 0 ? round2(sale.total - sale.refunded) : round2(gross * ratio);
        return { amount: Math.max(0, amount), count: form.data.lines.reduce((s, l) => s + l.quantity, 0) };
    }, [form.data.lines, returnable, items, sale]);

    const submit = (e) => {
        e.preventDefault();
        form.post(`/ventes/${sale.id}/retours`, {
            preserveScroll: true,
            onSuccess: onClose,
            onError: () => form.reset('approver_password'),
        });
    };

    const allBack = () => form.setData('lines', form.data.lines.map((l, i) => ({ ...l, quantity: returnable[i].remaining })));

    return (
        <ModalShell
            title={t('returns.returnTitle', { id: sale.id })}
            subtitle={t('returns.returnSubtitle')}
            icon={Undo2}
            busy={form.processing}
            onClose={onClose}
        >
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                    <ErrorBanner message={form.errors.sale || form.errors.lines} />

                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('returns.itemsToReturn')}</span>
                            <button type="button" onClick={allBack} className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-300">
                                {t('returns.selectAll')}
                            </button>
                        </div>
                        <ul className="space-y-2">
                            {returnable.map((item, i) => {
                                const line = form.data.lines[i];
                                return (
                                    <li key={item.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{item.product_name}</div>
                                                <div className="text-xs text-slate-500">
                                                    {formatCurrency(item.price)} · {t('returns.leftToReturn', { count: item.remaining })}
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-slate-100 p-0.5 dark:bg-slate-800">
                                                <button
                                                    type="button"
                                                    onClick={() => setLine(i, { quantity: Math.max(0, line.quantity - 1) })}
                                                    disabled={line.quantity === 0}
                                                    className="flex h-7 w-7 items-center justify-center rounded-full text-slate-600 hover:bg-white disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700"
                                                    aria-label={t('cart.decrease')}
                                                >
                                                    <Minus size={13} />
                                                </button>
                                                <span className="w-7 text-center text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">{line.quantity}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setLine(i, { quantity: Math.min(item.remaining, line.quantity + 1) })}
                                                    disabled={line.quantity >= item.remaining}
                                                    className="flex h-7 w-7 items-center justify-center rounded-full text-slate-600 hover:bg-white disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700"
                                                    aria-label={t('cart.increase')}
                                                >
                                                    <Plus size={13} />
                                                </button>
                                            </div>
                                        </div>
                                        {line.quantity > 0 && (
                                            <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                                <input
                                                    type="checkbox"
                                                    checked={line.restock}
                                                    onChange={(e) => setLine(i, { restock: e.target.checked })}
                                                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                {t('returns.restock')}
                                            </label>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    <Field label={t('returns.reason')} error={form.errors.reason}>
                        <input
                            type="text"
                            maxLength={255}
                            value={form.data.reason}
                            onChange={(e) => form.setData('reason', e.target.value)}
                            placeholder={t('returns.returnReasonPlaceholder')}
                            className={inputCls(form.errors.reason)}
                        />
                    </Field>

                    <div>
                        <div className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{t('returns.refundMethod')}</div>
                        <div className={`grid gap-2 ${sale.outstanding > 0 ? 'grid-cols-3' : 'grid-cols-2'}`} role="radiogroup">
                            {[
                                { id: 'cash', label: t('returns.refundCash'), hint: t('returns.refundCashHint'), icon: Banknote },
                                { id: 'credit_note', label: t('returns.refundCredit'), hint: t('returns.refundCreditHint'), icon: ReceiptText },
                                // Credit ticket still partly unpaid: the refund can reduce the customer's debt.
                                ...(sale.outstanding > 0
                                    ? [{ id: 'account', label: t('returns.refundAccount'), hint: t('returns.refundAccountHint'), icon: Wallet }]
                                    : []),
                            ].map(({ id, label, hint, icon: Icon }) => {
                                const on = form.data.refund_method === id;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        role="radio"
                                        aria-checked={on}
                                        onClick={() => form.setData('refund_method', id)}
                                        className={`flex items-start gap-2 rounded-xl border p-3 text-left transition ${
                                            on
                                                ? 'border-indigo-500 bg-indigo-50/60 ring-4 ring-indigo-100 dark:bg-indigo-500/10 dark:ring-indigo-500/20'
                                                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                                        }`}
                                    >
                                        <Icon size={18} className={on ? 'text-indigo-600' : 'text-slate-400'} />
                                        <span>
                                            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
                                            <span className="block text-xs text-slate-500">{hint}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {form.errors.refund_method && <p className="mt-1 text-xs text-red-600">{form.errors.refund_method}</p>}
                    </div>

                    {needsApproval && <ApprovalFields form={form} />}
                </div>

                <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-300">{t('returns.toRefund')}</span>
                        <span className="text-xl font-bold tabular-nums text-indigo-600 dark:text-indigo-300">{formatCurrency(refund.amount)}</span>
                    </div>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button type="button" onClick={onClose} disabled={form.processing} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing || refund.count === 0 || !form.data.reason.trim()}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                        >
                            {form.processing && <Loader2 size={15} className="animate-spin" />}
                            {t('returns.confirmReturn')}
                        </button>
                    </div>
                </div>
            </form>
        </ModalShell>
    );
}
