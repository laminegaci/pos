import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { sounds } from '../../lib/sounds';

/**
 * The ticket in progress, shared by every page: the cart is shown next to all of them.
 * Mounted once at the root (app.jsx), so it survives Inertia navigation. It must not use
 * usePage(): it sits outside the Inertia context. The cart itself is persisted in this browser.
 */

const CART_STORAGE_KEY = 'pos.cart';
const NO_DISCOUNT = { type: 'amount', value: 0 };
const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.content;

const CartContext = createContext(null);

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
    return ctx;
}

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

const EMPTY_CATALOG = { loaded: false, products: [], clients: [], printAuto: false, paperSize: '80mm' };

export default function CartProvider({ children }) {
    const { t } = useTranslation();

    // Products and credit clients: sent by the till page, fetched on demand everywhere else.
    const [catalog, setCatalogState] = useState(EMPTY_CATALOG);
    const catalogRequested = useRef(false);

    const setCatalog = useCallback((data) => setCatalogState((prev) => ({ ...prev, ...data, loaded: true })), []);

    const refreshCatalog = useCallback(async () => {
        try {
            const res = await fetch('/panier/catalogue', {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });
            if (!res.ok) throw new Error(String(res.status));
            setCatalog(await res.json());
        } catch {
            catalogRequested.current = false; // allow another attempt
        }
    }, [setCatalog]);

    const ensureCatalog = useCallback(() => {
        if (catalogRequested.current) return;
        catalogRequested.current = true;
        refreshCatalog();
    }, [refreshCatalog]);

    const productsById = useMemo(() => Object.fromEntries(catalog.products.map((p) => [p.id, p])), [catalog.products]);

    const [stored] = useState(loadStoredCart);
    const [cartItems, setCartItems] = useState(() => (stored?.items ?? []).filter((i) => i.quantity > 0));
    const [selectedClientId, setSelectedClientId] = useState(() => stored?.clientId ?? null);
    const [discount, setDiscount] = useState(() => stored?.discount ?? NO_DISCOUNT);
    // Credit note used to pay (part of) this sale: { code, balance, client }. Not persisted: its balance may change.
    const [creditNote, setCreditNote] = useState(null);

    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);
    // Credit limit exceeded: { payment, message, error } while a manager is asked to approve.
    const [limitPrompt, setLimitPrompt] = useState(null);
    // Held tickets: label prompt and list of today's tickets.
    const [holdOpen, setHoldOpen] = useState(false);
    const [heldOpen, setHeldOpen] = useState(false);
    const [holding, setHolding] = useState(false);
    // Snapshot of the cart taken at checkout, shown in the confirmation modal
    // (the cart itself is emptied once the sale is saved).
    const checkoutSnapshot = useRef(null);
    const [confirmation, setConfirmation] = useState(null);

    // Once the catalogue is known, drop what no longer exists (deleted product or client).
    useEffect(() => {
        if (!catalog.loaded) return;
        setCartItems((prev) => {
            const kept = prev.filter((i) => productsById[i.productId]);
            return kept.length === prev.length ? prev : kept;
        });
        setSelectedClientId((prev) => (prev == null || catalog.clients.some((c) => c.id === prev) ? prev : null));
    }, [catalog.loaded, catalog.clients, productsById]);

    useEffect(() => {
        try {
            if (cartItems.length === 0 && !selectedClientId) localStorage.removeItem(CART_STORAGE_KEY);
            else localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items: cartItems, clientId: selectedClientId, discount }));
        } catch {
            // storage unavailable: the cart simply isn't persisted
        }
        window.dispatchEvent(new Event('pos:cart')); // updates the sidebar badge
    }, [cartItems, selectedClientId, discount]);

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
                    refreshCatalog(); // stock and customer balances changed
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
                    refreshCatalog();
                },
                onFinish: () => setSubmitting(false),
            },
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cartLines, submitting, selectedClientId, remise, creditNote, creditApplied, refreshCatalog, t]);

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
            setSelectedClientId(catalog.clients.some((c) => c.id === data.client_id) ? data.client_id : null);
            setDiscount(data.discount ?? NO_DISCOUNT);
            setCreditNote(null);
            setHeldOpen(false);
            setToast(
                changed.length
                    ? { message: `${t('hold.resumedWithChanges')} ${changed.join(' · ')}`, type: 'error' }
                    : { message: t('hold.resumed'), type: 'success' },
            );
            router.reload({ only: ['heldCount'] });
        } catch (e) {
            sounds.error();
            setToast({ message: e.message || t('hold.resumeError'), type: 'error' });
        }
    }, [cartItems.length, holdCart, productsById, catalog.clients, t]);

    const value = {
        catalog, setCatalog, ensureCatalog, refreshCatalog,
        cartItems, cartLines, subtotal, remise, total, discount, setDiscount,
        creditNote, setCreditNote, creditApplied, due,
        selectedClientId, setSelectedClientId,
        addToCart, setQuantity, decrementItem, removeItem, clearCart,
        submitting, handleCheckout, checkoutSnapshot,
        limitPrompt, setLimitPrompt,
        holdOpen, setHoldOpen, heldOpen, setHeldOpen, holding, holdCart, resumeHeld,
        toast, setToast, confirmation, setConfirmation,
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
