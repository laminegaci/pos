import { CreditCard, Minus, Plus, Trash2, X } from 'lucide-react';
import { formatCurrency } from '../../lib/formatCurrency';

export default function Cart({ lines, subtotal, remise, total, onIncrement, onDecrement, onRemove, onClear, onCheckout }) {
    const count = lines.reduce((sum, l) => sum + l.quantity, 0);

    return (
        <aside className="flex h-full w-96 flex-col border-l border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div className="flex items-baseline gap-3">
                    <h2 className="text-lg font-bold text-gray-900">Panier</h2>
                    <span className="text-xs text-gray-500">{count} article{count > 1 ? 's' : ''}</span>
                </div>
                <button
                    onClick={onClear}
                    disabled={lines.length === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 transition hover:bg-red-100 disabled:opacity-40"
                    title="Vider le panier"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3">
                {lines.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-gray-400">
                        Le panier est vide.
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {lines.map((line) => (
                            <div key={line.productId} className="flex gap-3">
                                <img
                                    src={line.image}
                                    alt={line.name}
                                    className="h-14 w-14 shrink-0 rounded-xl object-cover"
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-gray-900">{line.name}</div>
                                            <div className="truncate text-xs text-gray-500">{line.description}</div>
                                        </div>
                                        <button
                                            onClick={() => onRemove(line.productId)}
                                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                            title="Retirer"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="mt-1.5 flex items-center justify-between">
                                        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
                                            <button
                                                onClick={() => onDecrement(line.productId)}
                                                className="flex h-6 w-6 items-center justify-center rounded text-gray-600 hover:bg-white"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className="w-7 text-center text-sm font-semibold text-gray-900">{line.quantity}</span>
                                            <button
                                                onClick={() => onIncrement(line.productId)}
                                                className="flex h-6 w-6 items-center justify-center rounded text-gray-600 hover:bg-white"
                                            >
                                                <Plus size={14} />
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

            <div className="border-t border-gray-100 px-5 py-4">
                <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-600">
                        <span>Sous-total</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                        <span>Remise</span>
                        <span className="font-semibold text-emerald-600">-{formatCurrency(remise)}</span>
                    </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-dashed border-gray-200 pt-3">
                    <span className="text-base font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-indigo-600">{formatCurrency(total)}</span>
                </div>
                <button
                    onClick={onCheckout}
                    disabled={lines.length === 0}
                    className="mt-4 flex h-12 w-full items-center justify-between rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <span className="flex items-center gap-2">
                        <CreditCard size={18} />
                        Encaisser
                    </span>
                    <kbd className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-medium">F9</kbd>
                </button>
            </div>
        </aside>
    );
}
