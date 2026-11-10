<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryLine extends Model
{
    protected $fillable = ['inventory_id', 'product_id', 'expected_qty', 'counted_qty', 'unit_cost', 'counted_by', 'counted_at'];

    protected $appends = ['gap', 'gap_value'];

    protected function casts(): array
    {
        return [
            'expected_qty' => 'integer',
            'counted_qty' => 'integer',
            'unit_cost' => 'decimal:2',
            'counted_at' => 'datetime',
        ];
    }

    /** counted - expected; null while the line is not counted. */
    public function getGapAttribute(): ?int
    {
        return $this->counted_qty === null ? null : $this->counted_qty - $this->expected_qty;
    }

    /** Gap valued at the cost frozen when the inventory started. */
    public function getGapValueAttribute(): ?float
    {
        return $this->gap === null ? null : round($this->gap * (float) $this->unit_cost, 2);
    }

    public function inventory(): BelongsTo
    {
        return $this->belongsTo(Inventory::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
