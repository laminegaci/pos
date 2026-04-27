import { Head } from '@inertiajs/react';
import { useMemo } from 'react';
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    Package,
    Receipt,
    ShoppingBag,
    TrendingUp,
    Users,
    Wallet,
} from 'lucide-react';
import PosLayout from '../../Layouts/PosLayout';
import { formatCurrency } from '../../lib/formatCurrency';

const CATEGORY_LABELS = {
    bureaux: 'Bureaux',
    rangement_bureau: 'Rangement',
    bureaux_direction: 'Bureaux Direction',
    bureaux_compacts: 'Bureaux Compacts',
    bureaux_ergonomiques: 'Bureaux Ergonomiques',
    bureaux_gaming: 'Bureaux Gaming',
    mobilier_professionnel: 'Mobilier Pro',
};

const CATEGORY_COLORS = {
    bureaux: '#6366f1',
    rangement_bureau: '#06b6d4',
    bureaux_direction: '#f59e0b',
    bureaux_compacts: '#10b981',
    bureaux_ergonomiques: '#ec4899',
    bureaux_gaming: '#8b5cf6',
    mobilier_professionnel: '#f97316',
    bureaux_partages: '#14b8a6',
};

function KpiCard({ icon: Icon, label, value, tone = 'indigo', delta, hint }) {
    const tones = {
        indigo: 'from-indigo-500 to-violet-500',
        emerald: 'from-emerald-500 to-teal-500',
        amber: 'from-amber-500 to-orange-500',
        sky: 'from-sky-500 to-cyan-500',
        rose: 'from-rose-500 to-pink-500',
    };
    return (
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-start justify-between">
                <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tones[tone]} text-white shadow-sm`}
                >
                    <Icon size={18} />
                </div>
                {delta !== undefined && delta !== null && (
                    <span
                        className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            delta >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}
                    >
                        {delta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {Math.abs(delta).toFixed(1)}%
                    </span>
                )}
            </div>
            <div className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
            {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
        </div>
    );
}

function LineChart({ data }) {
    const width = 720;
    const height = 220;
    const padding = { top: 20, right: 20, bottom: 28, left: 48 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    const max = Math.max(1, ...data.map((d) => d.total));
    const step = innerW / Math.max(1, data.length - 1);

    const points = data.map((d, i) => {
        const x = padding.left + i * step;
        const y = padding.top + innerH - (d.total / max) * innerH;
        return { x, y, d };
    });

    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const area = `${path} L${points.at(-1)?.x ?? padding.left},${padding.top + innerH} L${padding.left},${padding.top + innerH} Z`;

    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => padding.top + innerH * (1 - t));

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
            <defs>
                <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
            </defs>
            {gridLines.map((y, i) => (
                <line key={i} x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
            ))}
            {[0, 0.5, 1].map((t, i) => (
                <text key={i} x={padding.left - 6} y={padding.top + innerH * (1 - t) + 4} textAnchor="end" className="fill-slate-400 text-[10px]">
                    {formatCurrency(max * t).replace(',00 DA', ' DA')}
                </text>
            ))}
            <path d={area} fill="url(#areaFill)" />
            <path d={path} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p, i) => (
                <g key={i}>
                    {i % 5 === 0 && (
                        <text x={p.x} y={height - 8} textAnchor="middle" className="fill-slate-400 text-[10px]">
                            {p.d.label}
                        </text>
                    )}
                    <circle cx={p.x} cy={p.y} r="3" fill="#6366f1" className="opacity-0 transition-opacity hover:opacity-100">
                        <title>{`${p.d.label} — ${formatCurrency(p.d.total)}`}</title>
                    </circle>
                </g>
            ))}
        </svg>
    );
}

function Donut({ slices }) {
    const size = 180;
    const radius = 70;
    const stroke = 24;
    const cx = size / 2;
    const cy = size / 2;
    const total = slices.reduce((a, s) => a + s.revenue, 0);

    if (total === 0) {
        return (
            <div className="flex h-[180px] items-center justify-center text-sm text-slate-400">Aucune donnée</div>
        );
    }

    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return (
        <svg viewBox={`0 0 ${size} ${size}`} className="h-44 w-44">
            <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
            {slices.map((s, i) => {
                const frac = s.revenue / total;
                const length = frac * circumference;
                const color = CATEGORY_COLORS[s.category_id] ?? '#94a3b8';
                const el = (
                    <circle
                        key={i}
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={stroke}
                        strokeDasharray={`${length} ${circumference - length}`}
                        strokeDashoffset={-offset}
                        transform={`rotate(-90 ${cx} ${cy})`}
                        strokeLinecap="butt"
                    />
                );
                offset += length;
                return el;
            })}
            <text x={cx} y={cy - 4} textAnchor="middle" className="fill-slate-500 text-[10px]">
                Total 30j
            </text>
            <text x={cx} y={cy + 14} textAnchor="middle" className="fill-slate-900 text-sm font-bold">
                {formatCurrency(total).replace(',00 DA', ' DA')}
            </text>
        </svg>
    );
}

function formatDateTime(iso) {
    if (!iso) return '—';
    try {
        return new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(iso));
    } catch {
        return '—';
    }
}

export default function ReportsIndex({ kpis, daily, topProducts, byCategory, topClients, recentSales, lowStock }) {
    const topProductMax = useMemo(() => Math.max(1, ...topProducts.map((p) => p.revenue)), [topProducts]);

    return (
        <PosLayout>
            <Head title="Rapports" />
            <div className="flex flex-1 flex-col overflow-auto p-4 md:p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Rapports</h1>
                    <p className="text-sm text-slate-500">Vue d'ensemble de l'activité — 30 derniers jours.</p>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <KpiCard
                        icon={Wallet}
                        label="CA ce mois"
                        value={formatCurrency(kpis.revenueMonth)}
                        tone="indigo"
                        delta={kpis.revenueGrowth}
                        hint={`Aujourd'hui : ${formatCurrency(kpis.revenueToday)}`}
                    />
                    <KpiCard
                        icon={Receipt}
                        label="Ventes ce mois"
                        value={kpis.salesCountMonth}
                        tone="emerald"
                        hint={`Aujourd'hui : ${kpis.salesCountToday}`}
                    />
                    <KpiCard
                        icon={TrendingUp}
                        label="Panier moyen"
                        value={formatCurrency(kpis.avgBasket)}
                        tone="amber"
                    />
                    <KpiCard
                        icon={Users}
                        label="Clients"
                        value={kpis.clientsCount}
                        tone="sky"
                        hint={`${kpis.productsCount} produits actifs`}
                    />
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="text-sm font-semibold text-slate-900">Évolution du chiffre d'affaires</h2>
                            <span className="text-xs text-slate-400">30 derniers jours</span>
                        </div>
                        <LineChart data={daily} />
                    </div>
                    <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                        <h2 className="mb-3 text-sm font-semibold text-slate-900">Par catégorie</h2>
                        <div className="flex items-center justify-center">
                            <Donut slices={byCategory} />
                        </div>
                        <div className="mt-3 space-y-1.5">
                            {byCategory.map((s) => (
                                <div key={s.category_id} className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-2 text-slate-600">
                                        <span
                                            className="h-2.5 w-2.5 rounded-full"
                                            style={{ backgroundColor: CATEGORY_COLORS[s.category_id] ?? '#94a3b8' }}
                                        />
                                        {CATEGORY_LABELS[s.category_id] ?? s.category_id}
                                    </span>
                                    <span className="font-semibold tabular-nums text-slate-700">
                                        {formatCurrency(s.revenue).replace(',00 DA', ' DA')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <Package size={16} className="text-indigo-500" /> Top produits (30j)
                        </h2>
                        <div className="space-y-3">
                            {topProducts.length === 0 && <div className="text-sm text-slate-400">Aucune vente enregistrée.</div>}
                            {topProducts.map((p) => (
                                <div key={p.id}>
                                    <div className="mb-1 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="h-2 w-2 rounded-full"
                                                style={{ backgroundColor: CATEGORY_COLORS[p.category_id] ?? '#94a3b8' }}
                                            />
                                            <span className="truncate font-medium text-slate-700">{p.name}</span>
                                            <span className="text-slate-400 hidden sm:inline">· {p.qty} vendus</span>
                                        </div>
                                        <span className="font-semibold tabular-nums text-slate-900">
                                            {formatCurrency(p.revenue)}
                                        </span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${(p.revenue / topProductMax) * 100}%`,
                                                backgroundColor: CATEGORY_COLORS[p.category_id] ?? '#6366f1',
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <Users size={16} className="text-indigo-500" /> Top clients
                        </h2>
                        <div className="space-y-3">
                            {topClients.length === 0 && <div className="text-sm text-slate-400">Aucun client facturé.</div>}
                            {topClients.map((c, i) => (
                                <div key={c.id} className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="truncate text-sm font-medium text-slate-800">{c.name}</div>
                                        <div className="text-xs text-slate-400">{c.count} ventes</div>
                                    </div>
                                    <div className="text-sm font-semibold tabular-nums text-indigo-600">
                                        {formatCurrency(c.revenue).replace(',00 DA', ' DA')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <ShoppingBag size={16} className="text-indigo-500" /> Ventes récentes
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[500px] text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        <th className="pb-2">#</th>
                                        <th className="pb-2">Date</th>
                                        <th className="pb-2">Client</th>
                                        <th className="pb-2 hidden md:table-cell">Caissier</th>
                                        <th className="pb-2 text-right">Total</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {recentSales.map((s) => (
                                        <tr key={s.id}>
                                            <td className="py-2 font-mono text-xs text-slate-400">#{s.id}</td>
                                            <td className="py-2 text-xs text-slate-600">{formatDateTime(s.created_at)}</td>
                                            <td className="py-2 text-sm text-slate-800">{s.client ?? <span className="italic text-slate-400">Anonyme</span>}</td>
                                            <td className="py-2 hidden md:table-cell text-xs text-slate-500">{s.user ?? '—'}</td>
                                            <td className="py-2 text-right font-semibold tabular-nums text-slate-900">
                                                {formatCurrency(s.total)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <AlertTriangle size={16} className="text-amber-500" /> Alertes stock
                        </h2>
                        <div className="space-y-2">
                            {lowStock.length === 0 && (
                                <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                                    Aucun produit en stock bas.
                                </div>
                            )}
                            {lowStock.map((p) => (
                                <div key={p.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium text-slate-800">{p.name}</div>
                                        <div className="text-[11px] text-slate-400">
                                            {CATEGORY_LABELS[p.category_id] ?? p.category_id}
                                        </div>
                                    </div>
                                    <span
                                        className={`ml-2 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                                            p.stock === 0
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-amber-100 text-amber-700'
                                        }`}
                                    >
                                        {p.stock}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </PosLayout>
    );
}
