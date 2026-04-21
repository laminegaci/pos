import Sidebar from '../Components/Sales/Sidebar';
import Topbar from '../Components/Sales/Topbar';

export default function PosLayout({ user, searchQuery, onSearchChange, children }) {
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gray-50 text-gray-900">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Topbar user={user} searchQuery={searchQuery} onSearchChange={onSearchChange} />
                <main className="flex flex-1 overflow-hidden">{children}</main>
            </div>
        </div>
    );
}
