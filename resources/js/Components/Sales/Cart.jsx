import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Banknote, CreditCard, Loader2, Minus, Percent, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../lib/formatCurrency';
import ClientSelector from './ClientSelector';
import ProductImage from './ProductImage';

function QuantityControl({ line, onDecrement, onIncrement, onSetQuantity }) {
    const { t } = useTranslation();
    const [draft, setDraft] = useState(String(line.quantity));
    const atMax = line.stock != null && line.quantity >= line.stock;

    useEffect(() => setDraft(String(line.quantity)), [line.quantity]);

    const commit = (e) => {
        const n = parseInt(e.currentTarget.value, 10);
        if (Number.isNaN(n) || n === line.quantity) {
            setDraft(String(line.quantity));
            return;
        }
        // Show the value that will actually be kept (the parent caps it to the stock).
        const kept = line.stock != null ? Math.min(n, line.stock) : n;
        setDraft(String(Math.max(0, kept)));
        onSetQuantity(line.productId, n);
    };

    const btn =
        'flex h-7 w-7 items-center justify-center rounded-full text-slate-600 transition hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none dark:text-slate-300 dark:hover:bg-slate-700';

    return (
        <div className="flex items-center gap-0.5 rounded-full bg-slate-100 p-0.5 dark:bg-slate-800">
            <button type="button" onClick={() => onDecrement(line.productId)} className={btn} aria-label={t('cart.decrease')}>
                {line.quantity === 1 ? <Trash2 size={12} /> : <Minus size={13} />}
            </button>
            <input
                type="text"
                inputMode="numeric"
                value={draft}
                onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') {
                        setDraft(String(line.quantity));
                        e.currentTarget.blur();
                    }
                }}
                onFocus={(e) => e.target.select()}
                aria-label={t('sales.quantity')}
                className="w-9 rounded-md bg-transparent text-center text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-200 dark:text-slate-100 dark:focus:bg-slate-900"
            />
            <button
                type="button"
                onClick={() => onIncrement(line.productId)}
                disabled={atMax}
                className={btn}
                aria-label={t('cart.increase')}
                title={atMax ? t('cart.maxStock', { count: line.stock }) : undefined}
            >
                <Plus size={13} />
            </button>
        </div>
    );
}

function DiscountInput({ discount, onChange, subtotal }) {
    const { t } = useTranslation();
    const isPercent = discount.type === 'percent';

    return (
        <div className="flex items-center gap-1.5">
            <div className="relative">
                <input
                    type="text"
                    inputMode="decimal"
                    value={discount.value === 0 ? '' : discount.value}
                    placeholder="0"
                    disabled={subtotal === 0}
                    onChange={(e) => {
                        const raw = e.target.value.replace(',', '.').replace(/[^\d.]/g, '');
                        let value = raw === '' ? 0 : parseFloat(raw);
                        if (Number.isNaN(value)) value = 0;
                        if (isPercent) value = Math.min(value, 100);
                        onChange({ ...discount, value: raw.endsWith('.') ? raw : value });
                    }}
                    onBlur={() => onChange({ ...discount, value: parseFloat(discount.value) || 0 })}
                    aria-label={t('sales.discount')}
                    className="h-7 w-20 rounded-lg border border-slate-200 bg-white pl-2 pr-1 text-right text-sm font-semibold text-emerald-600 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-400 dark:focus:ring-emerald-500/20"
                />
            </div>
            <div className="flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold dark:bg-slate-800" role="group" aria-label={t('cart.discountType')}>
                {[
                    { id: 'amount', label: 'DA' },
                    { id: 'percent', label: <Percent size={11} /> },
                ].map((opt) => (
                    <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                            onChange({
                                type: opt.id,
                                value: opt.id === 'percent' ? Math.min(parseFloat(discount.value) || 0, 100) : parseFloat(discount.value) || 0,
                            })
                        }
                        aria-pressed={discount.type === opt.id}
                        aria-label={opt.id === 'percent' ? t('cart.percent') : t('cart.amount')}
                        className={`flex h-6 min-w-7 items-center justify-center rounded-md px-1.5 transition ${
                            discount.type === opt.id
                                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white'
                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function CashPanel({ total, received, onReceivedChange }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(received !== '');
    const amount = parseFloat(received) || 0;
    const change = amount - total;

    // Collapsed by default so the item list keeps most of the height.
    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300"
            >
                <Banknote size={14} /> {t('cart.enterReceived')}
            </button>
        );
    }

    // Exact amount + the next round banknote amounts above the total.
    const suggestions = [...new Set([total, ...[500, 1000, 2000, 5000].map((step) => Math.ceil(total / step) * step)])]
        .filter((v) => v >= total)
        .sort((a, b) => a - b)
        .slice(0, 4);

    return (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/60">
            <label className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Banknote size={15} className="text-slate-400" />
                    {t('cart.received')}
                </span>
                <input
                    autoFocus
                    type="text"
                    inputMode="decimal"
                    value={received}
                    placeholder={formatCurrency(total)}
                    onChange={(e) => onReceivedChange(e.target.value.replace(',', '.').replace(/[^\d.]/g, ''))}
                    className="h-8 w-32 rounded-lg border border-slate-200 bg-white px-2 text-right text-sm font-semibold text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-500/20"
                />
            </label>
            <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestions.map((v) => (
                    <button
                        key={v}
                        type="button"
                        onClick={() => onReceivedChange(String(v))}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                            amount === v
                                ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/50 dark:bg-indigo-500/15 dark:text-indigo-300'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300'
                        }`}
                    >
                        {v === total ? t('cart.exact') : formatCurrency(v)}
                    </button>
                ))}
            </div>
            {received !== '' && (
                <div className="mt-2 flex items-center justify-between border-t border-dashed border-slate-200 pt-2 text-sm dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-300">{change >= 0 ? t('cart.change') : t('cart.missing')}</span>
                    <span className={`text-base font-bold ${change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(Math.abs(change))}
                    </span>
                </div>
            )}
        </div>
    );
}

export default function Cart({
    lines,
    subtotal,
    remise,
    total,
    discount,
    onDiscountChange,
    clients = [],
    selectedClientId = null,
    onClientChange,
    onIncrement,
    onDecrement,
    onSetQuantity,
    onRemove,
    onClear,
    onCheckout,
    submitting = false,
}) {
    const { t } = useTranslation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);
    const [received, setReceived] = useState('');
    const [flashId, setFlashId] = useState(null);
    const prevQty = useRef({});
    const count = lines.reduce((sum, l) => sum + l.quantity, 0);
    const empty = lines.length === 0;
    const receivedAmount = parseFloat(received) || 0;
    const insufficient = received !== '' && receivedAmount < total;

    // Reset local state once the cart is emptied (after checkout or clear).
    useEffect(() => {
        if (empty) {
            setReceived('');
            setConfirmClear(false);
            setMobileOpen(false);
        }
    }, [empty]);

    // Briefly highlight a line whose quantity just went up.
    useEffect(() => {
        const next = {};
        let changed = null;
        for (const l of lines) {
            next[l.productId] = l.quantity;
            if ((prevQty.current[l.productId] ?? 0) < l.quantity) changed = l.productId;
        }
        prevQty.current = next;
        if (changed != null) {
            setFlashId(changed);
            const id = setTimeout(() => setFlashId(null), 600);
            return () => clearTimeout(id);
        }
    }, [lines]);

    useEffect(() => {
        if (!confirmClear) return;
        const id = setTimeout(() => setConfirmClear(false), 3000);
        return () => clearTimeout(id);
    }, [confirmClear]);

    // F9 = checkout, using the same rules as the button.
    const canCheckout = !empty && !submitting && !insufficient;
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== 'F9') return;
            e.preventDefault();
            if (canCheckout) onCheckout();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [canCheckout, onCheckout]);

    const handleClear = () => {
        if (!confirmClear) return setConfirmClear(true);
        setConfirmClear(false);
        onClear();
    };

    return (
        <>
            {/* Mobile floating cart button */}
            <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-500/40 transition active:scale-95 lg:hidden"
                aria-label={t('cart.open')}
            >
                <ShoppingBag size={18} />
                <span>{count}</span>
                {count > 0 && <span className="border-l border-white/30 pl-2">{formatCurrency(total)}</span>}
            </button>

            {/* Mobile backdrop */}
            <div
                className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity lg:hidden ${
                    mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
                onClick={() => setMobileOpen(false)}
                aria-hidden="true"
            />

            <aside
                className={`fixed inset-y-0 right-0 z-50 flex h-[100dvh] w-full max-w-md flex-col border-l border-slate-200/70 bg-white/95 backdrop-blur-xl transition-transform duration-200 lg:static lg:z-auto lg:h-full lg:w-[23rem] lg:max-w-none lg:translate-x-0 lg:bg-white/85 dark:border-slate-800 dark:bg-slate-900/95 lg:dark:bg-slate-900/85 ${
                    mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
                }`}
                aria-label={t('sales.cart')}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('sales.cart')}</h2>
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                            {t('cart.itemsCount', { count })}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleClear}
                            disabled={empty || submitting}
                            className={`flex h-8 items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition disabled:opacity-40 ${
                                confirmClear
                                    ? 'bg-red-500 px-3 text-white hover:bg-red-600'
                                    : 'w-8 bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20'
                            }`}
                            title={t('sales.clearCart')}
                            aria-label={t('sales.clearCart')}
                        >
                            <Trash2 size={15} />
                            {confirmClear && <span>{t('cart.confirmClear')}</span>}
                        </button>
                        <button
                            type="button"
                            onClick={() => setMobileOpen(false)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
                            aria-label={t('common.close')}
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Client */}
                <div className="border-b border-slate-100 px-4 py-3 sm:px-5 dark:border-slate-800">
                    <ClientSelector clients={clients} value={selectedClientId} onChange={onClientChange} />
                </div>

                {/* Lines */}
                <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4">
                    {empty ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-400 dark:from-indigo-500/10 dark:to-violet-500/10">
                                <ShoppingBag size={26} />
                            </div>
                            <div className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('cart.empty')}</div>
                            <div className="max-w-[14rem] text-xs text-slate-400">{t('cart.emptyHint')}</div>
                        </div>
                    ) : (
                        <ul className="flex flex-col gap-1">
                            {lines.map((line) => {
                                const atMax = line.stock != null && line.quantity >= line.stock;
                                return (
                                    <li
                                        key={line.productId}
                                        className={`group flex gap-3 rounded-xl p-2 transition-colors duration-500 ${
                                            flashId === line.productId
                                                ? 'bg-indigo-50 dark:bg-indigo-500/15'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                        }`}
                                    >
                                        <div className="shrink-0">
                                            <ProductImage product={line} size="sm" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{line.name}</div>
                                                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                                                        {formatCurrency(line.unitPrice)} / {t('cart.unit')}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => onRemove(line.productId)}
                                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-500 lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100 dark:hover:bg-red-500/10"
                                                    aria-label={t('sales.removeFromCart')}
                                                    title={t('sales.removeFromCart')}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            <div className="mt-1.5 flex items-center justify-between gap-2">
                                                <QuantityControl
                                                    line={line}
                                                    onDecrement={onDecrement}
                                                    onIncrement={onIncrement}
                                                    onSetQuantity={onSetQuantity}
                                                />
                                                <div className="text-sm font-bold text-indigo-600 tabular-nums dark:text-indigo-400">
                                                    {formatCurrency(line.subtotal)}
                                                </div>
                                            </div>
                                            {atMax && (
                                                <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                                                    <AlertTriangle size={11} /> {t('cart.maxStock', { count: line.stock })}
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Totals & checkout */}
                <div className="border-t border-slate-100 bg-white/60 px-4 py-4 sm:px-5 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                            <span>{t('sales.subtotal')}</span>
                            <span className="font-semibold text-slate-900 tabular-nums dark:text-slate-100">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-slate-600 dark:text-slate-400">
                            <span className="min-w-0">
                                {t('sales.discount')}
                                {remise > 0 && (
                                    <span className="ml-1.5 text-xs font-medium text-emerald-600 tabular-nums dark:text-emerald-400">
                                        −{formatCurrency(remise)}
                                    </span>
                                )}
                            </span>
                            <DiscountInput discount={discount} onChange={onDiscountChange} subtotal={subtotal} />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-200 pt-3 dark:border-slate-700">
                        <span className="text-base font-bold text-slate-900 dark:text-slate-100">{t('sales.total')}</span>
                        <span className="bg-gradient-to-br from-indigo-600 to-violet-600 bg-clip-text text-2xl font-bold text-transparent tabular-nums dark:from-indigo-400 dark:to-violet-400">
                            {formatCurrency(total)}
                        </span>
                    </div>

                    {!empty && <CashPanel total={total} received={received} onReceivedChange={setReceived} />}

                    <button
                        type="button"
                        onClick={onCheckout}
                        disabled={!canCheckout}
                        className="mt-4 flex h-12 w-full items-center justify-between rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl hover:shadow-indigo-500/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                    >
                        <span className="flex items-center gap-2">
                            {submitting ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                            {submitting ? t('cart.processing') : t('sales.cashOut')}
                        </span>
                        <kbd className="hidden rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium backdrop-blur sm:block">F9</kbd>
                    </button>
                    {insufficient && (
                        <p className="mt-2 text-center text-xs font-medium text-red-600 dark:text-red-400">{t('cart.insufficient')}</p>
                    )}
                </div>
            </aside>
        </>
    );
}
