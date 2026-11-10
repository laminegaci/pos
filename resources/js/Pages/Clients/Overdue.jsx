import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, BellRing, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PosLayout from '../../Layouts/PosLayout';
import { formatCurrency } from '../../lib/formatCurrency';
import FlashToast, { ghostBtn } from '../../Components/Purchasing/FlashToast';

export default function ClientsOverdue({ rows, totalOverdue }) {
    const { t, i18n } = useTranslation();
    const date = (d) => (d ? new Date(d).toLocaleDateString(i18n.resolvedLanguage) : '—');

    return (
        <>
            <Head title={t('clients.remindersTitle')} />
            <PosLayout>
                <FlashToast />
                <div className="flex flex-1 flex-col overflow-hidden p-4 md:px-8 md:py-6">
                    <Link href="/clients" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
                        <ArrowLeft size={15} /> {t('clients.back')}
                    </Link>

                    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">{t('clients.remindersTitle')}</h1>
                            <p className="text-sm text-slate-500">{t('clients.remindersSubtitle')}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200/60 bg-white px-4 py-3">
                            <div className="text-xs uppercase tracking-wide text-slate-500">{t('clients.totalOverdue')}</div>
                            <div className="text-lg font-bold tabular-nums text-red-600">{formatCurrency(totalOverdue)}</div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                        {rows.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-slate-400">
                                <BellRing size={36} />
                                <p className="text-sm">{t('clients.noOverdue')}</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">{t('sales.client')}</th>
                                        <th className="px-4 py-3">{t('clients.phone')}</th>
                                        <th className="px-4 py-3">{t('clients.oldestDue')}</th>
                                        <th className="px-4 py-3 text-right">{t('clients.daysLate')}</th>
                                        <th className="px-4 py-3 text-right">{t('clients.overdue')}</th>
                                        <th className="px-4 py-3 text-right">{t('clients.balance')}</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {rows.map((r) => (
                                        <tr key={r.id} className="hover:bg-slate-50/60">
                                            <td className="px-4 py-3 font-semibold text-slate-900">
                                                <Link href={`/clients/${r.id}`} className="hover:text-indigo-600">{r.name}</Link>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{r.phone ?? '—'}</td>
                                            <td className="px-4 py-3 text-slate-500">{date(r.oldest_due_at)}</td>
                                            <td className="px-4 py-3 text-right tabular-nums text-red-600">{r.days_late}</td>
                                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-red-600">{formatCurrency(r.overdue)}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(r.balance)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <a href={`/clients/${r.id}/releve?stream=1`} target="_blank" rel="noreferrer" className={ghostBtn}>
                                                    <FileText size={14} /> {t('clients.statement')}
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </PosLayout>
        </>
    );
}
