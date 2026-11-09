<?php

return [
    'approval_required' => 'A manager approval is required.',
    'approval_invalid' => 'Invalid manager credentials.',
    'approval_throttled' => 'Too many attempts. Try again in :seconds s.',
    'already_cancelled' => 'This sale is already cancelled.',
    'cancel_not_today' => 'A ticket can only be cancelled on the day of the sale. Make a return instead.',
    'cancel_has_returns' => 'This ticket already has a return: it can no longer be cancelled.',
    'return_cancelled' => 'This sale is cancelled: no return possible.',
    'return_nothing' => 'Select at least one item to return.',
    'return_unknown_item' => 'Unknown item for this sale.',
    'return_exceeds' => 'Quantity too high for ":name": :remaining left to return.',
    'credit_not_found' => 'Credit note not found.',
    'credit_insufficient' => 'Credit note balance too low (:balance available).',
    'credit_exceeds_total' => 'The credit note amount exceeds the sale total.',
    'cancelled_ok' => 'Sale #:id cancelled.',
    'returned_ok' => 'Return saved: :amount refunded.',
    'stock_note_cancel' => 'Cancellation of sale #:id',
    'stock_note_return' => 'Return on sale #:id',
    'role_self' => 'You cannot change your own role.',
    'role_last_admin' => 'At least one administrator must remain.',
    'role_updated' => 'Role of :name updated.',
];
