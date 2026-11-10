<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    protected $fillable = [
        'name', 'contact_name', 'phone', 'email', 'address', 'tax_id', 'rc', 'payment_terms_days', 'note', 'active',
    ];

    protected function casts(): array
    {
        return ['active' => 'boolean', 'payment_terms_days' => 'integer'];
    }

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class);
    }

    public function receptions(): HasMany
    {
        return $this->hasMany(Reception::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SupplierPayment::class);
    }

    /** Adds receptions_sum_total_ttc and payments_sum_amount (balance is computed, never stored). */
    public function scopeWithBalance(Builder $query): Builder
    {
        return $query->withSum('receptions', 'total_ttc')->withSum('payments', 'amount');
    }

    /** Amount owed to the supplier: received (TTC) minus paid. */
    public function balance(): float
    {
        return round((float) $this->receptions()->sum('total_ttc') - (float) $this->payments()->sum('amount'), 2);
    }

    /** Balance from the withBalance() aggregates (no extra query). */
    public function balanceFromSums(): float
    {
        return round((float) ($this->receptions_sum_total_ttc ?? 0) - (float) ($this->payments_sum_amount ?? 0), 2);
    }

    public function hasHistory(): bool
    {
        return $this->purchaseOrders()->exists() || $this->receptions()->exists() || $this->payments()->exists();
    }
}
