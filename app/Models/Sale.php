<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    use HasFactory;

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

    public const PAYMENT_CASH = 'cash';

    public const PAYMENT_CARD = 'card';

    public const PAYMENT_CREDIT = 'credit';

    public const PAYMENT_METHODS = [self::PAYMENT_CASH, self::PAYMENT_CARD, self::PAYMENT_CREDIT];

    protected $fillable = [
        'user_id',
        'client_id',
        'subtotal',
        'remise',
        'total',
        'status',
        'credit_note_amount',
        'payment_method',
        'cancelled_at',
        'cancelled_by',
        'cancel_approved_by',
        'cancel_reason',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'remise' => 'decimal:2',
            'total' => 'decimal:2',
            'credit_note_amount' => 'decimal:2',
            'cancelled_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function returns(): HasMany
    {
        return $this->hasMany(SaleReturn::class);
    }

    public function creditNoteUses(): HasMany
    {
        return $this->hasMany(CreditNoteUse::class);
    }

    public function canceller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function cancelApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancel_approved_by');
    }

    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }

    /** A whole ticket can only be cancelled the day it was made, and only if nothing was returned yet. */
    public function canBeCancelled(): bool
    {
        return ! $this->isCancelled()
            && $this->created_at !== null
            && $this->created_at->isToday()
            && ! $this->returns()->exists();
    }

    /** Total already refunded through returns. */
    public function refundedAmount(): float
    {
        return round((float) $this->returns()->sum('amount'), 2);
    }
}
