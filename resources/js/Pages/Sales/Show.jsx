import { Head } from '@inertiajs/react';
import PosLayout from '../../Layouts/PosLayout';

export default function SalesShow({ sale, items }) {
    return (
        <PosLayout>
            <Head title={`Vente #${sale.id}`} />
            <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/60 px-6 py-4">
                    <div className="flex items-center gap-4">
                        <a href="/ventes" className="text-sm text-slate-600 hover:text-indigo-600">
                            ← Retour
                        </a>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Vente #{sale.id}</h1>
                            <p className="text-sm text-slate-500">
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
                    <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                        {sale.status}
                    </span>
                </div>

                <div className="flex-1 overflow-auto p-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-6 lg:col-span-2">
                            <h2 className="mb-4 text-lg font-semibold text-slate-900">Articles</h2>
                            <div className="rounded-xl border border-slate-200">
                                <table className="w-full">
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
                        </div>

                        <div className="space-y-6">
                            <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-6">
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