import { ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const arrow =
    'absolute top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-600 shadow-md ring-1 ring-slate-200 transition hover:scale-105 hover:text-slate-900 active:scale-95 sm:flex dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:text-white';

const fade = 'pointer-events-none absolute inset-y-0 z-10 w-10 from-slate-50 via-slate-50/80 to-transparent dark:from-slate-950 dark:via-slate-950/80';

/**
 * Category chips: horizontal scroll with edge fades + arrows, wheel and mouse-drag scrolling,
 * arrow-key navigation, the category colour and (optionally) how many products it holds.
 */
export default function CategoryTabs({ categories, selected, onSelect, viewMode, onViewModeChange, counts = null }) {
    const scroller = useRef(null);
    const drag = useRef({ active: false, moved: false, startX: 0, startScroll: 0 });
    const [edges, setEdges] = useState({ left: false, right: false });
    const [dragging, setDragging] = useState(false);

    const updateEdges = useCallback(() => {
        const el = scroller.current;
        if (!el) return;
        const left = el.scrollLeft > 4;
        const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
        setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
    }, []);

    useEffect(() => {
        const el = scroller.current;
        if (!el) return;
        updateEdges();
        el.addEventListener('scroll', updateEdges, { passive: true });
        const observer = new ResizeObserver(updateEdges);
        observer.observe(el);
        return () => {
            el.removeEventListener('scroll', updateEdges);
            observer.disconnect();
        };
    }, [updateEdges, categories]);

    // A vertical mouse wheel scrolls the row sideways (trackpads already send deltaX).
    useEffect(() => {
        const el = scroller.current;
        if (!el) return;
        const onWheel = (e) => {
            if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
            e.preventDefault();
            el.scrollLeft += e.deltaY;
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    // Keep the selected category visible.
    useEffect(() => {
        scroller.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }, [selected]);

    const scrollBy = (dir) => {
        const el = scroller.current;
        el?.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.7), behavior: 'smooth' });
    };

    // Mouse drag to scroll (touch already scrolls natively). A real drag must not trigger a click.
    const onPointerDown = (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        const el = scroller.current;
        if (!el || el.scrollWidth <= el.clientWidth) return;
        drag.current = { active: true, moved: false, startX: e.clientX, startScroll: el.scrollLeft };
    };
    const onPointerMove = (e) => {
        const d = drag.current;
        if (!d.active) return;
        const dx = e.clientX - d.startX;
        if (!d.moved && Math.abs(dx) > 5) {
            d.moved = true;
            setDragging(true);
        }
        if (d.moved) scroller.current.scrollLeft = d.startScroll - dx;
    };
    const endDrag = () => {
        if (!drag.current.active) return;
        drag.current.active = false;
        setDragging(false);
        // `moved` stays true until after the click event that follows pointerup.
        setTimeout(() => { drag.current.moved = false; }, 0);
    };

    const select = (id) => {
        if (drag.current.moved) return;
        onSelect(id);
    };

    // ← / → move the selection, like a tab list.
    const onKeyDown = (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const index = categories.findIndex((c) => c.id === selected);
        const next = categories[index + (e.key === 'ArrowRight' ? 1 : -1)];
        if (!next) return;
        e.preventDefault();
        onSelect(next.id);
        requestAnimationFrame(() => scroller.current?.querySelector('[aria-selected="true"]')?.focus());
    };

    const total = useMemo(() => (counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null), [counts]);

    return (
        <div className="flex items-center gap-3">
            <div className="relative min-w-0 flex-1">
                {edges.left && (
                    <>
                        <div className={`${fade} left-0 bg-gradient-to-r`} aria-hidden="true" />
                        <button type="button" onClick={() => scrollBy(-1)} className={`${arrow} left-0`} aria-label="←" tabIndex={-1}>
                            <ChevronLeft size={16} />
                        </button>
                    </>
                )}
                <div
                    ref={scroller}
                    role="tablist"
                    onKeyDown={onKeyDown}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onPointerLeave={endDrag}
                    className={`-mx-1 flex select-none items-center gap-1.5 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                        dragging ? 'cursor-grabbing' : edges.left || edges.right ? 'cursor-grab scroll-smooth' : 'scroll-smooth'
                    }`}
                >
                    {categories.map((cat) => {
                        const active = cat.id === selected;
                        const count = counts ? (cat.id === 'all' ? total : (counts[cat.id] ?? 0)) : null;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                tabIndex={active ? 0 : -1}
                                onClick={() => select(cat.id)}
                                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:px-4 sm:py-2 sm:text-sm ${
                                    active
                                        ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25'
                                        : 'bg-white/70 text-slate-600 ring-1 ring-slate-200 hover:bg-white hover:text-slate-900 dark:bg-slate-800/70 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800 dark:hover:text-white'
                                } ${count === 0 && !active ? 'opacity-50' : ''}`}
                            >
                                {cat.color && (
                                    <span
                                        className={`h-2 w-2 shrink-0 rounded-full ${active ? 'ring-2 ring-white/70' : ''}`}
                                        style={{ backgroundColor: cat.color }}
                                        aria-hidden="true"
                                    />
                                )}
                                {cat.label}
                                {count !== null && (
                                    <span
                                        className={`rounded-full px-1.5 text-[10px] font-semibold tabular-nums sm:text-xs ${
                                            active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
                {edges.right && (
                    <>
                        <div className={`${fade} right-0 bg-gradient-to-l`} aria-hidden="true" />
                        <button type="button" onClick={() => scrollBy(1)} className={`${arrow} right-0`} aria-label="→" tabIndex={-1}>
                            <ChevronRight size={16} />
                        </button>
                    </>
                )}
            </div>
            <div className="hidden shrink-0 items-center gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200 sm:flex dark:bg-slate-800 dark:ring-slate-700">
                <button
                    onClick={() => onViewModeChange('grid')}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                        viewMode === 'grid' ? 'bg-slate-900 text-white shadow-sm dark:bg-indigo-500' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Vue grille"
                >
                    <LayoutGrid size={15} />
                </button>
                <button
                    onClick={() => onViewModeChange('list')}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                        viewMode === 'list' ? 'bg-slate-900 text-white shadow-sm dark:bg-indigo-500' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Vue liste"
                >
                    <List size={15} />
                </button>
            </div>
        </div>
    );
}
