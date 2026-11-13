import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    Box,
    CheckCircle2,
    Download,
    History,
    Infinity as InfinityIcon,
    Layers,
    LayoutGrid,
    List,
    Barcode,
    Pencil,
    Printer,
    SlidersHorizontal,
    Sparkles,
    Tags,
    Plus,
    Search,
    Trash2,
    Upload,
    X,
    XCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PosLayout from '../../Layouts/PosLayout';
import CategoryManager from '../../Components/Sales/CategoryManager';
import ProductImage from '../../Components/Sales/ProductImage';
import ProductImageManager from '../../Components/Products/ProductImageManager';
import AdjustStockModal from '../../Components/Stock/AdjustStockModal';
import { currencySymbol, formatCurrency } from '../../lib/formatCurrency';
import usePrintDocument from '../../lib/printDocument';

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** EAN-13 check digit (same rule as App\Support\Ean13). */
function eanValid(code) {
    if (!/^\d{13}$/.test(code)) return false;
    const sum = [...code.slice(0, 12)].reduce((s, d, i) => s + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
    return (10 - (sum % 10)) % 10 === Number(code[12]);
}

/** Margin figures from a TTC price, a VAT rate and an optional HT purchase cost. */
function pricing(price, vat, cost) {
    const ttc = Number(price) || 0;
    const ht = round2(ttc / (1 + (Number(vat) || 0) / 100));
    if (cost === '' || cost === null || cost === undefined || Number.isNaN(Number(cost))) return { ht, margin: null };
    const margin = round2(ht - Number(cost));
    return {
        ht,
        margin,
        rate: ht > 0 ? round2((margin / ht) * 100) : null,
        coef: Number(cost) > 0 ? round2(ttc / Number(cost)) : null,
    };
}

function marginTone(rate) {
    if (rate === null || rate === undefined) return 'slate';
    if (rate < 0) return 'red';
    if (rate < 15) return 'amber';
    return 'emerald';
}

/** The server decides the level (own minimum, else the shop default): stock_status = out | low | ok | unlimited. */
function stockStatus(product, t) {
    switch (product.stock_status) {
        case 'unlimited':
            return { label: t('products.unlimited'), tone: 'indigo' };
        case 'out':
            return { label: t('products.statusOut'), tone: 'red' };
        case 'low':
            return { label: t('products.statusLow'), tone: 'amber' };
        default:
            return { label: t('products.statusInStock'), tone: 'emerald' };
    }
}

const toneClasses = {
    red: 'bg-red-50 text-red-700 ring-red-200',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
};

function StatCard({ icon: Icon, label, value, tone = 'indigo', hint }) {
    const tones = {
        indigo: 'from-indigo-500 to-violet-500',
        emerald: 'from-emerald-500 to-teal-500',
        amber: 'from-amber-500 to-orange-500',
        red: 'from-red-500 to-rose-500',
    };
    return (
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${tones[tone]} text-white shadow-sm`}>
                <Icon size={20} />
            </div>
            <div className="flex-1">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
                <div className="text-xl font-bold text-slate-900">{value}</div>
                {hint && <div className="text-xs text-slate-400">{hint}</div>}
            </div>
        </div>
    );
}

export default function ProductsIndex({
    products,
    categories,
    defaultVatRate = 19,
    defaultMinStock = 10,
    canManageStock = false,
    vatRates = [0, 9, 19],
    shopName = '',
}) {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);
    const [selected, setSelected] = useState(() => new Set());
    const [showLabels, setShowLabels] = useState(false);
    const [htDraft, setHtDraft] = useState(null);
    const [generatingEan, setGeneratingEan] = useState(false);
    const [showCategories, setShowCategories] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [searchQuery, setSearchQuery] = useState(() => new URLSearchParams(window.location.search).get('q') ?? '');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterStock, setFilterStock] = useState(() => {
        const v = new URLSearchParams(window.location.search).get('stock');
        return v === 'faible' || v === 'low' ? 'low' : v === 'rupture' || v === 'out' ? 'out' : 'all';
    });
    const [adjusting, setAdjusting] = useState(null);
    const [viewMode, setViewMode] = useState('table');
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [removedMedia, setRemovedMedia] = useState([]);
    const [coverMediaId, setCoverMediaId] = useState(null);
    const [removeLegacyImage, setRemoveLegacyImage] = useState(false);
    const [formData, setFormData] = useState(emptyForm());

    function emptyForm() {
        return {
            name: '',
            description: '',
            price: '',
            cost_price: '',
            vat_rate: defaultVatRate,
            category_id: categories[0]?.id ?? '',
            stock: '',
            unlimited_stock: false,
            min_stock: '',
            sku: '',
            barcode: '',
            images: [],
            active: true,
        };
    }

    const allCategories = useMemo(() => [{ id: 'all', label: t('common.all') }, ...categories], [categories, t]);
    useEffect(() => {
        if (filterCategory !== 'all' && !categories.some((c) => c.id === filterCategory)) setFilterCategory('all');
    }, [categories, filterCategory]);
    const categoryLabel = (id) => categories.find((c) => c.id === id)?.label ?? id;

    const filteredProducts = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return products.filter((p) => {
            const matchesSearch =
                !q ||
                p.name.toLowerCase().includes(q) ||
                (p.description ?? '').toLowerCase().includes(q) ||
                (p.sku ?? '').toLowerCase().includes(q) ||
                (p.barcode ?? '').includes(q);
            const matchesCategory = filterCategory === 'all' || p.category_id === filterCategory;
            const matchesStock =
                filterStock === 'all' ||
                (filterStock === 'out' && p.stock_status === 'out') ||
                (filterStock === 'low' && (p.stock_status === 'low' || p.stock_status === 'out'));
            return matchesSearch && matchesCategory && matchesStock;
        });
    }, [products, searchQuery, filterCategory, filterStock]);

    const stats = useMemo(() => {
        const total = products.length;
        // Unlimited products have no quantity to run out of, nor to value.
        const tracked = products.filter((p) => !p.unlimited_stock);
        const outOfStock = tracked.filter((p) => p.stock_status === 'out').length;
        const lowStock = tracked.filter((p) => p.stock_status === 'low').length;
        const inventoryValue = tracked.reduce((sum, p) => sum + Number(p.price) * p.stock, 0);
        // Stock valued at purchase cost (HT); products without a cost are counted separately.
        const costValue = tracked.reduce((sum, p) => sum + Number(p.cost_price ?? 0) * p.stock, 0);
        const noCost = products.filter((p) => p.cost_price === null || p.cost_price === undefined).length;
        return { total, outOfStock, lowStock, inventoryValue, costValue, noCost };
    }, [products]);

    // After an adjustment the list reloads: keep the open edit form's quantity in sync.
    useEffect(() => {
        if (!editingProduct) return;
        const fresh = products.find((p) => p.id === editingProduct.id);
        if (fresh && fresh.stock !== editingProduct.stock) {
            setEditingProduct(fresh);
            setFormData((f) => ({ ...f, stock: fresh.stock }));
        }
    }, [products]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggleSelected = (id) =>
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    const allVisibleSelected = filteredProducts.length > 0 && filteredProducts.every((p) => selected.has(p.id));
    const toggleAllVisible = () =>
        setSelected(allVisibleSelected ? new Set() : new Set(filteredProducts.map((p) => p.id)));

    const generateEan = async () => {
        setGeneratingEan(true);
        try {
            const res = await fetch('/produits/generer-ean', {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content, Accept: 'application/json' },
            });
            const data = await res.json();
            if (data.barcode) setFormData((f) => ({ ...f, barcode: data.barcode }));
        } finally {
            setGeneratingEan(false);
        }
    };

    const openCreateModal = () => {
        setEditingProduct(null);
        setHtDraft(null);
        setRemovedMedia([]);
        setCoverMediaId(null);
        setRemoveLegacyImage(false);
        setFormData(emptyForm());
        setErrors({});
        setShowModal(true);
    };

    // Topbar "New product" shortcut: /produits?nouveau=1 opens the form, then cleans the URL.
    const pageUrl = usePage().url;
    useEffect(() => {
        if (new URLSearchParams(pageUrl.split('?')[1] ?? '').get('nouveau') !== '1') return;
        openCreateModal();
        window.history.replaceState(window.history.state, '', '/produits');
    }, [pageUrl]);

    const openEditModal = (product) => {
        setEditingProduct(product);
        setHtDraft(null);
        setRemovedMedia([]);
        setCoverMediaId(product.cover_media_id ?? product.images?.[0]?.id ?? null);
        setRemoveLegacyImage(false);
        setFormData({
            name: product.name,
            description: product.description ?? '',
            price: product.price,
            cost_price: product.cost_price ?? '',
            vat_rate: Number(product.vat_rate ?? defaultVatRate),
            category_id: product.category_id,
            stock: product.stock,
            unlimited_stock: !!product.unlimited_stock,
            min_stock: product.min_stock ?? '',
            sku: product.sku ?? '',
            barcode: product.barcode ?? '',
            images: [],
            active: product.active,
        });
        setErrors({});
        setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitting(true);
        const options = {
            onSuccess: () => setShowModal(false),
            onError: (errs) => setErrors(errs),
            onFinish: () => setSubmitting(false),
            preserveScroll: true,
            forceFormData: true,
        };
        const payload = {
            ...formData,
            remove_media: removedMedia,
            cover_media_id: coverMediaId,
            remove_legacy_image: removeLegacyImage,
        };
        if (editingProduct) {
            router.post(`/produits/${editingProduct.id}`, { ...payload, _method: 'put' }, options);
        } else {
            router.post('/produits', payload, options);
        }
    };

    const handleDelete = (product) => {
        if (!confirm(t('products.confirmDelete', { name: product.name }))) return;
        router.delete(`/produits/${product.id}`, { preserveScroll: true });
    };

    const toggleRemovedMedia = (id) => {
        setRemovedMedia((previous) => {
            const next = previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id];
            if (next.includes(coverMediaId)) {
                const nextCover = (editingProduct?.images ?? []).find((image) => !next.includes(image.id))?.id ?? null;
                setCoverMediaId(nextCover);
            }
            return next;
        });
    };

    const addPendingImages = (files) => {
        setFormData((previous) => ({ ...previous, images: [...previous.images, ...files] }));
    };

    const removePendingImage = (index) => {
        setFormData((previous) => ({ ...previous, images: previous.images.filter((_, i) => i !== index) }));
    };

    const legacyImage =
        editingProduct?.image &&
        (editingProduct.image.startsWith('/storage/') || editingProduct.image.startsWith('http'))
            ? editingProduct.image
            : null;

    return (
        <>
            <Head title={t('products.title')} />
            <PosLayout>
                <div className="flex flex-1 flex-col overflow-hidden p-4 md:px-8 md:py-6">
                    {/* Header */}
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('products.title')}</h1>
                            <p className="text-sm text-slate-500">{t('products.subtitle')}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                        <button
                            onClick={() => setShowLabels(true)}
                            disabled={selected.size === 0}
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Printer size={16} />
                            <span className="hidden sm:inline">{t('products.printLabels')}</span>
                            {selected.size > 0 && <span className="rounded-full bg-indigo-100 px-2 text-xs text-indigo-700">{selected.size}</span>}
                        </button>
                        <button
                            onClick={openCreateModal}
                            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl hover:shadow-indigo-500/40 active:scale-[0.98]"
                        >
                            <Plus size={18} />
                            <span className="hidden sm:inline">{t('products.newProduct')}</span>
                            <span className="sm:hidden">{t('products.add')}</span>
                        </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatCard icon={Box} label={t('products.totalProducts')} value={stats.total} tone="indigo" />
                        <StatCard
                            icon={AlertTriangle}
                            label={t('products.lowStock')}
                            value={stats.lowStock}
                            tone="amber"
                            hint={t('products.lowStockHint', { count: defaultMinStock })}
                        />
                        <StatCard icon={XCircle} label={t('products.outOfStock')} value={stats.outOfStock} tone="red" />
                        <StatCard
                            icon={Layers}
                            label={t('products.stockValue')}
                            value={formatCurrency(stats.inventoryValue)}
                            tone="emerald"
                            hint={t('products.stockValueCost', { value: formatCurrency(stats.costValue) })}
                        />
                    </div>
                    {stats.noCost > 0 && (
                        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
                            <AlertTriangle size={14} /> {t('products.noCostWarning', { count: stats.noCost })}
                        </div>
                    )}

                    {/* Toolbar */}
                    <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="relative w-full max-w-sm">
                            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={`${t('common.search')}...`}
                                className="h-10 w-full rounded-full border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('products.stockFilter')}>
                            {[
                                ['all', t('common.all')],
                                ['low', t('products.filterLow')],
                                ['out', t('products.filterOut')],
                            ].map(([id, label]) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setFilterStock(id)}
                                    aria-pressed={filterStock === id}
                                    className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
                                        filterStock === id
                                            ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                                            : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
                            <div className="flex flex-nowrap items-center gap-1.5">
                                {allCategories.map((cat) => {
                                    const active = cat.id === filterCategory;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setFilterCategory(cat.id)}
                                            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                                                active
                                                    ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25'
                                                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900'
                                            }`}
                                        >
                                            {cat.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCategories(true)}
                                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-900"
                            >
                                <Tags size={14} /> {t('categories.manage')}
                            </button>
                            <div className="ml-1 flex shrink-0 items-center gap-1 rounded-full bg-white p-1 ring-1 ring-slate-200">
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                                        viewMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                    title={t('products.table')}
                                >
                                    <List size={15} />
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                                        viewMode === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                    title={t('products.grid')}
                                >
                                    <LayoutGrid size={15} />
                                </button>
                                <div className="h-4 w-px bg-slate-200" />
                                <button
                                    onClick={() => window.location.href = '/produits/export'}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:text-slate-900"
                                    title={t('common.export')}
                                >
                                    <Download size={15} />
                                </button>
                                <label
                                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-500 transition hover:text-slate-900"
                                    title={t('common.import')}
                                >
                                    <Upload size={15} />
                                    <input type="file" accept=".csv,.xlsx,.xls" className="hidden" />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                        {filteredProducts.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                    <Box size={24} />
                                </div>
                                <div className="text-sm font-medium text-slate-600">{t('products.noProductFound')}</div>
                                <div className="text-xs text-slate-400">{t('products.adjustFilters')}</div>
                                <button
                                    onClick={openCreateModal}
                                    className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                                >
                                    <Plus size={14} /> {t('products.newProduct')}
                                </button>
                            </div>
                        ) : viewMode === 'table' ? (
                            <div className="h-full overflow-auto">
                                <table className="w-full min-w-[900px] text-sm">
                                    <thead className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur">
                                        <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                            <th className="w-10 px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={allVisibleSelected}
                                                    onChange={toggleAllVisible}
                                                    aria-label={t('products.selectAll')}
                                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </th>
                                            <th className="px-5 py-3">{t('products.title')}</th>
                                            <th className="px-5 py-3">{t('products.category')}</th>
                                            <th className="px-5 py-3 hidden md:table-cell">{t('products.sku')}</th>
                                            <th className="px-5 py-3 text-right">{t('products.price')}</th>
                                            <th className="px-5 py-3 text-right hidden lg:table-cell">{t('products.costPrice')}</th>
                                            <th className="px-5 py-3 text-right hidden lg:table-cell">{t('products.margin')}</th>
                                            <th className="px-5 py-3 hidden sm:table-cell">{t('products.stock')}</th>
                                            <th className="px-5 py-3 hidden lg:table-cell">{t('products.status')}</th>
                                            <th className="px-5 py-3 text-right">{t('common.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredProducts.map((product) => {
                                            const st = stockStatus(product, t);
                                            return (
                                                <tr key={product.id} className="group transition hover:bg-slate-50/60">
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={selected.has(product.id)}
                                                            onChange={() => toggleSelected(product.id)}
                                                            aria-label={product.name}
                                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <ProductImage product={product} size="md" className="hidden sm:block" />
                                                            <div className="min-w-0">
                                                                <div className="truncate font-semibold text-slate-900">{product.name}</div>
                                                                <div className="truncate text-xs text-slate-500">{product.description}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                                            {categoryLabel(product.category_id)}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 hidden md:table-cell font-mono text-xs text-slate-500">
                                                        <div>{product.sku || '—'}</div>
                                                        {product.barcode && (
                                                            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                                                                <Barcode size={11} /> {product.barcode}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3 text-right font-semibold text-indigo-600">
                                                        {formatCurrency(product.price)}
                                                    </td>
                                                    <td className="px-5 py-3 text-right hidden lg:table-cell text-slate-600">
                                                        {product.cost_price === null || product.cost_price === undefined ? '—' : formatCurrency(product.cost_price)}
                                                    </td>
                                                    <td className="px-5 py-3 text-right hidden lg:table-cell">
                                                        {product.margin_rate === null || product.margin_rate === undefined ? (
                                                            <span className="text-slate-400">—</span>
                                                        ) : (
                                                            <span
                                                                title={formatCurrency(product.margin)}
                                                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${toneClasses[marginTone(product.margin_rate)]}`}
                                                            >
                                                                {product.margin_rate}%
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3 hidden sm:table-cell">
                                                        {product.unlimited_stock ? (
                                                            <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-600">
                                                                <InfinityIcon size={16} /> {t('products.unlimited')}
                                                            </span>
                                                        ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-slate-900">{product.stock}</span>
                                                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                                                                <div
                                                                    className={`h-full rounded-full ${
                                                                        st.tone === 'red'
                                                                            ? 'bg-red-500'
                                                                            : st.tone === 'amber'
                                                                              ? 'bg-amber-500'
                                                                              : 'bg-emerald-500'
                                                                    }`}
                                                                    style={{ width: `${Math.min(100, (product.stock / 50) * 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3 hidden lg:table-cell">
                                                        <span
                                                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                                                                product.active ? toneClasses[st.tone] : toneClasses.slate
                                                            }`}
                                                        >
                                                            {product.active ? (
                                                                <>
                                                                    {st.tone === 'indigo' && <InfinityIcon size={12} />}
                                                                    {st.tone === 'emerald' && <CheckCircle2 size={12} />}
                                                                    {st.tone === 'amber' && <AlertTriangle size={12} />}
                                                                    {st.tone === 'red' && <XCircle size={12} />}
                                                                    {st.label}
                                                                </>
                                                            ) : (
                                                                t('products.inactive')
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                                                            {canManageStock && !product.unlimited_stock && (
                                                                <button
                                                                    onClick={() => setAdjusting(product)}
                                                                    className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-600"
                                                                    title={t('products.adjust.title')}
                                                                >
                                                                    <SlidersHorizontal size={15} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => openEditModal(product)}
                                                                className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                                                                title={t('common.edit')}
                                                            >
                                                                <Pencil size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(product)}
                                                                className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                                                title={t('common.delete')}
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="h-full overflow-y-auto p-2 sm:p-4">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {filteredProducts.map((product) => {
                                        const st = stockStatus(product, t);
                                        return (
                                            <div
                                                key={product.id}
                                                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white transition hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_rgba(15,23,42,0.18)]"
                                            >
                                                <ProductImage product={product} size="lg" />
                                                <div className="flex flex-1 flex-col p-3">
                                                    <div className="text-sm font-semibold text-slate-900">{product.name}</div>
                                                    <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{product.description}</div>
                                                    <div className="mt-3 flex items-center justify-between">
                                                        <span className="text-[15px] font-bold text-indigo-600">{formatCurrency(product.price)}</span>
                                                        <span
                                                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${toneClasses[st.tone]}`}
                                                        >
                                                            {product.unlimited_stock ? '∞' : product.stock} · {st.label}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                                                    <button
                                                        onClick={() => openEditModal(product)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md backdrop-blur hover:bg-white"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-md backdrop-blur hover:bg-white"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 text-xs text-slate-400">
                        {filteredProducts.length} / {t('products.productsCount', { count: products.length })}
                    </div>
                </div>
            </PosLayout>

            {adjusting && (
                <AdjustStockModal
                    product={products.find((p) => p.id === adjusting.id) ?? adjusting}
                    onClose={() => setAdjusting(null)}
                />
            )}

            <CategoryManager open={showCategories} categories={categories} onClose={() => setShowCategories(false)} />

            {showLabels && (
                <LabelsModal
                    products={products.filter((p) => selected.has(p.id))}
                    shopName={shopName}
                    onClose={() => setShowLabels(false)}
                />
            )}

            {/* Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4 backdrop-blur-sm"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="w-full max-w-2xl overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl max-h-[90dvh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    {editingProduct ? t('products.editProduct') : t('products.newProduct')}
                                </h2>
                                <p className="text-xs text-slate-500">
                                    {editingProduct ? t('products.updateInfo') : t('products.addToCatalog')}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 p-4 sm:p-6 md:grid-cols-[220px_1fr]">
                            <ProductImageManager
                                existingImages={editingProduct?.images ?? []}
                                legacyImage={legacyImage}
                                removedMediaIds={removedMedia}
                                pendingFiles={formData.images}
                                coverMediaId={coverMediaId}
                                removeLegacy={removeLegacyImage}
                                errors={errors}
                                maxFiles={6}
                                maxSizeKb={10240}
                                onAddFiles={addPendingImages}
                                onRemovePending={removePendingImage}
                                onToggleExisting={toggleRemovedMedia}
                                onSetCover={setCoverMediaId}
                                onToggleLegacy={() => setRemoveLegacyImage((value) => !value)}
                            />
                            <div className="grid grid-cols-1 gap-4">
                                <Field label={t('products.name')} error={errors.name}>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className={inputCls(errors.name)}
                                    />
                                </Field>
                                <Field label={t('products.description')} error={errors.description}>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className={inputCls(errors.description)}
                                        rows={2}
                                    />
                                </Field>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label={t('products.priceDa', { symbol: currencySymbol() })} error={errors.price}>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={formData.price}
                                            onChange={(e) => {
                                                setHtDraft(null);
                                                setFormData({ ...formData, price: e.target.value });
                                            }}
                                            className={inputCls(errors.price)}
                                        />
                                    </Field>
                                    <Field label={t('products.stock')} error={errors.stock}>
                                        <input
                                            type="number"
                                            required={!formData.unlimited_stock}
                                            min="0"
                                            readOnly={!!editingProduct}
                                            disabled={formData.unlimited_stock}
                                            placeholder={formData.unlimited_stock ? '∞' : undefined}
                                            value={formData.unlimited_stock ? '' : formData.stock}
                                            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                            className={`${inputCls(errors.stock)} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 read-only:bg-slate-50 read-only:text-slate-600`}
                                        />
                                        {editingProduct && canManageStock && !formData.unlimited_stock && (
                                            <button
                                                type="button"
                                                onClick={() => setAdjusting(editingProduct)}
                                                className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                                            >
                                                <SlidersHorizontal size={12} /> {t('products.adjust.title')}
                                            </button>
                                        )}
                                    </Field>
                                </div>
                                {(() => {
                                    const p = pricing(formData.price, formData.vat_rate, formData.cost_price);
                                    const tone = marginTone(p.rate);
                                    return (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('products.pricingTitle')}</div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <Field label={t('products.costPriceLabel', { symbol: currencySymbol() })} error={errors.cost_price}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={formData.cost_price}
                                                        onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                                                        className={inputCls(errors.cost_price)}
                                                    />
                                                </Field>
                                                <Field label={t('products.vatRate')} error={errors.vat_rate}>
                                                    <select
                                                        value={formData.vat_rate}
                                                        onChange={(e) => {
                                                            setHtDraft(null);
                                                            setFormData({ ...formData, vat_rate: Number(e.target.value) });
                                                        }}
                                                        className={inputCls(errors.vat_rate)}
                                                    >
                                                        {vatRates.map((r) => (
                                                            <option key={r} value={r}>
                                                                {r} %
                                                            </option>
                                                        ))}
                                                    </select>
                                                </Field>
                                                <Field label={t('products.priceHtLabel', { symbol: currencySymbol() })}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={htDraft ?? (formData.price === '' ? '' : p.ht)}
                                                        onChange={(e) => {
                                                            const v = e.target.value;
                                                            setHtDraft(v);
                                                            setFormData({
                                                                ...formData,
                                                                price: v === '' ? '' : round2(Number(v) * (1 + Number(formData.vat_rate) / 100)),
                                                            });
                                                        }}
                                                        className={inputCls(false)}
                                                    />
                                                </Field>
                                            </div>
                                            <div className={`mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ring-1 ${toneClasses[tone]}`}>
                                                {p.margin === null || p.margin === undefined ? (
                                                    <span>{t('products.marginUnknown')}</span>
                                                ) : (
                                                    <>
                                                        <span className="font-semibold">
                                                            {t('products.margin')} : {formatCurrency(p.margin)}
                                                        </span>
                                                        <span>
                                                            {p.rate === null ? '—' : `${p.rate} %`}
                                                            {p.coef !== null && p.coef !== undefined ? ` · ×${p.coef}` : ''}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                                <label className="flex items-start gap-2 rounded-xl bg-indigo-50/60 px-3 py-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.unlimited_stock}
                                        onChange={(e) => setFormData({ ...formData, unlimited_stock: e.target.checked })}
                                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span>
                                        <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                                            <InfinityIcon size={14} className="text-indigo-500" /> {t('products.unlimitedLabel')}
                                        </span>
                                        <span className="block text-xs text-slate-500">{t('products.unlimitedHint')}</span>
                                    </span>
                                </label>
                                {!formData.unlimited_stock && (
                                    <Field label={t('products.minStock')} error={errors.min_stock}>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.min_stock}
                                            onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                                            placeholder={t('products.minStockPlaceholder', { count: defaultMinStock })}
                                            className={inputCls(errors.min_stock)}
                                        />
                                    </Field>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label={t('products.category')} error={errors.category_id}>
                                        <select
                                            value={formData.category_id}
                                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                            className={inputCls(errors.category_id)}
                                        >
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.label}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label={t('products.sku')} error={errors.sku}>
                                        <input
                                            type="text"
                                            value={formData.sku}
                                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                            className={inputCls(errors.sku)}
                                        />
                                    </Field>
                                </div>
                                <Field
                                    label={t('products.barcode')}
                                    error={errors.barcode || (formData.barcode && formData.barcode.length === 13 && !eanValid(formData.barcode) ? t('products.eanInvalid') : null)}
                                >
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={13}
                                            placeholder="0000000000000"
                                            value={formData.barcode}
                                            onChange={(e) => setFormData({ ...formData, barcode: e.target.value.replace(/\D/g, '') })}
                                            className={`${inputCls(errors.barcode)} font-mono tracking-wider`}
                                        />
                                        <button
                                            type="button"
                                            onClick={generateEan}
                                            disabled={generatingEan}
                                            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                                        >
                                            <Sparkles size={14} /> {t('products.generateEan')}
                                        </button>
                                    </div>
                                    <div className="mt-1 text-xs text-slate-400">{t('products.barcodeHint')}</div>
                                </Field>
                                <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.active}
                                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-slate-700">{t('products.active')}</span>
                                </label>
                                {editingProduct && !formData.unlimited_stock && <StockHistory productId={editingProduct.id} />}
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="order-2 sm:order-1 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="order-1 sm:order-2 inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl hover:shadow-indigo-500/40 disabled:opacity-60"
                                    >
                                        {submitting ? t('common.saving') : editingProduct ? t('common.update') : t('common.create')}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

/** Choose the label sheet and how many labels per product, then print them. */
function LabelsModal({ products, onClose }) {
    const { t } = useTranslation();
    const { print, printing } = usePrintDocument();
    const [format, setFormat] = useState('a4');
    const [qty, setQty] = useState(() =>
        Object.fromEntries(products.map((p) => [p.id, p.unlimited_stock ? 1 : Math.min(500, Math.max(1, p.stock))]))
    );

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const withoutEan = products.filter((p) => !p.barcode);
    const url = (extra = '') => {
        const q = new URLSearchParams({ format });
        products.forEach((p) => {
            q.append('ids[]', p.id);
            q.append(`qty[${p.id}]`, Math.min(500, Math.max(1, Number(qty[p.id]) || 1)));
        });
        return `/produits/etiquettes?${q.toString()}${extra}`;
    };
    const total = products.reduce((s, p) => s + (Math.min(500, Math.max(1, Number(qty[p.id]) || 1))), 0);

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
            <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">{t('products.printLabels')}</h2>
                        <p className="text-xs text-slate-500">{t('products.labelsCount', { count: total })}</p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <X size={18} />
                    </button>
                </div>
                <div className="space-y-4 p-5">
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            ['a4', t('products.labelsA4')],
                            ['thermal', t('products.labelsThermal')],
                        ].map(([id, label]) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setFormat(id)}
                                className={`rounded-xl px-3 py-2.5 text-sm font-medium ring-1 transition ${
                                    format === id ? 'bg-indigo-50 text-indigo-700 ring-indigo-300' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    {withoutEan.length > 0 && (
                        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                            {t('products.labelsNoEan', { count: withoutEan.length })}
                        </div>
                    )}
                    <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                        {products.map((p) => (
                            <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium text-slate-800">{p.name}</div>
                                    <div className={`font-mono text-xs ${p.barcode ? 'text-slate-400' : 'text-red-500'}`}>{p.barcode || t('products.noBarcode')}</div>
                                </div>
                                <input
                                    type="number"
                                    min="1"
                                    max="500"
                                    value={qty[p.id]}
                                    onChange={(e) => setQty({ ...qty, [p.id]: e.target.value })}
                                    aria-label={t('products.labelsQty')}
                                    className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm outline-none focus:border-indigo-400"
                                />
                            </li>
                        ))}
                    </ul>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={() => window.open(url('&print=1'), '_blank', 'noopener')}
                            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            {t('products.labelsPreview')}
                        </button>
                        <button
                            type="button"
                            onClick={() => print(url())}
                            disabled={printing}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 disabled:opacity-60"
                        >
                            <Printer size={16} /> {t('products.labelsPrint')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StockHistory({ productId }) {
    const { t, i18n } = useTranslation();
    const [open, setOpen] = useState(false);
    const [rows, setRows] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setOpen(false);
        setRows(null);
        setFailed(false);
    }, [productId]);

    useEffect(() => {
        if (!open || rows) return;
        const controller = new AbortController();
        fetch(`/produits/${productId}/mouvements`, { headers: { Accept: 'application/json' }, signal: controller.signal })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
            .then((d) => setRows(d.movements))
            .catch((e) => e.name !== 'AbortError' && setFailed(true));
        return () => controller.abort();
    }, [open, rows, productId]);

    return (
        <div className="rounded-xl border border-slate-200">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
                <History size={15} className="text-slate-400" /> {t('products.stockHistory')}
            </button>
            {open && (
                <div className="max-h-52 overflow-y-auto border-t border-slate-100 px-3 py-2">
                    {failed && <div className="py-2 text-xs text-red-600">{t('products.historyError')}</div>}
                    {!failed && !rows && <div className="py-2 text-xs text-slate-400">{t('common.loading')}</div>}
                    {rows && rows.length === 0 && <div className="py-2 text-xs text-slate-400">{t('products.noMovements')}</div>}
                    {rows && rows.length > 0 && (
                        <ul className="divide-y divide-slate-100 text-xs">
                            {rows.map((m) => (
                                <li key={m.id} className="flex items-center justify-between gap-3 py-1.5">
                                    <div className="min-w-0">
                                        <div className="font-medium text-slate-700">
                                            {t(`products.movementTypes.${m.type}`, { defaultValue: m.type })}
                                            {m.reason ? ` - ${t(`products.reasons.${m.reason}`, { defaultValue: m.reason })}` : ''}
                                            {m.sale_id ? ` #${m.sale_id}` : ''}
                                        </div>
                                        <div className="truncate text-slate-400">
                                            {new Date(m.created_at).toLocaleString(i18n.resolvedLanguage, { dateStyle: 'short', timeStyle: 'short' })}
                                            {m.user ? ` · ${m.user}` : ''}
                                            {m.note ? ` · ${m.note}` : ''}
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right tabular-nums">
                                        <div className={`font-semibold ${m.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                                        </div>
                                        <div className="text-slate-400">
                                            {m.stock_before} → {m.stock_after}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

function Field({ label, error, children }) {
    return (
        <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</label>
            {children}
            {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
        </div>
    );
}

function inputCls(error) {
    return `w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-4 ${
        error
            ? 'border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-100'
            : 'border-slate-200 bg-white focus:border-indigo-400 focus:ring-indigo-100'
    }`;
}
