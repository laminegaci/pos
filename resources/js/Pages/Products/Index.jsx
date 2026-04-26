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
import PosLayout from '../../Layouts/PosLayout';
import ProductImage from '../../Components/Sales/ProductImage';
import { formatCurrency } from '../../lib/formatCurrency';

const LOW_STOCK = 10;

function stockStatus(stock) {
    if (stock === 0) return { label: 'Rupture', tone: 'red' };
    if (stock < LOW_STOCK) return { label: 'Faible', tone: 'amber' };
    return { label: 'En stock', tone: 'emerald' };
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

    const allCategories = useMemo(() => [{ id: 'all', label: 'Tout' }, ...categories], [categories]);
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
        if (!confirm(`Supprimer « ${product.name} » ?`)) return;
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
            setErrors({ ...errors, image: 'Erreur upload' });
        } finally {
            setUploadingImage(false);
        }
    };

    const handleImageRemove = () => {
        setFormData({ ...formData, image: '' });
    };

    return (
        <>
            <Head title="Produits" />
            <PosLayout>
                <div className="flex flex-1 flex-col overflow-hidden px-8 py-6">
                    {/* Header */}
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Produits</h1>
                            <p className="text-sm text-slate-500">Gérer votre catalogue et votre stock</p>
                        </div>
                        <button
                            onClick={openCreateModal}
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl hover:shadow-indigo-500/40 active:scale-[0.98]"
                        >
                            <Plus size={18} />
                            Nouveau produit
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                        <StatCard icon={Box} label="Total produits" value={stats.total} tone="indigo" />
                        <StatCard
                            icon={AlertTriangle}
                            label="Stock faible"
                            value={stats.lowStock}
                            tone="amber"
                            hint={`< ${LOW_STOCK} unités`}
                        />
                        <StatCard icon={XCircle} label="Ruptures" value={stats.outOfStock} tone="red" />
                        <StatCard
                            icon={Layers}
                            label="Valeur stock"
                            value={formatCurrency(stats.inventoryValue)}
                            tone="emerald"
                        />
                    </div>

                    {/* Toolbar */}
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative max-w-sm flex-1">
                            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Rechercher par nom, SKU, description..."
                                className="h-10 w-full rounded-full border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                                {allCategories.map((cat) => {
                                    const active = cat.id === filterCategory;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setFilterCategory(cat.id)}
                                            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
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
                            <div className="ml-1 flex items-center gap-1 rounded-full bg-white p-1 ring-1 ring-slate-200">
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                                        viewMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                    title="Tableau"
                                >
                                    <List size={15} />
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                                        viewMode === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                    title="Grille"
                                >
                                    <LayoutGrid size={15} />
                                </button>
                                <div className="h-4 w-px bg-slate-200" />
                                <button
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:text-slate-900"
                                    title="Exporter"
                                >
                                    <Download size={15} />
                                </button>
                                <label
                                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-500 transition hover:text-slate-900"
                                    title="Importer"
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
                                <div className="text-sm font-medium text-slate-600">Aucun produit trouvé</div>
                                <div className="text-xs text-slate-400">Ajustez vos filtres ou créez un nouveau produit.</div>
                                <button
                                    onClick={openCreateModal}
                                    className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                                >
                                    <Plus size={14} /> Nouveau produit
                                </button>
                            </div>
                        ) : viewMode === 'table' ? (
                            <div className="h-full overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur">
                                        <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                            <th className="px-5 py-3">Produit</th>
                                            <th className="px-5 py-3">Catégorie</th>
                                            <th className="px-5 py-3">SKU</th>
                                            <th className="px-5 py-3 text-right">Prix</th>
                                            <th className="px-5 py-3">Stock</th>
                                            <th className="px-5 py-3">Statut</th>
                                            <th className="px-5 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredProducts.map((product) => {
                                            const st = stockStatus(product.stock);
                                            return (
                                                <tr key={product.id} className="group transition hover:bg-slate-50/60">
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <ProductImage product={product} size="md" />
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
                                                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{product.sku || '—'}</td>
                                                    <td className="px-5 py-3 text-right font-semibold text-indigo-600">
                                                        {formatCurrency(product.price)}
                                                    </td>
                                                    <td className="px-5 py-3">
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
                                                    <td className="px-5 py-3">
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
                                                                'Inactif'
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                                                            <button
                                                                onClick={() => openEditModal(product)}
                                                                className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                                                                title="Modifier"
                                                            >
                                                                <Pencil size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(product)}
                                                                className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                                                title="Supprimer"
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
                            <div className="h-full overflow-y-auto p-4">
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
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
                                                    <div className="mt-0.5 text-xs text-slate-500">{product.description}</div>
                                                    <div className="mt-3 flex items-center justify-between">
                                                        <span className="text-[15px] font-bold text-indigo-600">{formatCurrency(product.price)}</span>
                                                        <span
                                                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${toneClasses[st.tone]}`}
                                                        >
                                                            {product.stock} · {st.label}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
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
                        {filteredProducts.length} / {products.length} produit{products.length > 1 ? 's' : ''}
                    </div>
                </div>
            </PosLayout>

            {/* Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
                                </h2>
                                <p className="text-xs text-slate-500">
                                    {editingProduct ? 'Mettez à jour les informations ci-dessous.' : 'Ajoutez un produit à votre catalogue.'}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 p-6 md:grid-cols-[180px_1fr]">
                            <div className="flex flex-col gap-2">
                                <div className="text-xs font-medium text-slate-600">Image</div>
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
                                        <span className="text-xs text-slate-500">{uploadingImage ? 'Upload...' : 'Télécharger'}</span>
                                    </label>
                                )}
                                {errors.image && <div className="text-xs text-red-600">{errors.image}</div>}
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <Field label="Nom" error={errors.name}>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className={inputCls(errors.name)}
                                    />
                                </Field>
                                <Field label="Description" error={errors.description}>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className={inputCls(errors.description)}
                                        rows={2}
                                    />
                                </Field>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Prix (DA)" error={errors.price}>
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
                                    <Field label="Stock" error={errors.stock}>
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
                                    <Field label="Catégorie" error={errors.category_id}>
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
                                    <Field label="SKU" error={errors.sku}>
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
                                    <span className="text-sm text-slate-700">Produit actif (visible à la vente)</span>
                                </label>
                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl hover:shadow-indigo-500/40 disabled:opacity-60"
                                    >
                                        {submitting ? 'Enregistrement…' : editingProduct ? 'Mettre à jour' : 'Créer'}
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
