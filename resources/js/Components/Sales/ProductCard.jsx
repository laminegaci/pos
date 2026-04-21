import { Plus } from 'lucide-react';
import { formatCurrency } from '../../lib/formatCurrency';

export default function ProductCard({ product, viewMode, onAdd }) {
    if (viewMode === 'list') {
        return (
            <div className="flex items-center gap-4 rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md">
                <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    className="h-16 w-16 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-gray-900">{product.name}</div>
                    <div className="truncate text-xs text-gray-500">{product.description}</div>
                </div>
                <div className="text-sm font-bold text-indigo-600">{formatCurrency(product.price)}</div>
                <button
                    onClick={() => onAdd(product.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition hover:bg-indigo-600 hover:text-white"
                >
                    <Plus size={18} />
                </button>
            </div>
        );
    }

    return (
        <div className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md">
            <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
            </div>
            <div className="flex flex-1 flex-col p-3">
                <div className="text-sm font-semibold text-gray-900">{product.name}</div>
                <div className="mt-0.5 text-xs text-gray-500">{product.description}</div>
                <div className="mt-2 flex items-center justify-between">
                    <div className="text-sm font-bold text-indigo-600">{formatCurrency(product.price)}</div>
                    <button
                        onClick={() => onAdd(product.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition hover:bg-indigo-600 hover:text-white"
                        title="Ajouter au panier"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
