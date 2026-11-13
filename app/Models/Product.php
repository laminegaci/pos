<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Image\Enums\Fit;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class Product extends Model implements HasMedia
{
    use HasFactory, InteractsWithMedia;

    /** VAT rates accepted for a product (Algeria). */
    public const VAT_RATES = [0, 9, 19];

    /** Product images are stored through Spatie Media Library. */
    public const MEDIA_COLLECTION = 'product_images';

    public const MEDIA_MAX_FILES = 6;

    /** Maximum size of one uploaded image, in kilobytes. */
    public const MEDIA_MAX_KB = 10240;

    /** @var list<string> */
    public const MEDIA_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    private static ?int $defaultMinStock = null;

    protected $appends = ['price_ht', 'margin', 'margin_rate', 'effective_min_stock', 'stock_status'];

    /** The media relation is only used to build the `images` payload. */
    protected $hidden = ['media'];

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

    /** Public URL of the cover image (media first, then the legacy `image` column). */
    public function getImageUrlAttribute(): ?string
    {
        $url = $this->getFirstMediaUrl(self::MEDIA_COLLECTION, 'thumb');
        if ($url !== '') {
            return $url;
        }

        $legacy = $this->attributes['image'] ?? null;

        return is_string($legacy) && $legacy !== '' && (
            str_starts_with($legacy, '/storage/')
            || str_starts_with($legacy, 'http://')
            || str_starts_with($legacy, 'https://')
        ) ? $legacy : null;
    }

    /**
     * All images of the collection, ready for the product form.
     *
     * @return list<array<string, mixed>>
     */
    public function getImagesAttribute(): array
    {
        return $this->getMedia(self::MEDIA_COLLECTION)
            ->values()
            ->map(fn (Media $media, int $index) => [
                'id' => (int) $media->id,
                'url' => $media->getUrl(),
                'thumb_url' => $media->getAvailableUrl(['thumb']),
                'preview_url' => $media->getAvailableUrl(['preview', 'thumb']),
                'name' => $media->file_name,
                'size' => (int) $media->size,
                'mime_type' => $media->mime_type,
                'is_cover' => $index === 0,
            ])
            ->all();
    }

    public function getCoverMediaIdAttribute(): ?int
    {
        $id = $this->getFirstMedia(self::MEDIA_COLLECTION)?->getKey();

        return $id === null ? null : (int) $id;
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection(self::MEDIA_COLLECTION)
            ->useDisk(self::MEDIA_COLLECTION)
            ->acceptsMimeTypes(self::MEDIA_MIME_TYPES);
    }

    public function registerMediaConversions(?Media $media = null): void
    {
        $this->addMediaConversion('thumb')
            ->performOnCollections(self::MEDIA_COLLECTION)
            ->fit(Fit::Crop, 400, 400)
            ->format('webp')
            ->quality(80)
            ->nonQueued();

        $this->addMediaConversion('preview')
            ->performOnCollections(self::MEDIA_COLLECTION)
            ->fit(Fit::Max, 1200, 1200)
            ->format('webp')
            ->quality(85)
            ->nonQueued();
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
