import { useEffect, useState } from 'react';
import { Loader2, PauseCircle, Play, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../lib/formatCurrency';

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content;

/** Today's held tickets, shared between tills. */
export default function HeldCartsDrawer({ onResume, onClose, onChanged }) {
    const { t, i18n } = useTranslation();
    const [carts, setCarts] = useState(null);
    const [error, setError] = useState(null);

    const load = async () => {
        try {
            const res = await fetch('/ventes/attente', { headers: { Accept: 'application/json' } });
            if (!res.ok) throw new Error(String(res.status));
            setCarts((await res.json()).carts);
            setError(null);
        } catch {
            setError(t('hold.loadError'));
            setCarts([]);
        }
    };

    useEffect(() => {
        load();
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const remove = async (id) => {
        if (!window.confirm(t('hold.confirmDelete'))) return;
        await fetch(`/ventes/attente/${id}`, {
            method: 'DELETE',
            headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf() },
        });
        setCarts((cs) => cs.filter((c) => c.id !== id));
        onChanged?.();
    };

    const time = (iso) => new Date(iso).toLocaleTimeString(i18n.resolvedLanguage, { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl dark:bg-slate-800">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-700">
                    <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                        <PauseCircle size={18} className="text-indigo-500" /> {t('hold.listTitle')}
                    </h2>
                    <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label={t('common.close')}>
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                    {carts === null ? (
                        <div className="flex justify-center p-8 text-slate-400"><Loader2 className="animate-spin" /></div>
                    ) : carts.length === 0 ? (
                        <p className="p-8 text-center text-sm text-slate-400">{error ?? t('hold.empty')}</p>
                    ) : (
                        <ul className="space-y-2">
                            {carts.map((c) => (
                                <li key={c.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                            {c.label || c.client || t('hold.noLabel', { id: c.id })}
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                            {time(c.created_at)} · {c.user} · {t('cart.itemsCount', { count: c.items_count })}
                                            {c.label && c.client ? ` · ${c.client}` : ''}
                                        </div>
                                    </div>
                                    <div className="text-sm font-bold tabular-nums text-indigo-600 dark:text-indigo-300">{formatCurrency(c.total)}</div>
                                    <button
                                        type="button"
                                        onClick={() => onResume(c.id)}
                                        className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 px-3 py-1.5 text-xs font-semibold text-white"
                                    >
                                        <Play size={13} /> {t('hold.resume')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => remove(c.id)}
                                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                        aria-label={t('hold.delete')}
                                        title={t('hold.delete')}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
