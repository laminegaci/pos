import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ArrowRight, Minus, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const REASONS_OUT = ['casse', 'perte', 'vol', 'peremption', 'correction', 'autre'];
const REASONS_IN = ['reception', 'correction', 'autre'];

/** Reasoned manual stock adjustment (breakage, loss, goods received...). */
export default function AdjustStockModal({ product, onClose }) {
    const { t } = useTranslation();
    const [direction, setDirection] = useState('out');
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('casse');
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const reasons = direction === 'in' ? REASONS_IN : REASONS_OUT;

    useEffect(() => {
        if (!reasons.includes(reason)) setReason(reasons[0]);
    }, [direction]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const qty = Math.max(0, parseInt(quantity, 10) || 0);
    const after = product.stock + (direction === 'in' ? qty : -qty);
    const invalid = qty < 1 || after < 0 || (reason === 'autre' && !note.trim());

    const submit = (e) => {
        e.preventDefault();
        setSubmitting(true);
        router.post(
            `/produits/${product.id}/ajustement`,
            { direction, quantity: qty, reason, note },
            {
                preserveScroll: true,
                onSuccess: onClose,
                onError: setErrors,
                onFinish: () => setSubmitting(false),
            },
        );
    };

    const chip = (active) =>
        `rounded-full px-3 py-1.5 text-xs font-medium transition ${
            active
                ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
        }`;

    const inputCls =
        'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={onClose}
        >
            <form
                onSubmit={submit}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
            >
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">{t('products.adjust.title')}</h2>
                        <p className="text-xs text-slate-500">{product.name}</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                        <X size={18} />
                    </button>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setDirection('out')}
                        className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium ring-1 ${
                            direction === 'out' ? 'bg-red-50 text-red-700 ring-red-200' : 'text-slate-500 ring-slate-200'
                        }`}
                    >
                        <Minus size={15} /> {t('products.adjust.out')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setDirection('in')}
                        className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium ring-1 ${
                            direction === 'in' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'text-slate-500 ring-slate-200'
                        }`}
                    >
                        <Plus size={15} /> {t('products.adjust.in')}
                    </button>
                </div>

                <label className="mb-1 block text-xs font-medium text-slate-600">{t('products.adjust.quantity')}</label>
                <input
                    type="number"
                    min="1"
                    autoFocus
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className={`${inputCls} mb-1`}
                />
                {errors.quantity && <p className="mb-1 text-xs text-red-600">{errors.quantity}</p>}
                {errors.stock && <p className="mb-1 text-xs text-red-600">{errors.stock}</p>}
                <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
                    {t('products.stock')} <span className="font-semibold text-slate-700">{product.stock}</span>
                    <ArrowRight size={12} />
                    <span className={`font-semibold ${after < 0 ? 'text-red-600' : 'text-slate-900'}`}>{after}</span>
                </div>

                <label className="mb-1 block text-xs font-medium text-slate-600">{t('products.adjust.reason')}</label>
                <div className="mb-1 flex flex-wrap gap-1.5">
                    {reasons.map((r) => (
                        <button type="button" key={r} onClick={() => setReason(r)} className={chip(r === reason)}>
                            {t(`products.reasons.${r}`)}
                        </button>
                    ))}
                </div>
                {errors.reason && <p className="mb-1 text-xs text-red-600">{errors.reason}</p>}

                <label className="mb-1 mt-3 block text-xs font-medium text-slate-600">
                    {t('products.adjust.note')}
                    {reason === 'autre' && <span className="text-red-500"> *</span>}
                </label>
                <input type="text" maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
                {errors.note && <p className="mt-1 text-xs text-red-600">{errors.note}</p>}

                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                        {t('common.cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={invalid || submitting}
                        className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {t('products.adjust.confirm')}
                    </button>
                </div>
            </form>
        </div>
    );
}
