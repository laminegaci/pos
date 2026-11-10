<?php

return [
    'insufficient' => 'Stock insuffisant pour « :name » : :available disponible(s), :requested demandé(s).',
    'inactive' => '« :name » n’est plus en vente.',
    'negative' => 'Le stock ne peut pas être négatif (stock actuel : :available).',
    'types' => [
        'initial' => 'Stock initial',
        'sale' => 'Vente',
        'adjustment' => 'Ajustement',
        'return' => 'Retour',
        'cancel' => 'Annulation de vente',
        'inventory' => 'Inventaire',
        'purchase' => 'Achat',
    ],
    'reasons' => [
        'casse' => 'Casse',
        'perte' => 'Perte',
        'vol' => 'Vol',
        'peremption' => 'Péremption',
        'reception' => 'Réception',
        'correction' => 'Correction',
        'autre' => 'Autre',
    ],
    'adjusted' => 'Stock ajusté.',
    'unlimited' => 'Ce produit a un stock illimité.',
    'reason_direction' => 'Ce motif ne correspond pas au sens de l’ajustement.',
    'inventory_open' => 'Un inventaire est déjà en cours.',
    'inventory_closed' => 'Cet inventaire n’est plus modifiable.',
    'inventory_empty' => 'Aucun produit à inventorier.',
];
