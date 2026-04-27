import { Head } from '@inertiajs/react';
import PosLayout from '../../Layouts/PosLayout';

export default function SalesShow({ sale, items }) {
    return (
        <PosLayout>
            <Head title={`Vente #${sale.id}`} />
            <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-slate-200/60 bg-white/60 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <a href="/ventes" className="shrink-0 text-sm text-slate-600 hover:text-indigo-600">
                            ← Retour
                        </a>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-lg font-bold text-slate-900 sm:text-xl">Vente #{sale.id}</h1>
                                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                    {sale.status}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 sm:text-sm">
                                {new Date(sale.created_at).toLocaleString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <a
                            href={`/ventes/${sale.id}/facture?stream=1`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-600 sm:flex-none"
                        >
                            Aperçu
                        </a>
                        <a
                            href={`/ventes/${sale.id}/facture`}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 sm:flex-none"
                        >
                            Télécharger PDF
                        </a>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-4 sm:p-6">
                    <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-4 sm:p-6 lg:col-span-2">
                            <h2 className="mb-4 text-base font-semibold text-slate-900 sm:text-lg">Articles</h2>

                            <div className="hidden overflow-x-auto rounded-xl border border-slate-200 sm:block">
                                <table className="w-full min-w-[480px]">
                                    <thead className="border-b border-slate-200 bg-slate-50/50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-500">Article</th>
                                            <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-slate-500">Qté</th>
                                            <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-slate-500">Prix</th>
                                            <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-slate-500">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {items.map((item) => (
                                            <tr key={item.id}>
                                                <td className="px-4 py-3 text-sm text-slate-900">{item.product_name}</td>
                                                <td className="px-4 py-3 text-center text-sm text-slate-600">{item.quantity}</td>
                                                <td className="px-4 py-3 text-right text-sm text-slate-600">
                                                    {item.price.toLocaleString('fr-FR', { style: 'currency', currency: 'DZD' })}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                                                    {item.line_total.toLocaleString('fr-FR', { style: 'currency', currency: 'DZD' })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <ul className="space-y-2 sm:hidden">
                                {items.map((item) => (
                                    <li key={item.id} className="rounded-xl border border-slate-200 bg-white/80 p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="text-sm font-medium text-slate-900">{item.product_name}</p>
                                            <p className="shrink-0 text-sm font-semibold text-slate-900">
                                                {item.line_total.toLocaleString('fr-FR', { style: 'currency', currency: 'DZD' })}
                                            </p>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {item.quantity} × {item.price.toLocaleString('fr-FR', { style: 'currency', currency: 'DZD' })}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="space-y-4 sm:space-y-6">
                            <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-4 sm:p-6">
                                <h2 className="mb-4 text-lg font-semibold text-slate-900">Informations</h2>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs text-slate-500">Client</p>
                                        <p className="text-sm font-medium text-slate-900">{sale.client || 'Client occasionnel'}</p>
                                        {sale.client_email && <p className="text-xs text-slate-500">{sale.client_email}</p>}
                                        {sale.client_phone && <p className="text-xs text-slate-500">{sale.client_phone}</p>}
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Caissier</p>
                                        <p className="text-sm font-medium text-slate-900">{sale.user}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-6">
                                <h2 className="mb-4 text-lg font-semibold text-slate-900">Résumé</h2>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Sous-total</span>
                                        <span className="text-slate-900">
                                            {sale.subtotal.toLocaleString('fr-FR', { style: 'currency', currency: 'DZD' })}
                                        </span>
                                    </div>
                                    {sale.remise > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Remise</span>
                                            <span className="text-red-600">
                                                -{sale.remise.toLocaleString('fr-FR', { style: 'currency', currency: 'DZD' })}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-bold">
                                        <span className="text-slate-900">Total</span>
                                        <span className="text-indigo-600">
                                            {sale.total.toLocaleString('fr-FR', { style: 'currency', currency: 'DZD' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PosLayout>
    );
}