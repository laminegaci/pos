import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../lib/formatCurrency';
import ProductImage from './ProductImage';

export default function ProductCard({ product, viewMode, onAdd }) {
    const { t } = useTranslation();
    const out = !product.unlimited_stock && product.stock <= 0;
    const low = !product.unlimited_stock && product.stock > 0 && product.stock <= (product.effective_min_stock ?? 0);

    // Out of stock stays clickable: the page explains why it cannot be added (toast + sound).
    const dim = out ? 'opacity-60' : '';

    const badge = out ? (
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30">
            {t('products.statusOut')}
        </span>
    ) : low ? (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30">
            {t('cart.remaining', { count: product.stock })}
        </span>
    ) : null;

    if (viewMode === 'list') {
        return (
            <div
                className={`flex items-center gap-4 rounded-2xl border border-slate-200/60 bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-6px_rgba(15,23,42,0.12)] ${dim}`}
            >
                <ProductImage product={product} size="md" />
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900">{product.name}</div>
                    <div className="truncate text-xs text-slate-500">{product.description}</div>
                </div>
                {badge}
                <div className="text-sm font-bold text-indigo-600">{formatCurrency(product.price)}</div>
                <button
                    onClick={() => onAdd(product.id)}
                    aria-label={t('sales.addToCart')}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 transition hover:bg-gradient-to-br hover:from-indigo-500 hover:to-violet-500 hover:text-white hover:shadow-md hover:shadow-indigo-500/30"
                >
                    <Plus size={18} />
                </button>
            </div>
        );
    }

    return (
        <div
            className={`group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_rgba(15,23,42,0.18)] ${dim}`}
        >
            <ProductImage product={product} size="lg" />
            {badge && <div className="absolute left-2 top-2">{badge}</div>}
            <div className="flex flex-1 flex-col p-3.5">
                <div className="text-sm font-semibold leading-tight text-slate-900">{product.name}</div>
                <div className="mt-1 text-xs text-slate-500">{product.description}</div>
                <div className="mt-3 flex items-center justify-between">
                    <div className="text-[15px] font-bold text-indigo-600">{formatCurrency(product.price)}</div>
                    <button
                        onClick={() => onAdd(product.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 transition hover:bg-gradient-to-br hover:from-indigo-500 hover:to-violet-500 hover:text-white hover:shadow-md hover:shadow-indigo-500/30"
                        title={t('sales.addToCart')}
                        aria-label={t('sales.addToCart')}
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
