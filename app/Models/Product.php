<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

    /** VAT rates accepted for a product (Algeria). */
    public const VAT_RATES = [0, 9, 19];

    private static ?int $defaultMinStock = null;

    protected $appends = ['price_ht', 'margin', 'margin_rate', 'effective_min_stock', 'stock_status'];

    protected $fillable = [
        'name',
        'description',
        'price',
        'cost_price',
        'vat_rate',
        'category_id',
        'image',
        'stock',
        'unlimited_stock',
        'min_stock',
        'sku',
        'barcode',
        'active',
    ];

    /** Selling price excluding VAT (price is stored VAT-inclusive). */
    public function getPriceHtAttribute(): float
    {
        return round((float) $this->price / (1 + (float) $this->vat_rate / 100), 2);
    }

    /** Unit margin (HT price - purchase cost); null when the cost is unknown. */
    public function getMarginAttribute(): ?float
    {
        return $this->cost_price === null ? null : round($this->price_ht - (float) $this->cost_price, 2);
    }

    /** Margin as a share of the HT price, in percent. */
    public function getMarginRateAttribute(): ?float
    {
        return $this->margin === null || $this->price_ht <= 0 ? null : round($this->margin / $this->price_ht * 100, 1);
    }

    /** Alert threshold: the product's own minimum, else the shop-wide default. */
    public function getEffectiveMinStockAttribute(): int
    {
        return (int) ($this->min_stock ?? self::defaultMinStock());
    }

    /** out | low | ok | unlimited — the single definition of a stock level. */
    public function getStockStatusAttribute(): string
    {
        if ($this->unlimited_stock) {
            return 'unlimited';
        }
        if ($this->stock <= 0) {
            return 'out';
        }

        return $this->stock <= $this->effective_min_stock ? 'low' : 'ok';
    }

    /** Shop-wide default threshold, memoised per request. */
    public static function defaultMinStock(): int
    {
        return self::$defaultMinStock ??= (int) Settings::current()->low_stock_threshold;
    }

    /** Forget the memoised default (called when settings change). */
    public static function flushDefaultMinStock(): void
    {
        self::$defaultMinStock = null;
    }

    /** Active, limited-stock products at or under their threshold (out of stock included). */
    public function scopeLowStock($query)
    {
        return $query->where('active', true)
            ->where('unlimited_stock', false)
            ->whereRaw('stock <= COALESCE(min_stock, ?)', [self::defaultMinStock()]);
    }

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'cost_price' => 'decimal:2',
            'vat_rate' => 'decimal:2',
            'stock' => 'integer',
            'min_stock' => 'integer',
            'unlimited_stock' => 'boolean',
            'active' => 'boolean',
        ];
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }
}
