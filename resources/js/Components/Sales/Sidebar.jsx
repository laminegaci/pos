import { Link, usePage, useForm } from '@inertiajs/react';
import { Box, LogOut, Receipt, ScanLine, BarChart3, Settings, ShoppingBag, Users, X } from 'lucide-react';

const navItems = [
    { icon: ShoppingBag, label: 'Ventes', href: '/', badge: true },
    { icon: Box, label: 'Produits', href: '/produits' },
    { icon: ScanLine, label: 'Scan', href: '/scan' },
    { icon: BarChart3, label: 'Rapports', href: '/rapports' },
    { icon: Users, label: 'Clients', href: '/clients' },
    { icon: Receipt, label: 'Historique', href: '/ventes' },
    { icon: Settings, label: 'Paramètres', href: '/parametres' },
];

export default function Sidebar({ mobileOpen = false, onClose }) {
    const { url } = usePage();
    const { auth } = usePage().props;
    const { post } = useForm();

    const logout = (e) => {
        e.preventDefault();
        post('/logout');
    };

    return (
        <>
            {/* Mobile backdrop */}
            <div
                className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity lg:hidden ${
                    mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
                onClick={onClose}
                aria-hidden="true"
            />

            <aside
                className={`fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-64 flex-col items-center justify-between border-r border-slate-200/70 bg-gradient-to-b from-gray-100 via-violet-200 to-gray-100 py-6 shadow-[4px_0_24px_-12px_rgba(30,27,75,0.12)] transition-transform duration-200 lg:static lg:w-28 lg:translate-x-0 lg:py-12 ${
                    mobileOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                aria-label="Navigation principale"
            >
                {/* Header: traffic lights (desktop) / close button (mobile) */}
                <div className="flex w-full items-center justify-between px-5 lg:justify-start lg:pl-8 lg:pr-0">
                    <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-[#ff5f57] shadow-inner" />
                        <span className="h-3 w-3 rounded-full bg-[#febc2e] shadow-inner" />
                        <span className="h-3 w-3 rounded-full bg-[#28c840] shadow-inner" />
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-white/60 lg:hidden"
                        aria-label="Fermer le menu"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Primary nav */}
                <nav className="flex w-full flex-1 flex-col items-stretch gap-1 px-4 py-6 lg:w-auto lg:flex-none lg:items-center lg:justify-center lg:gap-3 lg:rounded-lg lg:bg-neutral-50/40 lg:p-3 lg:shadow-xl">
                    {navItems.map(({ icon: Icon, label, href, badge }) => {
                        const active = url === href || (href === '/' && url === '/');
                        return (
                            <div key={label} className="group relative">
                                <Link
                                    href={href}
                                    onClick={onClose}
                                    className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out lg:h-11 lg:w-11 lg:justify-center lg:gap-0 lg:px-0 lg:py-0 ${
                                        active
                                            ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/40'
                                            : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 lg:text-slate-500 lg:hover:bg-slate-100'
                                    }`}
                                >
                                    <Icon size={20} strokeWidth={2} className="shrink-0" />
                                    <span className="lg:hidden">{label}</span>
                                    {active && badge && (
                                        <span className="absolute -right-0.5 -top-0.5 hidden h-2.5 w-2.5 rounded-full bg-white ring-2 ring-indigo-500 lg:block" />
                                    )}
                                </Link>
                                <span className="pointer-events-none absolute left-full top-1/2 z-30 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 lg:block">
                                    {label}
                                </span>
                            </div>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="flex w-full flex-col items-center gap-3 px-4 lg:px-0">
                    <div className="hidden h-px w-8 bg-slate-200 lg:block" />
                    <div className="flex w-full items-center justify-between gap-2 lg:w-auto lg:flex-col lg:gap-3">
                        <Link
                            href="/profile"
                            title="Mon profil"
                            onClick={onClose}
                            className="flex items-center gap-3 lg:order-2"
                        >
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white shadow-sm">
                                {auth?.user?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span className="text-sm font-medium text-slate-700 lg:hidden">
                                {auth?.user?.name || 'Utilisateur'}
                            </span>
                        </Link>
                        <button
                            type="button"
                            title="Déconnexion"
                            onClick={logout}
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/70 hover:text-slate-900 lg:order-1 lg:h-11 lg:w-11 lg:hover:bg-slate-100"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
