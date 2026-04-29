import { Head, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    AlertTriangle,
    Box,
    CheckCircle2,
    Download,
    Layers,
    LayoutGrid,
    List,
    Pencil,
    Plus,
    Search,
    Trash2,
    Upload,
    X,
    XCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PosLayout from '../../Layouts/PosLayout';
import ProductImage from '../../Components/Sales/ProductImage';
import { formatCurrency } from '../../lib/formatCurrency';

const LOW_STOCK = 10;

function stockStatus(stock, t) {
    if (stock === 0) return { label: t('products.statusOut'), tone: 'red' };
    if (stock < LOW_STOCK) return { label: t('products.statusLow'), tone: 'amber' };
    return { label: t('products.statusInStock'), tone: 'emerald' };
}

const toneClasses = {
    red: 'bg-red-50 text-red-700 ring-red-200',
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

export default function ProductsIndex({ products, categories }) {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [viewMode, setViewMode] = useState('table');
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [formData, setFormData] = useState(emptyForm());

    function emptyForm() {
        return {
            name: '',
            description: '',
            price: '',
            category_id: categories[0]?.id ?? 'bureaux',
            stock: '',
            sku: '',
            image: '',
            active: true,
        };
    }

    const allCategories = useMemo(() => [{ id: 'all', label: t('common.all') }, ...categories], [categories, t]);
    const categoryLabel = (id) => categories.find((c) => c.id === id)?.label ?? id;

    const filteredProducts = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return products.filter((p) => {
            const matchesSearch =
                !q ||
                p.name.toLowerCase().includes(q) ||
                (p.description ?? '').toLowerCase().includes(q) ||
                (p.sku ?? '').toLowerCase().includes(q);
            const matchesCategory = filterCategory === 'all' || p.category_id === filterCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, filterCategory]);

    const stats = useMemo(() => {
        const total = products.length;
        const outOfStock = products.filter((p) => p.stock === 0).length;
        const lowStock = products.filter((p) => p.stock > 0 && p.stock < LOW_STOCK).length;
        const inventoryValue = products.reduce((sum, p) => sum + Number(p.price) * p.stock, 0);
        return { total, outOfStock, lowStock, inventoryValue };
    }, [products]);

    const openCreateModal = () => {
        setEditingProduct(null);
        setFormData(emptyForm());
        setErrors({});
        setShowModal(true);
    };

    const openEditModal = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            description: product.description ?? '',
            price: product.price,
            category_id: product.category_id,
            stock: product.stock,
            sku: product.sku ?? '',
            image: product.image ?? '',
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
        };
        if (editingProduct) {
            router.put(`/produits/${editingProduct.id}`, formData, options);
        } else {
            router.post('/produits', formData, options);
        }
    };

    const handleDelete = (product) => {
        if (!confirm(t('products.confirmDelete', { name: product.name }))) return;
        router.delete(`/produits/${product.id}`, { preserveScroll: true });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingImage(true);
        try {
            const formDataImg = new FormData();
            formDataImg.append('image', file);
            const res = await fetch('/produits/upload-image', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
                body: formDataImg,
            });
            const data = await res.json();
            if (data.url) {
                setFormData({ ...formData, image: data.url });
            }
        } catch {
            setErrors({ ...errors, image: t('products.uploadError') });
        } finally {
            setUploadingImage(false);
        }
    };

    const handleImageRemove = () => {
        setFormData({ ...formData, image: '' });
    };

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
                        <button
                            onClick={openCreateModal}
                            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl hover:shadow-indigo-500/40 active:scale-[0.98]"
                        >
                            <Plus size={18} />
                            <span className="hidden sm:inline">{t('products.newProduct')}</span>
                            <span className="sm:hidden">{t('products.add')}</span>
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatCard icon={Box} label={t('products.totalProducts')} value={stats.total} tone="indigo" />
                        <StatCard
                            icon={AlertTriangle}
                            label={t('products.lowStock')}
                            value={stats.lowStock}
                            tone="amber"
                            hint={t('products.lowStockHint', { count: LOW_STOCK })}
                        />
                        <StatCard icon={XCircle} label={t('products.outOfStock')} value={stats.outOfStock} tone="red" />
                        <StatCard
                            icon={Layers}
                            label={t('products.stockValue')}
                            value={formatCurrency(stats.inventoryValue)}
                            tone="emerald"
                        />
                    </div>

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
                                <table className="w-full min-w-[700px] text-sm">
                                    <thead className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur">
                                        <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                            <th className="px-5 py-3">{t('products.title')}</th>
                                            <th className="px-5 py-3">{t('products.category')}</th>
                                            <th className="px-5 py-3 hidden md:table-cell">{t('products.sku')}</th>
                                            <th className="px-5 py-3 text-right">{t('products.price')}</th>
                                            <th className="px-5 py-3 hidden sm:table-cell">{t('products.stock')}</th>
                                            <th className="px-5 py-3 hidden lg:table-cell">{t('products.status')}</th>
                                            <th className="px-5 py-3 text-right">{t('common.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredProducts.map((product) => {
                                            const st = stockStatus(product.stock, t);
                                            return (
                                                <tr key={product.id} className="group transition hover:bg-slate-50/60">
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
                                                    <td className="px-5 py-3 hidden md:table-cell font-mono text-xs text-slate-500">{product.sku || '—'}</td>
                                                    <td className="px-5 py-3 text-right font-semibold text-indigo-600">
                                                        {formatCurrency(product.price)}
                                                    </td>
                                                    <td className="px-5 py-3 hidden sm:table-cell">
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
                                                    </td>
                                                    <td className="px-5 py-3 hidden lg:table-cell">
                                                        <span
                                                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                                                                product.active ? toneClasses[st.tone] : toneClasses.slate
                                                            }`}
                                                        >
                                                            {product.active ? (
                                                                <>
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
                                        const st = stockStatus(product.stock);
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
                                                            {product.stock} · {st.label}
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
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 p-4 sm:p-6 md:grid-cols-[180px_1fr]">
                            <div className="flex flex-col gap-2">
                                <div className="text-xs font-medium text-slate-600">{t('products.image')}</div>
                                {formData.image ? (
                                    <div className="relative overflow-hidden rounded-xl border border-slate-200">
                                        <img src={formData.image} alt="" className="aspect-video w-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={handleImageRemove}
                                            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-md hover:bg-white hover:text-red-600"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 transition hover:border-indigo-300 hover:bg-indigo-50/50">
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                                        <Upload size={20} className="mb-1 text-slate-400" />
                                        <span className="text-xs text-slate-500">{uploadingImage ? t('products.uploading') : t('products.upload')}</span>
                                    </label>
                                )}
                                {errors.image && <div className="text-xs text-red-600">{errors.image}</div>}
                            </div>
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
                                    <Field label={t('products.priceDa')} error={errors.price}>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            className={inputCls(errors.price)}
                                        />
                                    </Field>
                                    <Field label={t('products.stock')} error={errors.stock}>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            value={formData.stock}
                                            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                            className={inputCls(errors.stock)}
                                        />
                                    </Field>
                                </div>
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
                                <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.active}
                                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-slate-700">{t('products.active')}</span>
                                </label>
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
