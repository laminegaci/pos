import { Bell, Search } from 'lucide-react';

export default function Topbar({ user, searchQuery, onSearchChange }) {
    return (
        <header className="flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-6">
            <div className="flex flex-1 justify-center">
                <div className="relative w-full max-w-xl">
                    <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Rechercher un produit..."
                        className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-14 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    />
                    <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-gray-500">
                        ⌘ K
                    </kbd>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <button className="relative flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900">
                    <Bell size={20} />
                    <span className="absolute right-1.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                        3
                    </span>
                </button>
                <div className="flex items-center gap-3 pl-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                        {user.initials}
                    </div>
                    <div className="text-sm leading-tight">
                        <div className="font-semibold text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.role}</div>
                    </div>
                </div>
            </div>
        </header>
    );
}
