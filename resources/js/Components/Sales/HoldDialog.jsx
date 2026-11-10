import { useState } from 'react';
import { PauseCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Asks for an optional label ("monsieur au pull bleu") before putting the cart aside. Enter confirms. */
export default function HoldDialog({ busy, onConfirm, onCancel }) {
    const { t } = useTranslation();
    const [label, setLabel] = useState('');

    const submit = (e) => {
        e.preventDefault();
        onConfirm(label.trim());
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={onCancel}>
            <form
                onSubmit={submit}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.key === 'Escape' && onCancel()}
                className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-800"
            >
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                    <PauseCircle size={18} className="text-indigo-500" /> {t('hold.title')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('hold.hint')}</p>
                <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    maxLength={60}
                    placeholder={t('hold.labelPlaceholder')}
                    autoFocus
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700"
                />
                <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200">
                        {t('common.cancel', { defaultValue: 'Annuler' })}
                    </button>
                    <button type="submit" disabled={busy} className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                        {t('hold.confirm')}
                    </button>
                </div>
            </form>
        </div>
    );
}
