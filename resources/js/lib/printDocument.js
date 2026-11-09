import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads a document (thermal ticket HTML or PDF) in a hidden iframe and opens the browser print
 * dialog. Falls back to opening it in a new tab if the browser refuses.
 *
 * Tickets (any URL containing "/ticket") are re-opened with ?print=1 in the fallback so the new
 * tab prints by itself.
 */
export default function usePrintDocument() {
    const frameRef = useRef(null);
    const [printing, setPrinting] = useState(false);

    useEffect(() => () => frameRef.current?.remove(), []);

    const print = useCallback((url) => {
        frameRef.current?.remove();
        setPrinting(true);

        const frame = document.createElement('iframe');
        frame.setAttribute('aria-hidden', 'true');
        frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
        frame.src = url;

        const fallback = () => {
            setPrinting(false);
            const sep = url.includes('?') ? '&' : '?';
            window.open(url.includes('/ticket') ? `${url}${sep}print=1` : url, '_blank', 'noopener');
        };
        const timeout = setTimeout(fallback, 15000);

        frame.onload = () => {
            clearTimeout(timeout);
            // Give the PDF viewer a moment to render before printing.
            setTimeout(() => {
                try {
                    frame.contentWindow.focus();
                    frame.contentWindow.print();
                    setPrinting(false);
                } catch {
                    fallback();
                }
            }, 400);
        };

        document.body.appendChild(frame);
        frameRef.current = frame;
    }, []);

    return { print, printing };
}
