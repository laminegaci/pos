<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Reception extends Model
{
    protected $fillable = [
        'reference', 'supplier_id', 'purchase_order_id', 'user_id', 'received_at',
        'supplier_invoice_ref', 'total_ht', 'total_vat', 'total_ttc', 'note',
    ];

    protected function casts(): array
    {
        return [
            'received_at' => 'datetime',
            'total_ht' => 'decimal:2',
            'total_vat' => 'decimal:2',
            'total_ttc' => 'decimal:2',
        ];
    }

    public static function referenceFor(int $id): string
    {
        return sprintf('REC-%d-%05d', now()->year, $id);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(ReceptionItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SupplierPayment::class);
    }
}
