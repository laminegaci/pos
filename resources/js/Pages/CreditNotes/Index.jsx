import { Head, Link, router } from '@inertiajs/react';
import { Printer, ReceiptText, Search, Wallet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PosLayout from '../../Layouts/PosLayout';
import { formatCurrency } from '../../lib/formatCurrency';
import usePrintDocument from '../../lib/printDocument';

export default function CreditNotesIndex({ notes, filters, totals }) {
    const { t, i18n } = useTranslation();
    const { print, printing } = usePrintDocument();
    const [search, setSearch] = useState(filters.search || '');
    const first = useRef(true);

    // Debounced server-side search; the status tab is kept.
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const timer = setTimeout(() => {
            router.get('/avoirs', { search: search || undefined, status: filters.status === 'open' ? 'open' : undefined }, { preserveState: true, preserveScroll: true, replace: true });
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const setStatus = (status) =>
        router.get('/avoirs', { search: search || undefined, status: status === 'open' ? 'open' : undefined }, { preserveState: true, preserveScroll: true });

    const fmtDate = (iso) => new Date(iso).toLocaleDateString(i18n.resolvedLanguage || 'fr', { day: '2-digit', month: '2-digit', year: 'numeric' });

    return (
        <PosLayout>
            <Head title={t('creditNotes.title')} />
            <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-slate-200/60 bg-white/60 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-900/60">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('creditNotes.title')}</h1>
                        <p className="text-sm text-slate-500">{t('creditNotes.subtitle')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white px-4 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
                                <Wallet size={17} />
                            </span>
                            <div>
                                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{t('creditNotes.outstanding')}</div>
                                <div className="text-base font-bold tabular-nums text-slate-900 dark:text-slate-100">
                                    {formatCurrency(totals.outstanding)}
                                    <span className="ml-2 text-xs font-medium text-slate-400">{t('creditNotes.openCount', { count: totals.open })}</span>
                                </div>
                            </div>
                        </div>
                        <Link href="/ventes" className="text-sm text-slate-600 hover:text-indigo-600 dark:text-slate-400">
                            ← {t('sales.history')}
                        </Link>
                    </div>
                </div>

                <div className="flex flex-col gap-3 border-b border-slate-200/60 bg-white/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-slate-800">
                    <div className="relative w-full max-w-sm">
                        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('creditNotes.searchPlaceholder')}
                            className="h-10 w-full rounded-full border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                    </div>
                    <div className="flex gap-2" role="tablist">
                        {['all', 'open'].map((s) => {
                            const on = (filters.status || 'all') === s;
                            return (
                                <button
                                    key={s}
                                    type="button"
                                    role="tab"
                                    aria-selected={on}
                                    onClick={() => setStatus(s)}
                                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                        on ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
                                    }`}
                                >
                                    {t(`creditNotes.filter.${s}`)}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-4 sm:p-6">
                    {notes.data.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/50 py-16 text-center dark:border-slate-700 dark:bg-slate-900/40">
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                                <ReceiptText size={24} />
                            </span>
                            <div className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('creditNotes.empty')}</div>
                            <div className="max-w-xs text-xs text-slate-400">{t('creditNotes.emptyHint')}</div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-slate-200/60 bg-white/60 dark:border-slate-800 dark:bg-slate-900/60">
                            <table className="w-full min-w-[560px]">
                                <thead className="border-b border-slate-200/60 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40">
                                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        <th className="px-4 py-3">{t('creditNotes.code')}</th>
                                        <th className="px-4 py-3">{t('sales.client')}</th>
                                        <th className="px-4 py-3">{t('sales.date')}</th>
                                        <th className="px-4 py-3 text-right">{t('creditNotes.amount')}</th>
                                        <th className="px-4 py-3 text-right">{t('creditNotes.balance')}</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800">
                                    {notes.data.map((n) => (
                                        <tr key={n.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                            <td className="px-4 py-3 font-mono text-sm font-semibold text-indigo-700 dark:text-indigo-300">{n.code}</td>
                                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{n.client || '—'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-500">{fmtDate(n.created_at)}</td>
                                            <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-600 dark:text-slate-300">{formatCurrency(n.amount)}</td>
                                            <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums">
                                                {n.balance > 0 ? (
                                                    <span className="text-emerald-600">{formatCurrency(n.balance)}</span>
                                                ) : (
                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800">{t('creditNotes.used')}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    disabled={printing}
                                                    onClick={() => print(`/avoirs/${n.id}/ticket`)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300"
                                                >
                                                    <Printer size={13} /> {t('creditNotes.print')}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {notes.last_page > 1 && (
                        <div className="mt-4 flex items-center justify-center gap-2">
                            {notes.prev_page_url && (
                                <Link href={notes.prev_page_url} preserveScroll className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700">
                                    {t('common.previous')}
                                </Link>
                            )}
                            <span className="text-sm text-slate-600 dark:text-slate-300">
                                {t('common.page')} {notes.current_page} {t('common.of')} {notes.last_page}
                            </span>
                            {notes.next_page_url && (
                                <Link href={notes.next_page_url} preserveScroll className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700">
                                    {t('common.next')}
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </PosLayout>
    );
}
