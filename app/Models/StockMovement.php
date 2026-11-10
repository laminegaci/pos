<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    public const TYPE_INITIAL = 'initial';

    public const TYPE_SALE = 'sale';

    public const TYPE_ADJUSTMENT = 'adjustment';

    public const TYPE_RETURN = 'return';

    public const TYPE_CANCEL = 'cancel';

    public const TYPE_INVENTORY = 'inventory';

    public const TYPE_PURCHASE = 'purchase';

    /** Reasons for a manual adjustment, split by direction. */
    public const REASONS_OUT = ['casse', 'perte', 'vol', 'peremption', 'correction', 'autre'];

    public const REASONS_IN = ['reception', 'correction', 'autre'];

    protected $fillable = [
        'product_id', 'user_id', 'sale_id', 'reception_id', 'type', 'reason', 'quantity', 'stock_before', 'stock_after', 'note',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'stock_before' => 'integer',
            'stock_after' => 'integer',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function reception(): BelongsTo
    {
        return $this->belongsTo(Reception::class);
    }
}
