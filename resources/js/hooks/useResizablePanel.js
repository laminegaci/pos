import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'pos.cartPanel';
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function load(defaultWidth) {
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
        return {
            width: Number.isFinite(parsed?.width) ? parsed.width : defaultWidth,
            collapsed: parsed?.collapsed === true,
        };
    } catch {
        return { width: defaultWidth, collapsed: false };
    }
}

/**
 * Width + collapsed state of a side panel, kept in localStorage.
 * `startResize` is meant for onPointerDown on a handle on the panel's left edge
 * (dragging left widens the panel). Arrow keys on the handle resize by `step`.
 */
export default function useResizablePanel({ defaultWidth = 368, min = 320, max = 640, step = 24 } = {}) {
    const [state, setState] = useState(() => {
        const s = load(defaultWidth);
        return { ...s, width: clamp(s.width, min, max) };
    });
    const [dragging, setDragging] = useState(false);
    const drag = useRef(null);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch {
            // storage unavailable: the layout simply isn't remembered
        }
    }, [state]);

    const setWidth = useCallback(
        (width) => setState((s) => ({ ...s, width: clamp(Math.round(width), min, max) })),
        [min, max],
    );
    const toggleCollapsed = useCallback(() => setState((s) => ({ ...s, collapsed: !s.collapsed })), []);

    const startResize = useCallback(
        (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            e.preventDefault();
            drag.current = { x: e.clientX, width: state.width };
            setDragging(true);
        },
        [state.width],
    );

    useEffect(() => {
        if (!dragging) return;
        const onMove = (e) => setWidth(drag.current.width + (drag.current.x - e.clientX));
        const onUp = () => {
            drag.current = null;
            setDragging(false);
        };
        // Keep the cursor and block text selection for the whole drag.
        const prevCursor = document.body.style.cursor;
        const prevSelect = document.body.style.userSelect;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        return () => {
            document.body.style.cursor = prevCursor;
            document.body.style.userSelect = prevSelect;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };
    }, [dragging, setWidth]);

    const onHandleKeyDown = useCallback(
        (e) => {
            if (e.key === 'ArrowLeft') setWidth(state.width + step);
            else if (e.key === 'ArrowRight') setWidth(state.width - step);
            else if (e.key === 'Home') setWidth(min);
            else if (e.key === 'End') setWidth(max);
            else return;
            e.preventDefault();
        },
        [state.width, step, min, max, setWidth],
    );

    return { width: state.width, collapsed: state.collapsed, dragging, min, max, setWidth, toggleCollapsed, startResize, onHandleKeyDown };
}
