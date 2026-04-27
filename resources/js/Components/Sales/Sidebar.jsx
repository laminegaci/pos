import { Link, usePage, useForm } from '@inertiajs/react';
import { Box, LogOut, Receipt, ScanLine, BarChart3, Settings, ShoppingBag, Users } from 'lucide-react';

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
                className={`fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-28 flex-col items-center justify-between border-r border-slate-200/70 bg-gradient-to-b from-gray-100 via-violet-200 to-gray-100 py-30 shadow-[4px_0_24px_-12px_rgba(30,27,75,0.12)] transition-transform duration-200 lg:static lg:translate-x-0 ${
                    mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}
            >
                {/* Traffic lights */}
                <div className="flex w-full items-center justify-start gap-1.5 pl-8">
                    <span className="h-3 w-3 rounded-full bg-[#ff5f57] shadow-inner" />
                    <span className="h-3 w-3 rounded-full bg-[#febc2e] shadow-inner" />
                    <span className="h-3 w-3 rounded-full bg-[#28c840] shadow-inner" />
                </div>

                {/* Primary nav */}
                <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg bg-neutral-50/40 p-3 shadow-xl">
                    {navItems.map(({ icon: Icon, label, href, badge }) => {
                        const active = url === href || (href === '/' && url === '/');
                        return (
                            <div key={label} className="group relative">
                                <Link
                                    href={href}
                                    onClick={onClose}
                                    className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 ease-out ${
                                        active
                                            ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/40'
                                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                    }`}
                                >
                                    <Icon size={20} strokeWidth={2} />
                                    {active && badge && (
                                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-white ring-2 ring-indigo-500" />
                                    )}
                                </Link>
                                <span className="pointer-events-none absolute left-full top-1/2 z-30 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                                    {label}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Footer: divider + logout + avatar */}
                <div className="flex w-full flex-col items-center gap-3">
                    <div className="h-px w-8 bg-slate-200" />
                    <button
                        type="button"
                        title="Déconnexion"
                        onClick={logout}
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                        <LogOut size={20} />
                    </button>
                    <Link href="/profile" title="Mon profil" onClick={onClose}>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white shadow-sm">
                            {auth?.user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    </Link>
                </div>
            </aside>
        </>
    );
}
