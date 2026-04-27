import { Link, usePage } from '@inertiajs/react';
import { Bell, Menu, Search } from 'lucide-react';

export default function Topbar({ searchQuery, onSearchChange, onMenuClick }) {
    const { auth } = usePage().props;
    const user = auth?.user;
    const showSearch = typeof onSearchChange === 'function';

    return (
        <header className="flex h-14 items-center gap-2 border-b border-slate-200/70 bg-white/80 px-3 backdrop-blur-xl sm:gap-3 sm:px-4 lg:h-16 lg:px-6">
            <button
                type="button"
                onClick={onMenuClick}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 lg:hidden"
                aria-label="Ouvrir le menu"
            >
                <Menu size={20} />
            </button>

            {showSearch && (
                <div className="flex min-w-0 flex-1 justify-center">
                    <div className="relative w-full max-w-xl">
                        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 sm:left-4" />
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Rechercher un produit..."
                            className="h-10 w-full rounded-full border border-slate-200 bg-slate-50/80 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 sm:pl-11 sm:pr-16 lg:h-11"
                        />
                        <kbd className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-500 shadow-sm sm:block">
                            ⌘ K
                        </kbd>
                    </div>
                </div>
            )}
            {!showSearch && <div className="flex-1" />}

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <button
                    className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Notifications"
                >
                    <Bell size={19} />
                    <span className="absolute right-1.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white shadow-sm">
                        3
                    </span>
                </button>
                <div className="hidden h-8 w-px bg-slate-200 sm:block" />
                <Link href="/profile" className="flex items-center gap-3 hover:opacity-80">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white shadow-sm sm:h-10 sm:w-10">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="hidden text-sm leading-tight md:block">
                        <div className="font-semibold text-slate-900">{user?.name || 'Utilisateur'}</div>
                        <div className="text-xs text-slate-500">Caissier</div>
                    </div>
                </Link>
            </div>
        </header>
    );
}
