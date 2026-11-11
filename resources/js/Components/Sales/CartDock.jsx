import { router, usePage } from '@inertiajs/react';
import { useCallback, useEffect } from 'react';
import { sounds } from '../../lib/sounds';
import Toast from '../Toast';
import Cart from './Cart';
import CreditLimitModal from './CreditLimitModal';
import HeldCartsDrawer from './HeldCartsDrawer';
import HoldDialog from './HoldDialog';
import { useCart } from './CartProvider';
import SaleConfirmationModal from './SaleConfirmationModal';

/** The cart and everything tied to it (checkout modals, held tickets), shown beside every page. */
export default function CartDock() {
    const { flash, heldCount = 0 } = usePage().props;
    const c = useCart();
    const { ensureCatalog, setConfirmation, checkoutSnapshot, cartItems, submitting, setHoldOpen, setHeldOpen } = c;

    useEffect(() => {
        ensureCatalog();
    }, [ensureCatalog]);

    // A sale was just saved (the redirect carries it): show the confirmation and the receipt.
    useEffect(() => {
        if (!flash?.sale) return;
        sounds.success();
        setConfirmation({
            sale: flash.sale,
            lines: checkoutSnapshot.current?.lines ?? [],
            received: checkoutSnapshot.current?.received ?? null,
        });
        checkoutSnapshot.current = null;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flash?.sale?.id]);

    const closeConfirmation = useCallback(() => setConfirmation(null), [setConfirmation]);

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
    }, [cartItems.length, submitting, setHoldOpen, setHeldOpen]);

    return (
        <>
            <Toast message={c.toast?.message} type={c.toast?.type} onClose={() => c.setToast(null)} />
            {c.holdOpen && <HoldDialog busy={c.holding} onConfirm={c.holdCart} onCancel={() => c.setHoldOpen(false)} />}
            {c.heldOpen && (
                <HeldCartsDrawer
                    onResume={c.resumeHeld}
                    onClose={() => c.setHeldOpen(false)}
                    onChanged={() => router.reload({ only: ['heldCount'] })}
                />
            )}
            {c.limitPrompt && (
                <CreditLimitModal
                    message={c.limitPrompt.message}
                    error={c.limitPrompt.error}
                    busy={c.submitting}
                    onCancel={() => c.setLimitPrompt(null)}
                    onConfirm={(approval) => c.handleCheckout({ ...c.limitPrompt.payment, approval })}
                />
            )}
            <SaleConfirmationModal
                sale={c.confirmation?.sale}
                lines={c.confirmation?.lines}
                received={c.confirmation?.received}
                autoPrint={c.catalog.printAuto}
                paperSize={c.catalog.paperSize}
                onClose={closeConfirmation}
            />
            <Cart
                lines={c.cartLines}
                subtotal={c.subtotal}
                remise={c.remise}
                total={c.total}
                discount={c.discount}
                onDiscountChange={c.setDiscount}
                creditNote={c.creditNote}
                creditApplied={c.creditApplied}
                due={c.due}
                onCreditNoteChange={c.setCreditNote}
                clients={c.catalog.clients}
                selectedClientId={c.selectedClientId}
                onClientChange={c.setSelectedClientId}
                onIncrement={c.addToCart}
                onDecrement={c.decrementItem}
                onSetQuantity={c.setQuantity}
                onRemove={c.removeItem}
                onClear={() => {
                    sounds.remove();
                    c.clearCart();
                }}
                onCheckout={c.handleCheckout}
                onHold={() => c.setHoldOpen(true)}
                onOpenHeld={() => c.setHeldOpen(true)}
                heldCount={heldCount}
                submitting={c.submitting}
            />
        </>
    );
}
