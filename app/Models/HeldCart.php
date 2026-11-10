<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HeldCart extends Model
{
    protected $fillable = ['user_id', 'client_id', 'label', 'items', 'discount', 'items_count', 'total'];

    protected function casts(): array
    {
        return [
            'items' => 'array',
            'discount' => 'array',
            'items_count' => 'integer',
            'total' => 'decimal:2',
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

    /** Held tickets only live for the day they were made. */
    public function scopeToday(Builder $query): Builder
    {
        return $query->whereDate('created_at', today()->toDateString());
    }

    public static function purgeExpired(): void
    {
        static::query()->whereDate('created_at', '<', today()->toDateString())->delete();
    }
}
