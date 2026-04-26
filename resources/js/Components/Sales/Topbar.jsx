import { Link, usePage } from '@inertiajs/react';
import { Bell, Search } from 'lucide-react';

export default function Topbar({ searchQuery, onSearchChange }) {
    const { auth } = usePage().props;
    const user = auth?.user;

    return (
        <header className="flex h-16 items-center gap-4 border-b border-slate-200/70 bg-white/80 px-6 backdrop-blur-xl">
            <div className="flex flex-1 justify-center">
                <div className="relative w-full max-w-xl">
                    <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Rechercher un produit..."
                        className="h-11 w-full rounded-full border border-slate-200 bg-slate-50/80 pl-11 pr-16 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    />
                    <kbd className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-500 shadow-sm">
                        ⌘ K
                    </kbd>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                    <Bell size={19} />
                    <span className="absolute right-1.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white shadow-sm">
                        3
                    </span>
                </button>
                <div className="h-8 w-px bg-slate-200" />
                <Link href="/profile" className="flex items-center gap-3 hover:opacity-80">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white shadow-sm">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="text-sm leading-tight">
                        <div className="font-semibold text-slate-900">{user?.name || 'Utilisateur'}</div>
                        <div className="text-xs text-slate-500">Caissier</div>
                    </div>
                </Link>
            </div>
        </header>
    );
}