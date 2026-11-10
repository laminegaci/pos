<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    use HasFactory;

    /** SQL: what is still owed on a credit ticket (rounded: SQLite stores decimals loosely). */
    public const OUTSTANDING_SQL = 'ROUND(credit_amount - credit_returned - credit_paid, 2)';

    protected $fillable = [
        'name',
        'email',
        'phone',
        'address',
        'city',
        'type',
        'notes',
        'active',
        'credit_limit',
        'payment_terms_days',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'credit_limit' => 'decimal:2',
            'payment_terms_days' => 'integer',
        ];
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(ClientPayment::class);
    }

    /** Completed tickets that put something on the account. */
    public function creditSales(): HasMany
    {
        return $this->sales()->where('status', Sale::STATUS_COMPLETED)->where('credit_amount', '>', 0);
    }

    /** Adds credit_balance and overdue_amount (computed, never stored, so they cannot drift). */
    public function scopeWithBalance(Builder $query): Builder
    {
        $base = fn () => Sale::query()
            ->whereColumn('client_id', 'clients.id')
            ->where('status', Sale::STATUS_COMPLETED);

        return $query->select('clients.*')->addSelect([
            'credit_balance' => $base()->selectRaw('COALESCE(SUM('.self::OUTSTANDING_SQL.'), 0)'),
            'overdue_amount' => $base()->whereDate('due_at', '<', now()->toDateString())
                ->selectRaw('COALESCE(SUM('.self::OUTSTANDING_SQL.'), 0)'),
            'oldest_due_at' => $base()->whereRaw(self::OUTSTANDING_SQL.' > 0')->selectRaw('MIN(due_at)'),
        ]);
    }

    public function balance(): float
    {
        return round((float) $this->creditSales()->selectRaw('COALESCE(SUM('.self::OUTSTANDING_SQL.'), 0) as b')->value('b'), 2);
    }

    public function overdueAmount(): float
    {
        return round((float) $this->creditSales()
            ->whereDate('due_at', '<', now()->toDateString())
            ->selectRaw('COALESCE(SUM('.self::OUTSTANDING_SQL.'), 0) as b')->value('b'), 2);
    }

    /** Null when the customer has no limit. */
    public function availableCredit(): ?float
    {
        return $this->credit_limit === null ? null : round((float) $this->credit_limit - $this->balance(), 2);
    }
}
