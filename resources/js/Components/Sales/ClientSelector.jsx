import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, User, X } from 'lucide-react';

export default function ClientSelector({ clients = [], value, onChange }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = useRef(null);

    const selected = useMemo(
        () => clients.find((c) => c.id === value) ?? null,
        [clients, value],
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return clients;
        return clients.filter(
            (c) =>
                c.name?.toLowerCase().includes(q) ||
                c.phone?.toLowerCase().includes(q),
        );
    }, [clients, query]);

    useEffect(() => {
        if (!open) return;
        const onClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:border-slate-300"
            >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
                    <User size={14} />
                </span>
                <span className="min-w-0 flex-1 truncate">
                    {selected ? (
                        <span className="font-semibold text-slate-900">{selected.name}</span>
                    ) : (
                        <span className="text-slate-500">Client de passage</span>
                    )}
                </span>
                {selected && (
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange(null);
                        }}
                        className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        title="Retirer le client"
                    >
                        <X size={12} />
                    </span>
                )}
                <ChevronDown size={14} className="text-slate-400" />
            </button>

            {open && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                        <Search size={14} className="text-slate-400" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Rechercher un client…"
                            className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        />
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                        <button
                            type="button"
                            onClick={() => {
                                onChange(null);
                                setOpen(false);
                                setQuery('');
                            }}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50"
                        >
                            <span>Client de passage</span>
                            {value === null && <Check size={14} className="text-indigo-500" />}
                        </button>
                        {filtered.length === 0 ? (
                            <div className="px-3 py-4 text-center text-xs text-slate-400">Aucun client trouvé</div>
                        ) : (
                            filtered.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(c.id);
                                        setOpen(false);
                                        setQuery('');
                                    }}
                                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                                >
                                    <span className="min-w-0">
                                        <span className="block truncate font-medium text-slate-900">{c.name}</span>
                                        {c.phone && <span className="block truncate text-xs text-slate-500">{c.phone}</span>}
                                    </span>
                                    {value === c.id && <Check size={14} className="text-indigo-500" />}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
