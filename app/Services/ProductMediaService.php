<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Product;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * Keeps the product_images media collection in sync with the product form.
 */
class ProductMediaService
{
    /**
     * @param  array<int, UploadedFile>  $files
     * @param  array<int, int|string>  $removeIds
     */
    public function sync(
        Product $product,
        array $files = [],
        array $removeIds = [],
        ?int $coverId = null,
        bool $removeLegacy = false,
    ): void {
        $this->remove($product, $removeIds);

        foreach ($files as $file) {
            if ($file instanceof UploadedFile) {
                $product->addMedia($file)->toMediaCollection(Product::MEDIA_COLLECTION);
            }
        }

        if ($removeLegacy) {
            $this->deleteLegacyImage($product);
        }

        if ($coverId !== null) {
            $this->setCover($product, $coverId);
        }

        $product->unsetRelation('media');
    }

    /**
     * @param  array<int, int|string>  $mediaIds
     */
    public function remove(Product $product, array $mediaIds): void
    {
        if ($mediaIds === []) {
            return;
        }

        $product->getMedia(Product::MEDIA_COLLECTION)
            ->whereIn('id', array_map('intval', $mediaIds))
            ->each(fn (Media $media) => $media->delete());

        $product->unsetRelation('media');
    }

    /** Move the chosen media to the front: the first image is the cover. */
    public function setCover(Product $product, int $mediaId): void
    {
        $product->unsetRelation('media');

        $media = $product->getMedia(Product::MEDIA_COLLECTION);
        if (! $media->contains(fn (Media $item) => (int) $item->id === $mediaId)) {
            return;
        }

        $orderedIds = $media
            ->sortBy('order_column')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        Media::setNewOrder(array_values(array_unique([$mediaId, ...$orderedIds])));

        $product->unsetRelation('media');
    }

    /** Remove the legacy single image (`products.image`) and its file, if any. */
    public function deleteLegacyImage(Product $product): void
    {
        $legacy = $product->getRawOriginal('image');

        if (is_string($legacy) && $legacy !== '') {
            $path = parse_url($legacy, PHP_URL_PATH);
            $path = is_string($path) && $path !== '' ? $path : $legacy;

            if (str_starts_with($path, '/storage/')) {
                Storage::disk('public')->delete(Str::after($path, '/storage/'));
            }
        }

        if ($legacy !== null) {
            $product->forceFill(['image' => null])->save();
        }
    }
}
