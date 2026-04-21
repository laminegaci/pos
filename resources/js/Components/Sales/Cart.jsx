import { CreditCard, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { formatCurrency } from '../../lib/formatCurrency';

export default function Cart({ lines, subtotal, remise, total, onIncrement, onDecrement, onRemove, onClear, onCheckout }) {
    const count = lines.reduce((sum, l) => sum + l.quantity, 0);

    return (
        <aside className="flex h-full w-[22rem] flex-col border-l border-slate-200/70 bg-white/85 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-baseline gap-2">
                    <h2 className="text-lg font-bold text-slate-900">Panier</h2>
                    <span className="text-xs font-medium text-slate-500">
                        {count} article{count > 1 ? 's' : ''}
                    </span>
                </div>
                <button
                    onClick={onClear}
                    disabled={lines.length === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 transition hover:bg-red-100 disabled:opacity-40"
                    title="Vider le panier"
                >
                    <Trash2 size={15} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
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
                                <img
                                    src={line.image}
                                    alt={line.name}
                                    className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-slate-200/70"
                                />
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
                                                className="flex h-6 w-6 items-center justify-center rounded-full text-slate-600 transition hover:bg-white hover:shadow-sm"
                                            >
                                                <Minus size={13} />
                                            </button>
                                            <span className="w-7 text-center text-sm font-semibold text-slate-900">{line.quantity}</span>
                                            <button
                                                onClick={() => onIncrement(line.productId)}
                                                className="flex h-6 w-6 items-center justify-center rounded-full text-slate-600 transition hover:bg-white hover:shadow-sm"
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

            <div className="border-t border-slate-100 bg-white/60 px-5 py-4">
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
                    <kbd className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium backdrop-blur">F9</kbd>
                </button>
            </div>
        </aside>
    );
}
