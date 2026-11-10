import { Link, usePage } from '@inertiajs/react';
import { Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../LanguageSwitcher';
import GlobalSearch from './GlobalSearch';
import StockAlertsBell from './StockAlertsBell';
import { FullscreenToggle, NewProductButton, OnlineStatus, SyncButton, ThemeToggle } from './TopbarActions';

export default function Topbar({ searchQuery, onSearchChange, onMenuClick }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const user = auth?.user;
    const showSearch = typeof onSearchChange === 'function';

    return (
        <header className="flex h-14 items-center gap-2 border-b border-slate-200/70 bg-white/80 px-3 backdrop-blur-xl sm:gap-3 sm:px-4 lg:h-16 lg:px-6 dark:border-slate-800 dark:bg-slate-900/80">
            <button
                type="button"
                onClick={onMenuClick}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Ouvrir le menu"
            >
                <Menu size={20} />
            </button>

            <div className="flex min-w-0 flex-1 justify-end sm:justify-center">
                <GlobalSearch
                    value={showSearch ? searchQuery : undefined}
                    onValueChange={showSearch ? onSearchChange : undefined}
                />
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                <NewProductButton />
                <OnlineStatus />
                <SyncButton />
                <ThemeToggle />
                <FullscreenToggle />
                <div className="hidden h-8 w-px bg-slate-200 sm:block dark:bg-slate-700" />
                <LanguageSwitcher />
                <StockAlertsBell />
                <div className="hidden h-8 w-px bg-slate-200 sm:block dark:bg-slate-700" />
                <Link href="/profile" className="flex items-center gap-3 hover:opacity-80">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white shadow-sm sm:h-10 sm:w-10">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="hidden text-sm leading-tight md:block">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{user?.name || 'Utilisateur'}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{t(`roles.${user?.role}`, { defaultValue: t('roles.cashier') })}</div>
                    </div>
                </Link>
            </div>
        </header>
    );
}
