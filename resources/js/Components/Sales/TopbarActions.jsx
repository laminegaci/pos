import { Link, router } from '@inertiajs/react';
import { Maximize, Minimize, Moon, PackagePlus, RefreshCw, Sun } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useFullscreen from '../../hooks/useFullscreen';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import useTheme from '../../hooks/useTheme';

const iconButton =
    'relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100';

export function OnlineStatus() {
    const { t } = useTranslation();
    const online = useOnlineStatus();
    const label = online ? t('topbar.online') : t('topbar.offline');

    return (
        <div
            role="status"
            aria-live="polite"
            title={label}
            className={`flex h-8 items-center gap-2 rounded-full border px-2.5 text-xs font-medium transition-colors ${
                online
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
            }`}
        >
            <span className="relative flex h-2 w-2">
                {online && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                )}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-red-500'}`} />
            </span>
            <span className="hidden md:inline">{label}</span>
        </div>
    );
}

export function SyncButton() {
    const { t, i18n } = useTranslation();
    const online = useOnlineStatus();
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(() => new Date());

    const sync = () => {
        if (syncing || !online) return;
        setSyncing(true);
        router.reload({
            onSuccess: () => setLastSync(new Date()),
            onFinish: () => setSyncing(false),
        });
    };

    const time = lastSync.toLocaleTimeString(i18n.resolvedLanguage, { hour: '2-digit', minute: '2-digit' });
    const title = !online
        ? t('topbar.syncOffline')
        : syncing
          ? t('topbar.syncing')
          : t('topbar.lastSync', { time });

    return (
        <button type="button" onClick={sync} disabled={!online} className={iconButton} title={title} aria-label={t('topbar.sync')}>
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
        </button>
    );
}

export function ThemeToggle() {
    const { t } = useTranslation();
    const { isDark, toggleTheme } = useTheme();
    const label = isDark ? t('topbar.lightMode') : t('topbar.darkMode');

    return (
        <button type="button" onClick={toggleTheme} className={iconButton} title={label} aria-label={label} aria-pressed={isDark}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
    );
}

export function FullscreenToggle() {
    const { t } = useTranslation();
    const { supported, isFullscreen, toggleFullscreen } = useFullscreen();
    if (!supported) return null;
    const label = isFullscreen ? t('topbar.exitFullscreen') : t('topbar.fullscreen');

    return (
        <button type="button" onClick={toggleFullscreen} className={`${iconButton} hidden sm:flex`} title={label} aria-label={label}>
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
    );
}

/** Jump straight to the "new product" form. */
export function NewProductButton() {
    const { t } = useTranslation();
    return (
        <Link
            href="/produits?nouveau=1"
            title={t('products.newProduct')}
            className="hidden h-9 items-center gap-1.5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 px-3 text-xs font-semibold text-white shadow-sm shadow-indigo-500/30 transition hover:shadow-md md:flex"
        >
            <PackagePlus size={15} />
            <span className="hidden xl:inline">{t('products.newProduct')}</span>
        </Link>
    );
}
