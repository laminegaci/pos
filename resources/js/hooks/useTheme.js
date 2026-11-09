import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'theme';

function systemTheme() {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** 'light' | 'dark' | 'auto' (or anything else) -> 'light' | 'dark'. */
export function resolveTheme(theme) {
    return theme === 'dark' || theme === 'light' ? theme : systemTheme();
}

/** A per-device choice wins over the shop default configured in Settings. */
function readTheme(shopTheme) {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'dark' || stored === 'light') return stored;
    } catch {
        // storage unavailable
    }
    return resolveTheme(shopTheme);
}

export function applyTheme(theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
}

/** Drops the per-device override so the shop default applies again. */
export function clearThemeOverride() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // storage unavailable
    }
}

export default function useTheme() {
    const shopTheme = usePage().props.shop?.theme;
    const [theme, setTheme] = useState(() =>
        typeof window === 'undefined' ? 'light' : readTheme(shopTheme),
    );

    // The shop default changed (Settings saved): follow it unless this device chose its own.
    useEffect(() => {
        setTheme(readTheme(shopTheme));
    }, [shopTheme]);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme((current) => {
            const next = current === 'dark' ? 'light' : 'dark';
            try {
                localStorage.setItem(STORAGE_KEY, next);
            } catch {
                // storage unavailable
            }
            return next;
        });
    }, []);

    return { theme, isDark: theme === 'dark', toggleTheme };
}
