<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CreditNote extends Model
{
    protected $fillable = ['code', 'client_id', 'sale_return_id', 'amount', 'balance'];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'balance' => 'decimal:2',
        ];
    }

    /** "AV-000123" from the row id. */
    public static function codeFor(int $id): string
    {
        return 'AV-'.str_pad((string) $id, 6, '0', STR_PAD_LEFT);
    }

    /** Accepts "av-12", "AV-000012", " 12 "… and returns the canonical code (or null). */
    public static function normalizeCode(string $input): ?string
    {
        if (! preg_match('/^(?:AV-?)?0*(\d+)$/i', trim($input), $m)) {
            return null;
        }

        return self::codeFor((int) $m[1]);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function saleReturn(): BelongsTo
    {
        return $this->belongsTo(SaleReturn::class);
    }

    public function uses(): HasMany
    {
        return $this->hasMany(CreditNoteUse::class);
    }
}
