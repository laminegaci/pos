import { LayoutGrid, List } from 'lucide-react';

export default function CategoryTabs({ categories, selected, onSelect, viewMode, onViewModeChange }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
                {categories.map((cat) => {
                    const active = cat.id === selected;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => onSelect(cat.id)}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
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
            <div className="flex items-center gap-1 rounded-full bg-white p-1 ring-1 ring-slate-200 shadow-sm">
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
