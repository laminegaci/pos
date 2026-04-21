import { ShoppingCart, Package, ScanLine, BarChart3, Users, Settings, RefreshCw } from 'lucide-react';

const navItems = [
    { icon: ShoppingCart, label: 'Vente', active: true, badge: true },
    { icon: Package, label: 'Produits' },
    { icon: ScanLine, label: 'Scan' },
    { icon: BarChart3, label: 'Rapports' },
    { icon: Users, label: 'Clients' },
    { icon: Settings, label: 'Paramètres' },
];

export default function Sidebar() {
    return (
        <aside className="flex h-screen w-16 flex-col items-center justify-between border-r border-gray-200 bg-white py-4">
            <div className="flex flex-col items-center gap-2">
                {navItems.map(({ icon: Icon, label, active, badge }) => (
                    <button
                        key={label}
                        title={label}
                        className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition ${
                            active
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                    >
                        <Icon size={20} strokeWidth={2} />
                        {badge && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-white ring-2 ring-indigo-600" />}
                    </button>
                ))}
            </div>
            <div className="flex flex-col items-center gap-3">
                <button
                    title="Synchroniser"
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                >
                    <RefreshCw size={20} />
                </button>
                <img
                    src="https://picsum.photos/seed/avatar-user/80/80"
                    alt="Profil"
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-white"
                />
            </div>
        </aside>
    );
}
