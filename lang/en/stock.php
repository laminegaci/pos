<?php

return [
    'insufficient' => 'Not enough stock for ":name": :available available, :requested requested.',
    'inactive' => '":name" is no longer on sale.',
    'negative' => 'Stock cannot be negative (current stock: :available).',
    'types' => [
        'initial' => 'Initial stock',
        'sale' => 'Sale',
        'adjustment' => 'Adjustment',
        'return' => 'Return',
        'cancel' => 'Sale cancellation',
        'inventory' => 'Inventory',
        'purchase' => 'Purchase',
    ],
    'reasons' => [
        'casse' => 'Breakage',
        'perte' => 'Loss',
        'vol' => 'Theft',
        'peremption' => 'Expiry',
        'reception' => 'Goods received',
        'correction' => 'Correction',
        'autre' => 'Other',
    ],
    'adjusted' => 'Stock adjusted.',
    'unlimited' => 'This product has unlimited stock.',
    'reason_direction' => 'This reason does not match the adjustment direction.',
    'inventory_open' => 'An inventory is already in progress.',
    'inventory_closed' => 'This inventory can no longer be modified.',
    'inventory_empty' => 'No product to count.',
];
