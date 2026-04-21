import Sidebar from '../Components/Sales/Sidebar';
import Topbar from '../Components/Sales/Topbar';

export default function PosLayout({ user, searchQuery, onSearchChange, children }) {
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 text-slate-900">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                {onSearchChange ? (
                    <Topbar user={user} searchQuery={searchQuery} onSearchChange={onSearchChange} />
                ) : null}
                <main className="flex flex-1 overflow-hidden">{children}</main>
            </div>
        </div>
    );
}
