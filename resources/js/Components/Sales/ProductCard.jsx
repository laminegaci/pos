import { Plus } from 'lucide-react';
import { formatCurrency } from '../../lib/formatCurrency';

export default function ProductCard({ product, viewMode, onAdd }) {
    if (viewMode === 'list') {
        return (
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200/60 bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-6px_rgba(15,23,42,0.12)]">
                <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200/70"
                />
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900">{product.name}</div>
                    <div className="truncate text-xs text-slate-500">{product.description}</div>
                </div>
                <div className="text-sm font-bold text-indigo-600">{formatCurrency(product.price)}</div>
                <button
                    onClick={() => onAdd(product.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 transition hover:bg-gradient-to-br hover:from-indigo-500 hover:to-violet-500 hover:text-white hover:shadow-md hover:shadow-indigo-500/30"
                >
                    <Plus size={18} />
                </button>
            </div>
        );
    }

    return (
        <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_rgba(15,23,42,0.18)]">
            <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
            </div>
            <div className="flex flex-1 flex-col p-3.5">
                <div className="text-sm font-semibold leading-tight text-slate-900">{product.name}</div>
                <div className="mt-1 text-xs text-slate-500">{product.description}</div>
                <div className="mt-3 flex items-center justify-between">
                    <div className="text-[15px] font-bold text-indigo-600">{formatCurrency(product.price)}</div>
                    <button
                        onClick={() => onAdd(product.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 transition hover:bg-gradient-to-br hover:from-indigo-500 hover:to-violet-500 hover:text-white hover:shadow-md hover:shadow-indigo-500/30"
                        title="Ajouter au panier"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
