import { usePage } from '@inertiajs/react';
import Sidebar from '../Components/Sales/Sidebar';
import Topbar from '../Components/Sales/Topbar';

export default function PosLayout({ searchQuery, onSearchChange, children }) {
    const { auth } = usePage().props;

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 text-slate-900">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                {onSearchChange ? (
                    <Topbar searchQuery={searchQuery} onSearchChange={onSearchChange} />
                ) : (
                    <Topbar />
                )}
                <main className="flex flex-1 overflow-hidden">
                    {typeof children === 'function' ? children({ user: auth?.user }) : children}
                </main>
            </div>
        </div>
    );
}