import { router } from '@inertiajs/react';
import {
    BarChart3,
    Box,
    CornerDownLeft,
    FileText,
    Loader2,
    Receipt,
    ScanLine,
    Search,
    Settings,
    ShoppingBag,
    User,
    Users,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import { formatCurrency } from '../../lib/formatCurrency';

const EMPTY = { products: [], clients: [], sales: [] };
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

function normalize(str) {
    return (str || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export default function GlobalSearch({ value, onValueChange }) {
    const { t } = useTranslation();
    const online = useOnlineStatus();
    const inputRef = useRef(null);
    const wrapperRef = useRef(null);

    // On the Sales page the parent owns the value (it also filters the product grid).
    const [internal, setInternal] = useState('');
    const controlled = typeof onValueChange === 'function';
    const query = controlled ? (value ?? '') : internal;
    const setQuery = (v) => (controlled ? onValueChange(v) : setInternal(v));

    const [open, setOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [remote, setRemote] = useState(EMPTY);
    const [active, setActive] = useState(0);

    const pages = useMemo(
        () => [
            { icon: ShoppingBag, label: t('navigation.sales'), href: '/' },
            { icon: Box, label: t('navigation.products'), href: '/produits' },
            { icon: ScanLine, label: t('navigation.scan'), href: '/scan' },
            { icon: BarChart3, label: t('navigation.reports'), href: '/rapports' },
            { icon: Users, label: t('navigation.clients'), href: '/clients' },
            { icon: Receipt, label: t('navigation.history'), href: '/ventes' },
            { icon: Settings, label: t('navigation.settings'), href: '/parametres' },
            { icon: User, label: t('navigation.profile'), href: '/profile' },
        ],
        [t],
    );

    const trimmed = query.trim();

    // Debounced server search
    useEffect(() => {
        if (!online || (trimmed.length < 2 && !/^\d+$/.test(trimmed))) {
            setRemote(EMPTY);
            setLoading(false);
            return;
        }
        const controller = new AbortController();
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/recherche?q=${encodeURIComponent(trimmed)}`, {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin',
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error(res.statusText);
                setRemote({ ...EMPTY, ...(await res.json()) });
            } catch (e) {
                if (e.name !== 'AbortError') setRemote(EMPTY);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 200);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [trimmed, online]);

    // Flat list of results, used for keyboard navigation
    const groups = useMemo(() => {
        if (!trimmed) return [];
        const q = normalize(trimmed);
        const result = [];

        const pageHits = pages.filter((p) => normalize(p.label).includes(q));
        if (pageHits.length) {
            result.push({
                id: 'pages',
                label: t('search.groups.pages'),
                items: pageHits.map((p) => ({ key: `page-${p.href}`, icon: p.icon, title: p.label, href: p.href })),
            });
        }
        if (remote.products.length) {
            result.push({
                id: 'products',
                label: t('search.groups.products'),
                items: remote.products.map((p) => ({
                    key: `product-${p.id}`,
                    icon: Box,
                    title: p.name,
                    subtitle: [p.sku, t('search.stock', { count: p.stock })].filter(Boolean).join(' · '),
                    meta: formatCurrency(p.price),
                    href: `/produits?q=${encodeURIComponent(p.name)}`,
                })),
            });
        }
        if (remote.clients.length) {
            result.push({
                id: 'clients',
                label: t('search.groups.clients'),
                items: remote.clients.map((c) => ({
                    key: `client-${c.id}`,
                    icon: Users,
                    title: c.name,
                    subtitle: [c.phone, c.email].filter(Boolean).join(' · '),
                    href: `/clients?q=${encodeURIComponent(c.name)}`,
                })),
            });
        }
        if (remote.sales.length) {
            result.push({
                id: 'sales',
                label: t('search.groups.sales'),
                items: remote.sales.map((s) => ({
                    key: `sale-${s.id}`,
                    icon: FileText,
                    title: `${t('search.sale')} #${s.id}`,
                    subtitle: [s.client, s.created_at && new Date(s.created_at).toLocaleDateString()].filter(Boolean).join(' · '),
                    meta: formatCurrency(s.total),
                    href: `/ventes/${s.id}`,
                })),
            });
        }
        return result;
    }, [trimmed, remote, pages, t]);

    const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

    useEffect(() => setActive(0), [trimmed, remote]);

    // Ctrl/⌘+K and "/" focus the search
    useEffect(() => {
        const onKey = (e) => {
            const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable;
            if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
                e.preventDefault();
                setMobileOpen(true);
                setOpen(true);
                requestAnimationFrame(() => inputRef.current?.focus());
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Close on outside click
    useEffect(() => {
        const onDown = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
                setMobileOpen(false);
            }
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, []);

    const close = () => {
        setOpen(false);
        setMobileOpen(false);
        inputRef.current?.blur();
    };

    const go = (item) => {
        if (!item) return;
        close();
        if (!controlled) setInternal('');
        router.visit(item.href);
    };

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((i) => (flat.length ? (i + 1) % flat.length : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
        } else if (e.key === 'Enter') {
            if (flat[active]) {
                e.preventDefault();
                go(flat[active]);
            }
        } else if (e.key === 'Escape') {
            close();
        }
    };

    const showPanel = open && trimmed.length > 0;
    let index = -1;

    return (
        <>
            {/* Mobile trigger */}
            <button
                type="button"
                onClick={() => {
                    setMobileOpen(true);
                    setOpen(true);
                    requestAnimationFrame(() => inputRef.current?.focus());
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 sm:hidden dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label={t('search.placeholder')}
            >
                <Search size={19} />
            </button>

            <div
                ref={wrapperRef}
                className={`${
                    mobileOpen
                        ? 'fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-2 border-b border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900'
                        : 'hidden'
                } sm:relative sm:inset-auto sm:z-auto sm:flex sm:h-auto sm:w-full sm:max-w-xl sm:border-0 sm:bg-transparent sm:px-0 sm:dark:bg-transparent`}
            >
                <div className="relative w-full">
                    <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 sm:left-4" />
                    <input
                        ref={inputRef}
                        type="search"
                        role="combobox"
                        aria-expanded={showPanel}
                        aria-controls="global-search-results"
                        aria-autocomplete="list"
                        aria-activedescendant={showPanel && flat[active] ? `gs-${flat[active].key}` : undefined}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        onKeyDown={onKeyDown}
                        placeholder={t('search.placeholder')}
                        autoComplete="off"
                        className="h-10 w-full rounded-full border border-slate-200 bg-slate-50/80 pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 sm:pl-11 sm:pr-16 lg:h-11 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:focus:bg-slate-800 dark:focus:ring-indigo-500/20 [&::-webkit-search-cancel-button]:hidden"
                    />
                    <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5 sm:right-4">
                        {loading && <Loader2 size={15} className="animate-spin text-slate-400" />}
                        {query && !loading && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery('');
                                    inputRef.current?.focus();
                                }}
                                className="rounded-full p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                aria-label={t('search.clear')}
                            >
                                <X size={15} />
                            </button>
                        )}
                        {!query && (
                            <kbd className="hidden rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-500 shadow-sm sm:block dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                                {isMac ? '⌘' : 'Ctrl'} K
                            </kbd>
                        )}
                    </div>

                    {showPanel && (
                        <div
                            id="global-search-results"
                            role="listbox"
                            className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900"
                        >
                            {!online && (
                                <div className="mb-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                                    {t('search.offline')}
                                </div>
                            )}

                            {groups.map((group) => (
                                <div key={group.id} className="py-1">
                                    <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                        {group.label}
                                    </div>
                                    {group.items.map((item) => {
                                        index += 1;
                                        const i = index;
                                        const Icon = item.icon;
                                        const isActive = i === active;
                                        return (
                                            <button
                                                key={item.key}
                                                id={`gs-${item.key}`}
                                                type="button"
                                                role="option"
                                                aria-selected={isActive}
                                                onMouseEnter={() => setActive(i)}
                                                onClick={() => go(item)}
                                                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                                                    isActive ? 'bg-indigo-50 dark:bg-indigo-500/15' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                <span
                                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                                        isActive
                                                            ? 'bg-indigo-500 text-white'
                                                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}
                                                >
                                                    <Icon size={16} />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{item.title}</span>
                                                    {item.subtitle && (
                                                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{item.subtitle}</span>
                                                    )}
                                                </span>
                                                {item.meta && (
                                                    <span className="shrink-0 text-xs font-semibold text-slate-600 dark:text-slate-300">{item.meta}</span>
                                                )}
                                                {isActive && <CornerDownLeft size={14} className="hidden shrink-0 text-indigo-400 sm:block" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}

                            {!loading && flat.length === 0 && (
                                <div className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                                    {t('search.noResults', { query: trimmed })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {mobileOpen && (
                    <button
                        type="button"
                        onClick={close}
                        className="shrink-0 px-1 text-sm font-medium text-slate-600 sm:hidden dark:text-slate-300"
                    >
                        {t('common.cancel')}
                    </button>
                )}
            </div>
        </>
    );
}
