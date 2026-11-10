import { Head, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PosLayout from '../../Layouts/PosLayout';
import CategoryTabs from '../../Components/Sales/CategoryTabs';
import ProductGrid from '../../Components/Sales/ProductGrid';
import Cart from '../../Components/Sales/Cart';
import Toast from '../../Components/Toast';
import SaleConfirmationModal from '../../Components/Sales/SaleConfirmationModal';
import CreditLimitModal from '../../Components/Sales/CreditLimitModal';
import HoldDialog from '../../Components/Sales/HoldDialog';
import HeldCartsDrawer from '../../Components/Sales/HeldCartsDrawer';
import { sounds } from '../../lib/sounds';
import useBarcodeScanner from '../../hooks/useBarcodeScanner';

const CART_STORAGE_KEY = 'pos.cart';
const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.content;
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
    const { flash, heldCount = 0 } = usePage().props;
    const [selectedCategory, setSelectedCategory] = useState('all');
    // Products per category (active catalogue), shown on the chips.
    const categoryCounts = useMemo(() => {
        const counts = {};
        for (const p of products) counts[p.category_id] = (counts[p.category_id] ?? 0) + 1;
        return counts;
    }, [products]);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);
    // Credit limit exceeded: { payment, message, error } while a manager is asked to approve.
    const [limitPrompt, setLimitPrompt] = useState(null);
    // Held tickets: label prompt and list of today's tickets.
    const [holdOpen, setHoldOpen] = useState(false);
    const [heldOpen, setHeldOpen] = useState(false);
    const [holding, setHolding] = useState(false);

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
    // Credit note used to pay (part of) this sale: { code, balance, client }. Not persisted: its balance may change.
    const [creditNote, setCreditNote] = useState(null);

    useEffect(() => {
        try {
            if (cartItems.length === 0 && !selectedClientId) localStorage.removeItem(CART_STORAGE_KEY);
            else localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items: cartItems, clientId: selectedClientId, discount }));
        } catch {
            // storage unavailable: the cart simply isn't persisted
        }
        window.dispatchEvent(new Event('pos:cart')); // updates the sidebar badge
    }, [cartItems, selectedClientId, discount]);

    // Snapshot of the cart taken at checkout, shown in the confirmation modal
    // (the cart itself is emptied once the sale is saved).
    const checkoutSnapshot = useRef(null);
    const [confirmation, setConfirmation] = useState(null);
    const closeConfirmation = useCallback(() => setConfirmation(null), []);

    useEffect(() => {
        if (flash?.sale) {
            sounds.success();
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
                        // null = unlimited (no cap, no warning)
                        stock: product.unlimited_stock ? null : product.stock,
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
    // The credit note pays as much as it can, never more than the total. It is a payment, not a discount.
    const creditApplied = creditNote ? Math.min(creditNote.balance, total) : 0;
    const due = Math.max(0, Math.round((total - creditApplied) * 100) / 100);

    const stockOf = (productId) => {
        const product = productsById[productId];
        if (!product || product.unlimited_stock || product.stock == null) return Infinity;
        return product.stock;
    };

    const warnStock = (productId) => {
        const product = productsById[productId];
        sounds.error();
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
        sounds.add();
        setQuantity(productId, current + 1);
    };

    // Barcode reader: EAN-13 (or SKU) → straight into the cart.
    const productsByCode = useMemo(() => {
        const map = {};
        for (const p of products) {
            if (p.sku) map[String(p.sku).toLowerCase()] = p.id;
            if (p.barcode) map[p.barcode] = p.id;
        }
        return map;
    }, [products]);

    useBarcodeScanner(
        (code) => {
            const id = productsByCode[code] ?? productsByCode[code.toLowerCase()];
            if (!id) {
                sounds.error();
                setToast({ message: t('scan.notFound', { code }), type: 'error' });
                return;
            }
            addToCart(id);
        },
        { enabled: !confirmation && !submitting },
    );

    const decrementItem = (productId) => {
        const current = cartItems.find((i) => i.productId === productId)?.quantity ?? 0;
        sounds.remove();
        setQuantity(productId, current - 1);
    };

    const removeItem = (productId) => {
        sounds.remove();
        setCartItems((prev) => prev.filter((i) => i.productId !== productId));
    };

    const clearCart = () => {
        setCartItems([]);
        setSelectedClientId(null);
        setDiscount(NO_DISCOUNT);
        setCreditNote(null);
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
                ...(payment.paymentMethod ? { payment_method: payment.paymentMethod } : {}),
                ...(payment.deposit ? { deposit_amount: payment.deposit.amount, deposit_method: payment.deposit.method } : {}),
                ...(payment.approval ?? {}),
                ...(creditNote && creditApplied > 0 ? { credit_note_code: creditNote.code, credit_note_amount: creditApplied } : {}),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setLimitPrompt(null);
                    clearCart();
                },
                onError: (errors) => {
                    sounds.error();
                    // Over the customer's credit limit (or wrong manager credentials): ask a manager, then resend.
                    if (errors?.credit_limit || (payment.approval && errors?.approver_password)) {
                        setLimitPrompt((prev) => ({ payment: { ...payment, approval: undefined }, message: errors.credit_limit ?? prev?.message, error: payment.approval ? errors.approver_password : null }));
                        return;
                    }
                    // e.g. "Not enough stock for X": the server is the source of truth.
                    setToast({
                        message: errors?.items || errors?.payment_method || errors?.credit_note_code || errors?.credit_note_amount || t('sales.checkoutFailed'),
                        type: 'error',
                    });
                    // The balance may have changed on another till: ask for the code again to show the real one.
                    if (errors?.credit_note_code) setCreditNote(null);
                    // Stock may have changed on another till: refresh quantities.
                    router.reload({ only: ['products'] });
                },
                onFinish: () => setSubmitting(false),
            },
        );
    }, [cartLines, submitting, selectedClientId, remise, creditNote, creditApplied, t]);

    // Puts the current cart aside on the server (no stock reserved) and empties the till.
    const holdCart = useCallback(async (label = '') => {
        if (cartItems.length === 0) return false;
        setHolding(true);
        try {
            const res = await fetch('/ventes/attente', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrfToken() },
                body: JSON.stringify({
                    items: cartItems.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
                    client_id: selectedClientId,
                    discount: { type: discount.type, value: parseFloat(discount.value) || 0 },
                    label: label || null,
                }),
            });
            if (!res.ok) throw new Error(String(res.status));
            clearCart();
            setHoldOpen(false);
            setToast({ message: t('hold.held'), type: 'success' });
            router.reload({ only: ['heldCount'] });
            return true;
        } catch {
            sounds.error();
            setToast({ message: t('hold.holdError'), type: 'error' });
            return false;
        } finally {
            setHolding(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cartItems, selectedClientId, discount, t]);

    // Brings a held ticket back. The current cart, if any, is put aside first so nothing is lost.
    const resumeHeld = useCallback(async (id) => {
        if (cartItems.length > 0) {
            if (!window.confirm(t('hold.replaceConfirm'))) return;
            if (!(await holdCart(''))) return;
        }
        try {
            const res = await fetch(`/ventes/attente/${id}/reprendre`, {
                method: 'POST',
                headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrfToken() },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || t('hold.resumeError'));

            // Stock is not reserved: drop what can no longer be sold and cap to what is left.
            const changed = [];
            const items = [];
            for (const line of data.lines) {
                const product = productsById[line.product_id];
                if (!product || !line.active) {
                    changed.push(t('hold.lineDropped', { name: line.name ?? `#${line.product_id}` }));
                    continue;
                }
                const qty = line.available === null ? line.quantity : Math.min(line.quantity, line.available);
                if (qty <= 0) {
                    changed.push(t('hold.lineDropped', { name: product.name }));
                    continue;
                }
                if (qty < line.quantity) changed.push(t('hold.lineReduced', { name: product.name, qty }));
                items.push({ productId: line.product_id, quantity: qty });
            }

            setCartItems(items);
            setSelectedClientId(clients.some((c) => c.id === data.client_id) ? data.client_id : null);
            setDiscount(data.discount ?? NO_DISCOUNT);
            setCreditNote(null);
            setHeldOpen(false);
            setToast(
                changed.length
                    ? { message: `${t('hold.resumedWithChanges')} ${changed.join(' \u00b7 ')}`, type: 'error' }
                    : { message: t('hold.resumed'), type: 'success' },
            );
            router.reload({ only: ['heldCount'] });
        } catch (e) {
            sounds.error();
            setToast({ message: e.message || t('hold.resumeError'), type: 'error' });
        }
    }, [cartItems.length, holdCart, productsById, clients, t]);

    // F8 = put the ticket aside, Shift+F8 = list of held tickets.
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== 'F8') return;
            e.preventDefault();
            if (e.shiftKey) setHeldOpen(true);
            else if (cartItems.length > 0 && !submitting) setHoldOpen(true);
            else sounds.error();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [cartItems.length, submitting]);

    return (
        <>
            <Head title={t('sales.sale')} />
            <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
            {holdOpen && <HoldDialog busy={holding} onConfirm={holdCart} onCancel={() => setHoldOpen(false)} />}
            {heldOpen && (
                <HeldCartsDrawer
                    onResume={resumeHeld}
                    onClose={() => setHeldOpen(false)}
                    onChanged={() => router.reload({ only: ['heldCount'] })}
                />
            )}
            {limitPrompt && (
                <CreditLimitModal
                    message={limitPrompt.message}
                    error={limitPrompt.error}
                    busy={submitting}
                    onCancel={() => setLimitPrompt(null)}
                    onConfirm={(approval) => handleCheckout({ ...limitPrompt.payment, approval })}
                />
            )}
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
                            counts={categoryCounts}
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
                    creditNote={creditNote}
                    creditApplied={creditApplied}
                    due={due}
                    onCreditNoteChange={setCreditNote}
                    clients={clients}
                    selectedClientId={selectedClientId}
                    onClientChange={setSelectedClientId}
                    onIncrement={addToCart}
                    onDecrement={decrementItem}
                    onSetQuantity={setQuantity}
                    onRemove={removeItem}
                    onClear={() => {
                        sounds.remove();
                        clearCart();
                    }}
                    onCheckout={handleCheckout}
                    onHold={() => setHoldOpen(true)}
                    onOpenHeld={() => setHeldOpen(true)}
                    heldCount={heldCount}
                    submitting={submitting}
                />
            </PosLayout>
        </>
    );
}
