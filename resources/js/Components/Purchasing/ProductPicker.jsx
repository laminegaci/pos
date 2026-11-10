import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { inputCls } from './FlashToast';

/** Type a name / SKU / barcode, pick a product. Enter picks the first match (an exact barcode wins). */
export default function ProductPicker({ products, onPick, excludeIds = [] }) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');

    const matches = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return products
            .filter((p) => !excludeIds.includes(p.id))
            .filter((p) => [p.name, p.sku, p.barcode].some((v) => v && String(v).toLowerCase().includes(q)))
            .slice(0, 8);
    }, [query, products, excludeIds]);

    const pick = (p) => {
        onPick(p);
        setQuery('');
    };

    const onKeyDown = (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const exact = matches.find((p) => p.barcode && p.barcode === query.trim());
        const target = exact ?? matches[0];
        if (target) pick(target);
    };

    return (
        <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t('purchases.addProduct')}
                className={`${inputCls} pl-9`}
            />
            {matches.length > 0 && (
                <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    {matches.map((p) => (
                        <li key={p.id}>
                            <button
                                type="button"
                                onClick={() => pick(p)}
                                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                            >
                                <span className="font-medium text-slate-800">{p.name}</span>
                                <span className="text-xs text-slate-400">{p.sku}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
