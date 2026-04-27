import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import Sidebar from '../Components/Sales/Sidebar';
import Topbar from '../Components/Sales/Topbar';

export default function PosLayout({ searchQuery, onSearchChange, children }) {
    const { auth } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 text-slate-900">
            <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <Topbar
                    searchQuery={searchQuery}
                    onSearchChange={onSearchChange}
                    onMenuClick={() => setSidebarOpen(true)}
                />
                <main className="flex flex-1 flex-col overflow-hidden lg:flex-row">
                    {typeof children === 'function' ? children({ user: auth?.user }) : children}
                </main>
            </div>
        </div>
    );
}
