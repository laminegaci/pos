import { Head, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PosLayout from '../../Layouts/PosLayout';
import CategoryTabs from '../../Components/Sales/CategoryTabs';
import ProductGrid from '../../Components/Sales/ProductGrid';
import Cart from '../../Components/Sales/Cart';
import Toast from '../../Components/Toast';
import SaleConfirmationModal from '../../Components/Sales/SaleConfirmationModal';

const CART_STORAGE_KEY = 'pos.cart';
const NO_DISCOUNT = { type: 'amount', value: 0 };

function loadStoredCart() {
    try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && Array.isArray(parsed.items) ? parsed : null;
    } catch {
        return null;
    }
}

export default function SalesIndex({ caisse, categories, products, clients = [], printAuto = false, paperSize = '80mm' }) {
    const { t } = useTranslation();
    const { flash } = usePage().props;
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);

    const productsById = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

    // Cart state survives a page reload (kept in this browser only).
    const [stored] = useState(loadStoredCart);
    const [cartItems, setCartItems] = useState(() =>
        (stored?.items ?? []).filter((i) => productsById[i.productId] && i.quantity > 0),
    );
    const [selectedClientId, setSelectedClientId] = useState(() =>
        clients.some((c) => c.id === stored?.clientId) ? stored.clientId : null,
    );
    const [discount, setDiscount] = useState(() => stored?.discount ?? NO_DISCOUNT);

    useEffect(() => {
        try {
            if (cartItems.length === 0 && !selectedClientId) localStorage.removeItem(CART_STORAGE_KEY);
            else localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items: cartItems, clientId: selectedClientId, discount }));
        } catch {
            // storage unavailable: the cart simply isn't persisted
        }
    }, [cartItems, selectedClientId, discount]);

    // Snapshot of the cart taken at checkout, shown in the confirmation modal
    // (the cart itself is emptied once the sale is saved).
    const checkoutSnapshot = useRef(null);
    const [confirmation, setConfirmation] = useState(null);
    const closeConfirmation = useCallback(() => setConfirmation(null), []);

    useEffect(() => {
        if (flash?.sale) {
            setConfirmation({
                sale: flash.sale,
                lines: checkoutSnapshot.current?.lines ?? [],
                received: checkoutSnapshot.current?.received ?? null,
            });
            checkoutSnapshot.current = null;
        } else if (flash?.success) setToast({ message: flash.success, type: 'success' });
        else if (flash?.error) setToast({ message: flash.error, type: 'error' });
    }, [flash?.sale?.id, flash?.success, flash?.error]);

    const filteredProducts = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return products.filter((p) => {
            const matchesCat = selectedCategory === 'all' || p.category_id === selectedCategory;
            const matchesQuery = !q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
            return matchesCat && matchesQuery;
        });
    }, [products, selectedCategory, searchQuery]);

    const cartLines = useMemo(
        () =>
            cartItems
                .filter((item) => productsById[item.productId])
                .map((item) => {
                    const product = productsById[item.productId];
                    return {
                        id: product.id,
                        productId: item.productId,
                        name: product.name,
                        description: product.description,
                        category_id: product.category_id,
                        image: product.image,
                        stock: product.stock,
                        unitPrice: product.price,
                        quantity: item.quantity,
                        subtotal: product.price * item.quantity,
                    };
                }),
        [cartItems, productsById],
    );

    const subtotal = useMemo(() => cartLines.reduce((sum, l) => sum + l.subtotal, 0), [cartLines]);
    const discountValue = parseFloat(discount.value) || 0;
    const remise =
        subtotal === 0
            ? 0
            : Math.min(
                  subtotal,
                  Math.round((discount.type === 'percent' ? (subtotal * discountValue) / 100 : discountValue) * 100) / 100,
              );
    const total = Math.max(0, subtotal - remise);

    const stockOf = (productId) => {
        const stock = productsById[productId]?.stock;
        return stock == null ? Infinity : stock;
    };

    const warnStock = (productId) => {
        const product = productsById[productId];
        setToast({
            message: product?.stock > 0 ? t('cart.maxStockToast', { name: product.name, count: product.stock }) : t('cart.outOfStock', { name: product?.name }),
            type: 'error',
        });
    };

    const setQuantity = (productId, quantity) => {
        const max = stockOf(productId);
        const next = Math.max(0, Math.min(quantity, max));
        if (quantity > max) warnStock(productId);
        setCartItems((prev) => {
            if (next === 0) return prev.filter((i) => i.productId !== productId);
            if (prev.some((i) => i.productId === productId)) {
                return prev.map((i) => (i.productId === productId ? { ...i, quantity: next } : i));
            }
            return [...prev, { productId, quantity: next }];
        });
    };

    const addToCart = (productId) => {
        const current = cartItems.find((i) => i.productId === productId)?.quantity ?? 0;
        if (current + 1 > stockOf(productId)) return warnStock(productId);
        setQuantity(productId, current + 1);
    };

    const decrementItem = (productId) => {
        const current = cartItems.find((i) => i.productId === productId)?.quantity ?? 0;
        setQuantity(productId, current - 1);
    };

    const removeItem = (productId) => setCartItems((prev) => prev.filter((i) => i.productId !== productId));

    const clearCart = () => {
        setCartItems([]);
        setSelectedClientId(null);
        setDiscount(NO_DISCOUNT);
    };

    const handleCheckout = useCallback((payment = {}) => {
        if (cartLines.length === 0 || submitting) return;
        checkoutSnapshot.current = { lines: cartLines, received: payment.received || null };
        setSubmitting(true);
        router.post(
            '/ventes',
            {
                client_id: selectedClientId,
                remise,
                items: cartLines.map((l) => ({ product_id: l.productId, quantity: l.quantity })),
            },
            {
                preserveScroll: true,
                onSuccess: () => clearCart(),
                onError: () => setToast({ message: t('sales.checkoutFailed'), type: 'error' }),
                onFinish: () => setSubmitting(false),
            },
        );
    }, [cartLines, submitting, selectedClientId, remise, t]);

    return (
        <>
            <Head title={t('sales.sale')} />
            <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
            <SaleConfirmationModal
                sale={confirmation?.sale}
                lines={confirmation?.lines}
                received={confirmation?.received}
                autoPrint={printAuto}
                paperSize={paperSize}
                onClose={closeConfirmation}
            />
            <PosLayout searchQuery={searchQuery} onSearchChange={setSearchQuery}>
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
                    <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3 lg:mb-5">
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">{t('sales.sale')}</h1>
                        <span className="text-xs font-medium text-slate-500 sm:text-sm dark:text-slate-400">
                            {t('sales.register')} #{caisse.number}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
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
                    discount={discount}
                    onDiscountChange={setDiscount}
                    clients={clients}
                    selectedClientId={selectedClientId}
                    onClientChange={setSelectedClientId}
                    onIncrement={addToCart}
                    onDecrement={decrementItem}
                    onSetQuantity={setQuantity}
                    onRemove={removeItem}
                    onClear={clearCart}
                    onCheckout={handleCheckout}
                    submitting={submitting}
                />
            </PosLayout>
        </>
    );
}
