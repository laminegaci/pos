import { useEffect, useRef } from 'react';

const isEditable = (el) =>
    !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/**
 * Listens for a barcode reader (keyboard-wedge scanners type the code very fast, then press Enter)
 * and calls onScan(code). Ignored while the user types in a field, and a slow human typing never
 * reaches the speed threshold.
 */
export default function useBarcodeScanner(onScan, { minLength = 6, maxGapMs = 60, enabled = true } = {}) {
    const handler = useRef(onScan);
    handler.current = onScan;

    useEffect(() => {
        if (!enabled) return undefined;
        let buffer = '';
        let last = 0;

        const onKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey || isEditable(e.target)) return;
            const now = performance.now();

            if (e.key === 'Enter') {
                const code = buffer;
                buffer = '';
                if (code.length >= minLength) {
                    e.preventDefault();
                    handler.current(code);
                }
                return;
            }

            if (e.key.length !== 1) return;
            // A pause longer than a scanner's inter-key delay starts a new code.
            if (now - last > maxGapMs) buffer = '';
            last = now;
            buffer += e.key;
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [enabled, minLength, maxGapMs]);
}
