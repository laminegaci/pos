import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * The sale would put the customer over their credit limit: a manager types their credentials
 * (same flow as cancellations and returns), then the till resubmits the sale.
 */
export default function CreditLimitModal({ message, error, busy, onConfirm, onCancel }) {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const submit = (e) => {
        e.preventDefault();
        onConfirm({ approver_email: email, approver_password: password });
    };

    const cls = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
            <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-800">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                    <ShieldCheck size={18} className="text-amber-500" /> {t('cart.account.approvalTitle')}
                </h2>
                <p className="text-sm text-amber-700 dark:text-amber-300">{message}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('returns.approvalHint')}</p>
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-500">{t('returns.managerEmail')}</span>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={cls} autoFocus required />
                </label>
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-500">{t('returns.managerPassword')}</span>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={cls} required />
                </label>
                {error && <p className="text-xs font-medium text-red-600">{error}</p>}
                <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200">
                        {t('common.cancel', { defaultValue: 'Annuler' })}
                    </button>
                    <button type="submit" disabled={busy} className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                        {t('cart.account.approve')}
                    </button>
                </div>
            </form>
        </div>
    );
}
