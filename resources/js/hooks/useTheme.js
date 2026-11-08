import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'theme';

function readStoredTheme() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'dark' || stored === 'light') return stored;
    } catch {
        // storage unavailable
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
}

export default function useTheme() {
    const [theme, setTheme] = useState(() =>
        typeof window === 'undefined' ? 'light' : readStoredTheme(),
    );

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
