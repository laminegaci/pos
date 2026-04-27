import { useState } from 'react';
import { CreditCard, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { formatCurrency } from '../../lib/formatCurrency';
import ClientSelector from './ClientSelector';
import ProductImage from './ProductImage';

export default function Cart({
    lines,
    subtotal,
    remise,
    total,
    clients = [],
    selectedClientId = null,
    onClientChange,
    onIncrement,
    onDecrement,
    onRemove,
    onClear,
    onCheckout,
}) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const count = lines.reduce((sum, l) => sum + l.quantity, 0);

    return (
        <>
            {/* Mobile floating cart button */}
            <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-500/40 transition active:scale-95 lg:hidden"
                aria-label="Ouvrir le panier"
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
                className={`fixed inset-y-0 right-0 z-50 flex h-[100dvh] w-full max-w-md flex-col border-l border-slate-200/70 bg-white/95 backdrop-blur-xl transition-transform duration-200 lg:static lg:z-auto lg:h-full lg:w-[22rem] lg:max-w-none lg:translate-x-0 lg:bg-white/85 ${
                    mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
                }`}
                aria-label="Panier"
            >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-lg font-bold text-slate-900">Panier</h2>
                        <span className="text-xs font-medium text-slate-500">
                            {count} article{count > 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClear}
                            disabled={lines.length === 0}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 transition hover:bg-red-100 disabled:opacity-40"
                            title="Vider le panier"
                        >
                            <Trash2 size={15} />
                        </button>
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 lg:hidden"
                            aria-label="Fermer"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
                    <ClientSelector clients={clients} value={selectedClientId} onChange={onClientChange} />
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                    {lines.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                <ShoppingBag size={22} />
                            </div>
                            <div className="text-sm text-slate-500">Le panier est vide</div>
                            <div className="text-xs text-slate-400">Ajoutez des articles depuis la grille.</div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {lines.map((line) => (
                                <div key={line.productId} className="flex gap-3">
                                    <div className="shrink-0">
                                        <ProductImage product={line} size="sm" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold text-slate-900">{line.name}</div>
                                                <div className="truncate text-xs text-slate-500">{line.description}</div>
                                            </div>
                                            <button
                                                onClick={() => onRemove(line.productId)}
                                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                                title="Retirer"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="flex items-center gap-1 rounded-full bg-slate-100 p-0.5">
                                                <button
                                                    onClick={() => onDecrement(line.productId)}
                                                    className="flex h-7 w-7 items-center justify-center rounded-full text-slate-600 transition hover:bg-white hover:shadow-sm"
                                                >
                                                    <Minus size={13} />
                                                </button>
                                                <span className="w-7 text-center text-sm font-semibold text-slate-900">{line.quantity}</span>
                                                <button
                                                    onClick={() => onIncrement(line.productId)}
                                                    className="flex h-7 w-7 items-center justify-center rounded-full text-slate-600 transition hover:bg-white hover:shadow-sm"
                                                >
                                                    <Plus size={13} />
                                                </button>
                                            </div>
                                            <div className="text-sm font-bold text-indigo-600">{formatCurrency(line.subtotal)}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t border-slate-100 bg-white/60 px-4 py-4 sm:px-5">
                    <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between text-slate-600">
                            <span>Sous-total</span>
                            <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                            <span>Remise</span>
                            <span className="font-semibold text-emerald-600">-{formatCurrency(remise)}</span>
                        </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
                        <span className="text-base font-bold text-slate-900">Total</span>
                        <span className="bg-gradient-to-br from-indigo-600 to-violet-600 bg-clip-text text-2xl font-bold text-transparent">
                            {formatCurrency(total)}
                        </span>
                    </div>
                    <button
                        onClick={onCheckout}
                        disabled={lines.length === 0}
                        className="mt-4 flex h-12 w-full items-center justify-between rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl hover:shadow-indigo-500/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                    >
                        <span className="flex items-center gap-2">
                            <CreditCard size={18} />
                            Encaisser
                        </span>
                        <kbd className="hidden rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium backdrop-blur sm:block">F9</kbd>
                    </button>
                </div>
            </aside>
        </>
    );
}
