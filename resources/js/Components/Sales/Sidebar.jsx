import { Link, usePage } from '@inertiajs/react';
import { ShoppingCart, Package, BarChart3, Users, Settings } from 'lucide-react';

const navItems = [
    { icon: ShoppingCart, label: 'Ventes', href: '/' },
    { icon: Package, label: 'Produits', href: '/produits' },
    { icon: BarChart3, label: 'Rapports', href: '/rapports' },
    { icon: Users, label: 'Clients', href: '/clients' },
    { icon: Settings, label: 'Paramètres', href: '/parametres' },
];

export default function Sidebar() {
    const { url } = usePage();

    return (
        <aside className="pointer-events-none fixed inset-y-0 left-0 z-20 flex items-center pl-4">
            <div className="pointer-events-auto flex flex-col items-center gap-1.5 rounded-2xl border border-white/60 bg-white/70 p-2 shadow-[0_10px_40px_-12px_rgba(30,27,75,0.25)] backdrop-blur-xl">
                {navItems.map(({ icon: Icon, label, href }) => {
                    const active = url === href || (href === '/' && url === '/');
                    return (
                        <div key={label} className="group relative">
                            <Link
                                href={href}
                                className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:scale-110 ${
                                    active
                                        ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30'
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <Icon size={20} strokeWidth={2} />
                            </Link>
                            {/* Dock tooltip */}
                            <span className="pointer-events-none absolute left-full top-1/2 z-30 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                                {label}
                            </span>
                            {/* Active indicator dot */}
                            {active && (
                                <span className="absolute -right-2.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                            )}
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}
