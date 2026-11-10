import { AlertTriangle, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../lib/formatCurrency';

/**
 * Shown under the payment methods when the sale goes on the customer account:
 * balance and limit of the customer, an optional deposit, and what is left on the account.
 */
export default function CreditAccountPanel({ client, payable, deposit, onDepositChange, methods }) {
    const { t } = useTranslation();
    if (!client) return null;

    const depositMethods = methods.filter((m) => m !== 'credit');
    const amount = Math.min(Math.max(parseFloat(deposit.amount) || 0, 0), payable);
    const onAccount = Math.round((payable - amount) * 100) / 100;
    const hasLimit = client.credit_limit !== null && client.credit_limit !== undefined;
    const available = hasLimit ? client.credit_limit - client.balance : null;
    const overLimit = hasLimit && onAccount > 0 && client.balance + onAccount > client.credit_limit + 0.005;

    return (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/60">
            <div className="mb-2 flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                <Wallet size={14} /> {t('cart.account.title')}
            </div>
            <dl className="space-y-1 text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                    <dt>{t('cart.account.balance')}</dt>
                    <dd className={`tabular-nums ${client.overdue > 0 ? 'font-semibold text-red-600 dark:text-red-400' : ''}`}>{formatCurrency(client.balance)}</dd>
                </div>
                <div className="flex justify-between">
                    <dt>{t('cart.account.limit')}</dt>
                    <dd className="tabular-nums">{hasLimit ? formatCurrency(client.credit_limit) : t('cart.account.noLimit')}</dd>
                </div>
                {available !== null && (
                    <div className="flex justify-between">
                        <dt>{t('cart.account.available')}</dt>
                        <dd className="tabular-nums">{formatCurrency(Math.max(0, available))}</dd>
                    </div>
                )}
            </dl>

            <div className="mt-3 flex items-center gap-2">
                <label className="flex-1">
                    <span className="mb-1 block font-medium text-slate-500 dark:text-slate-400">{t('cart.account.deposit')}</span>
                    <input
                        type="number"
                        min="0"
                        max={payable}
                        step="0.01"
                        value={deposit.amount}
                        onChange={(e) => onDepositChange({ ...deposit, amount: e.target.value })}
                        placeholder="0"
                        className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-right text-sm tabular-nums outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700"
                    />
                </label>
                {amount > 0 && depositMethods.length > 1 && (
                    <div className="flex rounded-lg bg-slate-200 p-0.5 dark:bg-slate-700">
                        {depositMethods.map((m) => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => onDepositChange({ ...deposit, method: m })}
                                aria-pressed={deposit.method === m}
                                className={`h-7 rounded-md px-2 font-semibold ${deposit.method === m ? 'bg-white shadow-sm dark:bg-slate-500' : 'text-slate-500'}`}
                            >
                                {t(`payment.${m}`)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-2 flex justify-between font-semibold text-slate-800 dark:text-slate-100">
                <span>{t('cart.account.onAccount')}</span>
                <span className="tabular-nums">{formatCurrency(onAccount)}</span>
            </div>

            {overLimit && (
                <p className="mt-2 flex items-start gap-1.5 font-medium text-amber-700 dark:text-amber-300">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {t('cart.account.overLimit')}
                </p>
            )}
        </div>
    );
}
