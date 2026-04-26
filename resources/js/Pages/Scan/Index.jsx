import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScanLine, Package, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import PosLayout from '../../Layouts/PosLayout';
import { formatCurrency } from '../../lib/formatCurrency';

const CATEGORIES = [
    { id: 'all', label: 'Tout' },
    { id: 'bureaux', label: 'Bureaux' },
    { id: 'rangement_bureau', label: 'Rangement' },
    { id: 'bureaux_direction', label: 'Bureaux Direction' },
    { id: 'bureaux_compacts', label: 'Bureaux Compacts' },
    { id: 'bureaux_ergonomiques', label: 'Bureaux Ergonomiques' },
    { id: 'bureaux_gaming', label: 'Bureaux Gaming' },
    { id: 'mobilier_professionnel', label: 'Mobilier Pro' },
];

export default function ScanIndex({ products = [] }) {
    const [scanInput, setScanInput] = useState('');
    const [cartItems, setCartItems] = useState([]);
    const [lastScanned, setLastScanned] = useState(null);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (!scanInput.trim()) return;

        const timer = setTimeout(() => {
            handleScan(scanInput.trim());
            setScanInput('');
        }, 100);

        return () => clearTimeout(timer);
    }, [scanInput]);

    const handleScan = (code) => {
        setError(null);
        const product = products.find(
            (p) => p.sku?.toLowerCase() === code.toLowerCase() || p.id.toString() === code
        );

        if (!product) {
            setError(`Produit non trouvé: ${code}`);
            setLastScanned(null);
            return;
        }

        setLastScanned(product);
        setCartItems((prev) => {
            const existing = prev.find((i) => i.productId === product.id);
            if (existing) {
                return prev.map((i) =>
                    i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            return [...prev, { productId: product.id, quantity: 1 }];
        });
    };

    const incrementItem = (productId) => {
        setCartItems((prev) =>
            prev.map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i))
        );
    };

    const decrementItem = (productId) => {
        setCartItems((prev) =>
            prev
                .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i))
                .filter((i) => i.quantity > 0)
        );
    };

    const removeItem = (productId) => setCartItems((prev) => prev.filter((i) => i.productId !== productId));

    const clearCart = () => setCartItems([]);

    const cartProducts = useMemo(
        () =>
            cartItems.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                return {
                    id: product?.id,
                    productId: item.productId,
                    name: product?.name,
                    description: product?.description,
                    category_id: product?.category_id,
                    image: product?.image,
                    unitPrice: product?.price || 0,
                    quantity: item.quantity,
                    subtotal: (product?.price || 0) * item.quantity,
                };
            }),
        [cartItems, products]
    );

    const subtotal = cartProducts.reduce((sum, l) => sum + l.subtotal, 0);
    const remise = cartProducts.length > 0 ? 0 : 0;
    const total = Math.max(0, subtotal - remise);

    return (
        <>
            <Head title="Scan" />
            <PosLayout>
                <div className="flex flex-1 flex-col overflow-hidden px-8 py-6">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Scan</h1>
                        <p className="text-sm text-slate-500">Scanner ou saisir un code-barres (F2)</p>
                    </div>

                    <div className="mb-6">
                        <div className="relative">
                            <ScanLine className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={scanInput}
                                onChange={(e) => setScanInput(e.target.value)}
                                placeholder="Scanner ou taper le code..."
                                className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-14 pr-4 text-lg font-mono tracking-wider shadow-[0_2px_8px_rgba(15,23,42,0.08)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                                F2 pour focus
                            </div>
                        </div>

                        {error && (
                            <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                                <Trash2 size={18} />
                                {error}
                            </div>
                        )}

                        {lastScanned && !error && (
                            <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                                    <Package size={20} className="text-emerald-600" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-emerald-800">{lastScanned.name}</div>
                                    <div className="text-sm text-emerald-600">
                                        {lastScanned.description} • {formatCurrency(lastScanned.price)}
                                    </div>
                                </div>
                                <div className="rounded-full bg-emerald-500 px-3 py-1 text-sm font-bold text-white">
                                    +1
                                </div>
                            </div>
                        )}
                    </div>

                    {cartProducts.length > 0 ? (
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full">
                                <thead className="sticky top-0 bg-white">
                                    <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                                        <th className="pb-3">Produit</th>
                                        <th className="pb-3 text-center">Qté</th>
                                        <th className="pb-3 text-right">Prix</th>
                                        <th className="pb-3 text-right">Total</th>
                                        <th className="pb-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {cartProducts.map((item) => (
                                        <tr key={item.productId} className="hover:bg-slate-50/50">
                                            <td className="py-3">
                                                <div className="font-medium text-slate-900">{item.name}</div>
                                                <div className="text-xs text-slate-500">{item.description}</div>
                                            </td>
                                            <td className="py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => decrementItem(item.productId)}
                                                        className="rounded-lg p-1 hover:bg-slate-100"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="w-8 text-center font-semibold">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => incrementItem(item.productId)}
                                                        className="rounded-lg p-1 hover:bg-slate-100"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-3 text-right text-sm text-slate-600">
                                                {formatCurrency(item.unitPrice)}
                                            </td>
                                            <td className="py-3 text-right font-semibold text-indigo-600">
                                                {formatCurrency(item.subtotal)}
                                            </td>
                                            <td className="py-3 text-right">
                                                <button
                                                    onClick={() => removeItem(item.productId)}
                                                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-1 items-center justify-center">
                            <div className="flex flex-col items-center gap-3 text-slate-400">
                                <ScanLine className="h-12 w-12" />
                                <p>Aucun produit scanné</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex w-80 flex-col justify-between border-l border-slate-200/70 bg-white p-6">
                    <div>
                        <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                            <ShoppingBag size={20} />
                            Panier
                            <span className="ml-auto text-sm font-normal text-slate-500">
                                {cartProducts.length} article(s)
                            </span>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Sous-total</span>
                                <span className="font-medium">{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Remise</span>
                                <span className="text-red-500">-{formatCurrency(remise)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-200 pt-3 text-lg">
                                <span className="font-bold">Total</span>
                                <span className="font-bold text-indigo-600">{formatCurrency(total)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={clearCart}
                            className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Vider le panier
                        </button>
                        <button
                            onClick={() => alert(`Encaissement: ${formatCurrency(total)}`)}
                            disabled={cartProducts.length === 0}
                            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Encaisser (F9)
                        </button>
                    </div>
                </div>
            </PosLayout>
        </>
    );
}