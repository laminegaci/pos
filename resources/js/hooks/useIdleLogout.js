import { router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];

/**
 * Logs the user out after `shop.sessionTimeout` minutes without activity.
 * The server expires the session too (ApplySessionTimeout), this just avoids landing
 * on a 419 / login redirect on the next click.
 */
export default function useIdleLogout() {
    const minutes = Number(usePage().props.shop?.sessionTimeout) || 0;
    const authed = !!usePage().props.auth?.user;

    useEffect(() => {
        if (!authed || minutes < 1) return;

        const limit = minutes * 60 * 1000;
        let timer;
        const reset = () => {
            clearTimeout(timer);
            timer = setTimeout(() => router.post('/logout'), limit);
        };

        reset();
        EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
        return () => {
            clearTimeout(timer);
            EVENTS.forEach((e) => window.removeEventListener(e, reset));
        };
    }, [minutes, authed]);
}
