<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReceptionItem extends Model
{
    protected $fillable = [
        'reception_id', 'purchase_order_item_id', 'product_id', 'quantity', 'unit_cost', 'vat_rate', 'cost_before', 'cost_after',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_cost' => 'decimal:2',
            'vat_rate' => 'decimal:2',
            'cost_before' => 'decimal:2',
            'cost_after' => 'decimal:2',
        ];
    }

    public function reception(): BelongsTo
    {
        return $this->belongsTo(Reception::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
