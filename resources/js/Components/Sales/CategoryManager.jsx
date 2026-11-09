import { router } from '@inertiajs/react';
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#f97316', '#14b8a6', '#ef4444', '#64748b'];
const BAG = { errorBag: 'category', preserveScroll: true, preserveState: true };

function ColorPicker({ value, onChange }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {COLORS.map((c) => (
                <button
                    key={c}
                    type="button"
                    onClick={() => onChange(c)}
                    aria-label={c}
                    aria-pressed={value === c}
                    className={`h-5 w-5 rounded-full transition ${value === c ? 'ring-2 ring-slate-900 ring-offset-2' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                />
            ))}
        </div>
    );
}

function Row({ category, onError }) {
    const { t } = useTranslation();
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(category.label);
    const [color, setColor] = useState(category.color);
    const [busy, setBusy] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const inUse = category.products_count > 0;

    useEffect(() => {
        setName(category.label);
        setColor(category.color);
    }, [category.label, category.color]);

    useEffect(() => {
        if (!confirmDelete) return;
        const id = setTimeout(() => setConfirmDelete(false), 3000);
        return () => clearTimeout(id);
    }, [confirmDelete]);

    const save = () => {
        if (!name.trim() || (name.trim() === category.label && color === category.color)) {
            setEditing(false);
            setName(category.label);
            return;
        }
        router.put(`/categories/${category.db_id}`, { name, color }, {
            ...BAG,
            onStart: () => { setBusy(true); onError(''); },
            onSuccess: () => setEditing(false),
            onError: (errs) => onError(errs.name || errs.color || t('categories.error')),
            onFinish: () => setBusy(false),
        });
    };

    const remove = () => {
        if (!confirmDelete) return setConfirmDelete(true);
        router.delete(`/categories/${category.db_id}`, {
            ...BAG,
            onStart: () => { setBusy(true); onError(''); },
            onError: (errs) => onError(errs.category || t('categories.error')),
            onFinish: () => { setBusy(false); setConfirmDelete(false); },
        });
    };

    return (
        <li className="rounded-xl border border-slate-200 bg-white p-2.5">
            <div className="flex items-center gap-2.5">
                <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: editing ? color : category.color }} />
                {editing ? (
                    <input
                        autoFocus
                        value={name}
                        maxLength={100}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') save();
                            if (e.key === 'Escape') { setEditing(false); setName(category.label); setColor(category.color); }
                        }}
                        className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                ) : (
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{category.label}</span>
                )}
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {t('categories.productsCount', { count: category.products_count })}
                </span>
                {editing ? (
                    <>
                        <button type="button" onClick={save} disabled={busy} className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50" aria-label={t('common.save')}>
                            {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={16} />}
                        </button>
                        <button type="button" onClick={() => { setEditing(false); setName(category.label); setColor(category.color); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label={t('common.cancel')}>
                            <X size={16} />
                        </button>
                    </>
                ) : (
                    <>
                        <button type="button" onClick={() => setEditing(true)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label={t('common.edit')} title={t('common.edit')}>
                            <Pencil size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={remove}
                            disabled={busy || inUse}
                            title={inUse ? t('categories.inUseHint') : t('common.delete')}
                            aria-label={t('common.delete')}
                            className={`flex h-8 items-center justify-center rounded-lg text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-30 ${
                                confirmDelete ? 'bg-red-500 px-2.5 text-white hover:bg-red-600' : 'w-8 text-red-500 hover:bg-red-50'
                            }`}
                        >
                            {confirmDelete ? t('cart.confirmClear') : <Trash2 size={14} />}
                        </button>
                    </>
                )}
            </div>
            {editing && (
                <div className="mt-2.5 pl-6">
                    <ColorPicker value={color} onChange={setColor} />
                </div>
            )}
        </li>
    );
}

/** Create / rename / recolor / delete categories. Opened from the products list. */
export default function CategoryManager({ open, categories, onClose }) {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [color, setColor] = useState(COLORS[0]);
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const add = (e) => {
        e.preventDefault();
        if (!name.trim() || adding) return;
        router.post('/categories', { name, color }, {
            ...BAG,
            onStart: () => { setAdding(true); setError(''); },
            onSuccess: () => { setName(''); setColor(COLORS[(categories.length + 1) % COLORS.length]); },
            onError: (errs) => setError(errs.name || errs.color || t('categories.error')),
            onFinish: () => setAdding(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={t('categories.title')}
                className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">{t('categories.title')}</h2>
                        <p className="text-sm text-slate-500">{t('categories.subtitle')}</p>
                    </div>
                    <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100" aria-label={t('common.close')}>
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={add} className="border-b border-slate-100 px-5 py-4">
                    <div className="flex gap-2">
                        <input
                            value={name}
                            maxLength={100}
                            onChange={(e) => { setName(e.target.value); setError(''); }}
                            placeholder={t('categories.namePlaceholder')}
                            className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                        />
                        <button
                            type="submit"
                            disabled={!name.trim() || adding}
                            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 disabled:opacity-50"
                        >
                            {adding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={16} />}
                            {t('categories.add')}
                        </button>
                    </div>
                    <div className="mt-2.5">
                        <ColorPicker value={color} onChange={setColor} />
                    </div>
                </form>

                {error && <p role="alert" className="border-b border-red-100 bg-red-50 px-5 py-2 text-sm text-red-700">{error}</p>}

                <ul className="flex-1 space-y-2 overflow-y-auto bg-slate-50/60 px-5 py-4">
                    {categories.length === 0 && <li className="py-6 text-center text-sm text-slate-500">{t('categories.empty')}</li>}
                    {categories.map((c) => (
                        <Row key={c.id} category={c} onError={setError} />
                    ))}
                </ul>
            </div>
        </div>
    );
}
