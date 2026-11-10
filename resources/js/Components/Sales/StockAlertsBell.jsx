import { Link, usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Bell with the real number of low-stock products and a short list (shared prop `stockAlerts`). */
export default function StockAlertsBell() {
    const { t } = useTranslation();
    const { stockAlerts } = usePage().props;
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
        const onKey = (e) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const count = stockAlerts?.count ?? 0;

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-label={t('stockAlerts.title')}
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
                <Bell size={19} />
                {count > 0 && (
                    <span className="absolute right-1.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white shadow-sm">
                        {count > 99 ? '99+' : count}
                    </span>
                )}
            </button>
            {open && (
                <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{t('stockAlerts.title')}</div>
                    {count === 0 ? (
                        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{t('stockAlerts.none')}</p>
                    ) : (
                        <ul className="space-y-1.5">
                            {stockAlerts.items.map((p) => (
                                <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-xs dark:bg-slate-800">
                                    <span className="truncate font-medium text-slate-800 dark:text-slate-100">{p.name}</span>
                                    <span
                                        className={`shrink-0 rounded-full px-2 py-0.5 font-bold ${
                                            p.stock <= 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                        }`}
                                    >
                                        {p.stock} / {p.min}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {count > 0 && (
                        <Link
                            href="/produits?stock=faible"
                            onClick={() => setOpen(false)}
                            className="mt-3 block text-center text-xs font-medium text-indigo-600 hover:underline"
                        >
                            {t('stockAlerts.seeAll', { count })}
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
