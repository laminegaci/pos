<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrder extends Model
{
    public const STATUS_DRAFT = 'draft';

    public const STATUS_ORDERED = 'ordered';

    public const STATUS_PARTIAL = 'partial';

    public const STATUS_RECEIVED = 'received';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'reference', 'supplier_id', 'status', 'user_id', 'ordered_at', 'expected_at',
        'total_ht', 'total_vat', 'total_ttc', 'note',
    ];

    protected function casts(): array
    {
        return [
            'ordered_at' => 'datetime',
            'expected_at' => 'date',
            'total_ht' => 'decimal:2',
            'total_vat' => 'decimal:2',
            'total_ttc' => 'decimal:2',
        ];
    }

    public static function referenceFor(int $id): string
    {
        return sprintf('BC-%d-%05d', now()->year, $id);
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isReceivable(): bool
    {
        return in_array($this->status, [self::STATUS_ORDERED, self::STATUS_PARTIAL], true);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function receptions(): HasMany
    {
        return $this->hasMany(Reception::class);
    }

    public function recalcTotals(): void
    {
        $ht = 0.0;
        $vat = 0.0;
        foreach ($this->items()->get() as $i) {
            $line = round($i->quantity_ordered * (float) $i->unit_cost, 2);
            $ht += $line;
            $vat += round($line * (float) $i->vat_rate / 100, 2);
        }
        $this->update(['total_ht' => round($ht, 2), 'total_vat' => round($vat, 2), 'total_ttc' => round($ht + $vat, 2)]);
    }

    public function refreshStatus(): void
    {
        $items = $this->items()->get();
        $received = $items->sum('quantity_received');
        $complete = $items->every(fn ($i) => $i->quantity_received >= $i->quantity_ordered);

        $this->update(['status' => $complete ? self::STATUS_RECEIVED : ($received > 0 ? self::STATUS_PARTIAL : self::STATUS_ORDERED)]);
    }
}
