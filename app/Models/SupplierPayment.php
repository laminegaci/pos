<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierPayment extends Model
{
    public const METHODS = ['cash', 'card', 'transfer', 'cheque'];

    protected $fillable = ['supplier_id', 'reception_id', 'amount', 'method', 'paid_at', 'reference', 'user_id', 'note'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'paid_at' => 'datetime'];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function reception(): BelongsTo
    {
        return $this->belongsTo(Reception::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
