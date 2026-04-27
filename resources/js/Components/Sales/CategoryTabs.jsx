import { LayoutGrid, List } from 'lucide-react';

export default function CategoryTabs({ categories, selected, onSelect, viewMode, onViewModeChange }) {
    return (
        <div className="flex items-center gap-3">
            <div className="-mx-1 flex flex-1 items-center gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {categories.map((cat) => {
                    const active = cat.id === selected;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => onSelect(cat.id)}
                            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition sm:px-4 sm:py-2 sm:text-sm ${
                                active
                                    ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25'
                                    : 'bg-white/70 text-slate-600 ring-1 ring-slate-200 hover:bg-white hover:text-slate-900'
                            }`}
                        >
                            {cat.label}
                        </button>
                    );
                })}
            </div>
            <div className="hidden shrink-0 items-center gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200 sm:flex">
                <button
                    onClick={() => onViewModeChange('grid')}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                        viewMode === 'grid' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Vue grille"
                >
                    <LayoutGrid size={15} />
                </button>
                <button
                    onClick={() => onViewModeChange('list')}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                        viewMode === 'list' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Vue liste"
                >
                    <List size={15} />
                </button>
            </div>
        </div>
    );
}
