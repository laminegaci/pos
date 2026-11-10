import { Link, router, usePage } from '@inertiajs/react';
import { Box, Building2, ClipboardList, Truck, Loader2, LogOut, Receipt, ScanLine, BarChart3, Settings, ShoppingBag, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Number of items waiting in the cart (persisted by the Sales page). */
function readCartCount() {
    try {
        const cart = JSON.parse(localStorage.getItem('pos.cart') || 'null');
        return (cart?.items ?? []).reduce((sum, i) => sum + (i.quantity || 0), 0);
    } catch {
        return 0;
    }
}

function useCartCount() {
    const [count, setCount] = useState(readCartCount);
    useEffect(() => {
        const update = () => setCount(readCartCount());
        window.addEventListener('storage', update); // other tabs
        window.addEventListener('pos:cart', update); // this tab (Sales page)
        return () => {
            window.removeEventListener('storage', update);
            window.removeEventListener('pos:cart', update);
        };
    }, []);
    return count;
}

/** "/ventes/12" or "/produits?q=x" still highlight their menu entry; "/" only matches itself. */
function isActive(currentUrl, href) {
    const path = currentUrl.split('?')[0].replace(/\/+$/, '') || '/';
    if (href === '/') return path === '/';
    return path === href || path.startsWith(`${href}/`);
}

export default function Sidebar({ mobileOpen = false, onClose }) {
    const { t } = useTranslation();
    const { url, props } = usePage();
    const { auth } = props;
    const [loggingOut, setLoggingOut] = useState(false);
    const cartCount = useCartCount();

    // Same order as before; a thin separator splits "sell" / "manage" / "system".
    const navItems = [
        { icon: ShoppingBag, label: t('navigation.sales'), href: '/', badge: cartCount },
        { icon: Box, label: t('navigation.products'), href: '/produits' },
        { icon: ScanLine, label: t('navigation.scan'), href: '/scan' },
        { icon: BarChart3, label: t('navigation.reports'), href: '/rapports' },
        { icon: Users, label: t('navigation.clients'), href: '/clients' },
        { icon: Receipt, label: t('navigation.history'), href: '/ventes' },
        { icon: ClipboardList, label: t('navigation.inventory'), href: '/inventaires' },
        { icon: Truck, label: t('navigation.purchases'), href: '/achats' },
        { icon: Building2, label: t('navigation.suppliers'), href: '/fournisseurs', separatorAfter: true },
        { icon: Settings, label: t('navigation.settings'), href: '/parametres' },
    ];

    // Alt+1…9 jumps to a page — handy at the till.
    useEffect(() => {
        const onKey = (e) => {
            if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
            const item = navItems[Number(e.key) - 1];
            if (item) {
                e.preventDefault();
                router.visit(item.href);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    // Escape closes the mobile drawer.
    useEffect(() => {
        if (!mobileOpen) return;
        const onKey = (e) => e.key === 'Escape' && onClose?.();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [mobileOpen, onClose]);

    const logout = (e) => {
        e.preventDefault();
        if (loggingOut) return;
        setLoggingOut(true);
        router.post('/logout', {}, { onFinish: () => setLoggingOut(false) });
    };

    const tooltip =
        'pointer-events-none absolute left-full top-1/2 z-30 ml-3 flex -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-slate-700';

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
                aria-label={t('sidebar.label')}
                className={`fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-28 flex-col items-center justify-between gap-4 border-r border-slate-200/70 bg-gradient-to-b from-gray-100 via-violet-200 to-gray-100 py-4 shadow-[4px_0_24px_-12px_rgba(30,27,75,0.12)] transition-transform duration-200 [@media(min-height:860px)]:py-10 lg:static lg:translate-x-0 dark:border-slate-800 dark:from-slate-900 dark:via-violet-950/60 dark:to-slate-900 ${
                    mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}
            >
                {/* Traffic lights */}
                <div className="flex w-full items-center justify-start gap-1.5 pl-8" aria-hidden="true">
                    <span className="h-3 w-3 rounded-full bg-[#ff5f57] shadow-inner" />
                    <span className="h-3 w-3 rounded-full bg-[#febc2e] shadow-inner" />
                    <span className="h-3 w-3 rounded-full bg-[#28c840] shadow-inner" />
                </div>

                {/* Primary nav */}
                <nav className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-lg bg-neutral-50/40 p-3 shadow-xl dark:bg-slate-800/40">
                    {navItems.map(({ icon: Icon, label, href, badge, separatorAfter }, index) => {
                        const active = isActive(url, href);
                        return (
                            <div key={href} className="contents">
                                <div className="group relative">
                                    {/* Active marker on the rail edge */}
                                    <span
                                        aria-hidden="true"
                                        className={`absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-indigo-500 to-violet-500 transition-all duration-200 ${
                                            active ? 'opacity-100' : 'h-0 opacity-0'
                                        }`}
                                    />
                                    <Link
                                        href={href}
                                        onClick={onClose}
                                        aria-label={label}
                                        aria-current={active ? 'page' : undefined}
                                        className={`relative flex h-11 w-11 items-center justify-center rounded-xl outline-none transition-all duration-200 ease-out focus-visible:ring-4 focus-visible:ring-indigo-300/60 ${
                                            active
                                                ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/40'
                                                : 'text-slate-500 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900 hover:shadow-md dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100'
                                        }`}
                                    >
                                        <Icon size={20} strokeWidth={2} />
                                        {badge > 0 && (
                                            <span
                                                className={`absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ring-2 ${
                                                    active
                                                        ? 'bg-white text-indigo-600 ring-indigo-500'
                                                        : 'bg-indigo-500 text-white ring-white dark:ring-slate-800'
                                                }`}
                                            >
                                                {badge > 99 ? '99+' : badge}
                                            </span>
                                        )}
                                    </Link>
                                    <span role="tooltip" className={tooltip}>
                                        {label}
                                        {badge > 0 && <span className="text-indigo-300">· {t('sidebar.cartBadge', { count: badge })}</span>}
                                        {index < 9 && <kbd className="rounded bg-white/15 px-1 text-[10px] font-medium">Alt {index + 1}</kbd>}
                                    </span>
                                </div>
                                {separatorAfter && <div className="h-px w-6 bg-slate-300/70 dark:bg-slate-600" aria-hidden="true" />}
                            </div>
                        );
                    })}
                </nav>

                {/* Footer: divider + logout + avatar */}
                <div className="flex w-full flex-col items-center gap-3">
                    <div className="h-px w-8 bg-slate-200 dark:bg-slate-700" />
                    <div className="group relative">
                        <button
                            type="button"
                            aria-label={t('auth.logout')}
                            onClick={logout}
                            disabled={loggingOut}
                            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 outline-none transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-4 focus-visible:ring-red-200 disabled:opacity-60 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        >
                            {loggingOut ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} />}
                        </button>
                        <span role="tooltip" className={tooltip}>
                            {t('auth.logout')}
                        </span>
                    </div>
                    <div className="group relative">
                        <Link
                            href="/profile"
                            onClick={onClose}
                            aria-label={t('navigation.myProfile')}
                            aria-current={isActive(url, '/profile') ? 'page' : undefined}
                            className={`relative flex rounded-full outline-none focus-visible:ring-4 focus-visible:ring-indigo-300/60 ${
                                isActive(url, '/profile') ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-100 dark:ring-offset-slate-900' : ''
                            }`}
                        >
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white shadow-sm">
                                {auth?.user?.name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                            {/* Online dot */}
                            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-gray-100 dark:ring-slate-900" aria-hidden="true" />
                        </Link>
                        <span role="tooltip" className={tooltip}>
                            <span className="flex flex-col leading-tight">
                                <span>{auth?.user?.name || t('navigation.myProfile')}</span>
                                {auth?.user?.email && <span className="text-[10px] font-normal text-slate-300">{auth.user.email}</span>}
                            </span>
                        </span>
                    </div>
                </div>
            </aside>
        </>
    );
}
