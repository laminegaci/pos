import { LayoutGrid, List } from 'lucide-react';

export default function CategoryTabs({ categories, selected, onSelect, viewMode, onViewModeChange }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
                {categories.map((cat) => {
                    const active = cat.id === selected;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => onSelect(cat.id)}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                                active
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {cat.label}
                        </button>
                    );
                })}
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm">
                <button
                    onClick={() => onViewModeChange('grid')}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                        viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-900'
                    }`}
                    title="Vue grille"
                >
                    <LayoutGrid size={16} />
                </button>
                <button
                    onClick={() => onViewModeChange('list')}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                        viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-900'
                    }`}
                    title="Vue liste"
                >
                    <List size={16} />
                </button>
            </div>
        </div>
    );
}
