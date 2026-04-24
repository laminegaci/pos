import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { Eye, X } from 'lucide-react';
import PosLayout from '../../Layouts/PosLayout';

export default function SalesList({ sales }) {
    const [selectedSale, setSelectedSale] = useState(null);

    const openDetail = (sale) => {
        window.location.href = `/ventes/${sale.id}`;
    };

    return (
        <PosLayout>
            <Head title="Historique des ventes" />
            <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/60 px-6 py-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Historique des ventes</h1>
                        <p className="text-sm text-slate-500">{sales.total} vente(s)</p>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-6">
                    <div className="rounded-2xl border border-slate-200/60 bg-white/60">
                        <table className="w-full">
                            <thead className="border-b border-slate-200/60 bg-slate-50/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">#</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Client</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Caissier</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Montant</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Statut</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/40">
                                {sales.data.map((sale) => (
                                    <tr key={sale.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3 text-sm font-medium text-slate-900">#{sale.id}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {new Date(sale.created_at).toLocaleString('fr-FR', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-900">{sale.client || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{sale.user}</td>
                                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                                            {sale.total.toLocaleString('fr-FR', { style: 'currency', currency: 'DZD' })}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                                {sale.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => openDetail(sale)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
                                            >
                                                <Eye size={14} />
                                                Voir
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {sales.data.length === 0 && (
                            <div className="py-12 text-center text-slate-500">
                                Aucune vente trouvée
                            </div>
                        )}
                    </div>

                    {sales.last_page > 1 && (
                        <div className="mt-4 flex items-center justify-center gap-2">
                            {sales.prev_page_url && (
                                <a href={sales.prev_page_url} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">
                                    Précédent
                                </a>
                            )}
                            <span className="text-sm text-slate-600">
                                Page {sales.current_page} sur {sales.last_page}
                            </span>
                            {sales.next_page_url && (
                                <a href={sales.next_page_url} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">
                                    Suivant
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {selectedSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">Vente #{selectedSale.id}</h2>
                            <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-500">Date</p>
                                <p className="text-sm text-slate-900">
                                    {new Date(selectedSale.created_at).toLocaleString('fr-FR')}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Client</p>
                                <p className="text-sm text-slate-900">{selectedSale.client || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Caissier</p>
                                <p className="text-sm text-slate-900">{selectedSale.user}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Montant</p>
                                <p className="text-lg font-bold text-slate-900">
                                    {selectedSale.total.toLocaleString('fr-FR', { style: 'currency', currency: 'DZD' })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </PosLayout>
    );
}