import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PosLayout from '../../Layouts/PosLayout';
import CategoryTabs from '../../Components/Sales/CategoryTabs';
import ProductGrid from '../../Components/Sales/ProductGrid';
import Cart from '../../Components/Sales/Cart';
import Toast from '../../Components/Toast';
import { formatCurrency } from '../../lib/formatCurrency';

export default function SalesIndex({ caisse, categories, products, clients = [] }) {
    const { t } = useTranslation();
    const { flash } = usePage().props;
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [cartItems, setCartItems] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (flash?.success) setToast({ message: flash.success, type: 'success' });
        else if (flash?.error) setToast({ message: flash.error, type: 'error' });
    }, [flash?.success, flash?.error]);

    const productsById = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

    const filteredProducts = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return products.filter((p) => {
            const matchesCat = selectedCategory === 'all' || p.category_id === selectedCategory;
            const matchesQuery = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
            return matchesCat && matchesQuery;
        });
    }, [products, selectedCategory, searchQuery]);

    const cartLines = useMemo(
        () =>
            cartItems.map((item) => {
                const product = productsById[item.productId];
                return {
                    id: product.id,
                    productId: item.productId,
                    name: product.name,
                    description: product.description,
                    category_id: product.category_id,
                    image: product.image,
                    unitPrice: product.price,
                    quantity: item.quantity,
                    subtotal: product.price * item.quantity,
                };
            }),
        [cartItems, productsById],
    );

    const subtotal = useMemo(() => cartLines.reduce((sum, l) => sum + l.subtotal, 0), [cartLines]);
    const remise = cartLines.length > 0 ? 0 : 0;
    const total = Math.max(0, subtotal - remise);

    const addToCart = (productId) => {
        setCartItems((prev) => {
            const existing = prev.find((i) => i.productId === productId);
            if (existing) return prev.map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i));
            return [...prev, { productId, quantity: 1 }];
        });
    };

    const incrementItem = (productId) => addToCart(productId);

    const decrementItem = (productId) => {
        setCartItems((prev) =>
            prev
                .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i))
                .filter((i) => i.quantity > 0),
        );
    };

    const removeItem = (productId) => setCartItems((prev) => prev.filter((i) => i.productId !== productId));

    const clearCart = () => {
        setCartItems([]);
        setSelectedClientId(null);
    };

    const handleCheckout = () => {
        if (cartLines.length === 0 || submitting) return;
        setSubmitting(true);
        router.post(
            '/ventes',
            {
                client_id: selectedClientId,
                remise,
                items: cartItems.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    clearCart();
                },
                onError: () => {
                    setToast({ message: t('sales.checkoutFailed'), type: 'error' });
                },
                onFinish: () => setSubmitting(false),
            },
        );
    };

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'F9') {
                e.preventDefault();
                handleCheckout();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    return (
        <>
            <Head title={t('sales.sale')} />
            <Toast
                message={toast?.message}
                type={toast?.type}
                onClose={() => setToast(null)}
            />
            <PosLayout searchQuery={searchQuery} onSearchChange={setSearchQuery}>
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
                    <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3 lg:mb-5">
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{t('sales.sale')}</h1>
                        <span className="text-xs font-medium text-slate-500 sm:text-sm">{t('sales.register')} #{caisse.number}</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/60">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                            {caisse.status === 'open' ? t('sales.registerOpen') : t('sales.registerClosed')}
                        </span>
                    </div>

                    <div className="mb-4">
                        <CategoryTabs
                            categories={categories}
                            selected={selectedCategory}
                            onSelect={setSelectedCategory}
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1">
                        <ProductGrid products={filteredProducts} viewMode={viewMode} onAdd={addToCart} />
                    </div>
                </div>

                <Cart
                    lines={cartLines}
                    subtotal={subtotal}
                    remise={remise}
                    total={total}
                    clients={clients}
                    selectedClientId={selectedClientId}
                    onClientChange={setSelectedClientId}
                    onIncrement={incrementItem}
                    onDecrement={decrementItem}
                    onRemove={removeItem}
                    onClear={clearCart}
                    onCheckout={handleCheckout}
                />
            </PosLayout>
        </>
    );
}
