<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProductMediaTest extends TestCase
{
    use DatabaseTransactions;

    private User $user;

    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        Storage::fake(Product::MEDIA_COLLECTION);

        $this->user = User::factory()->create();
        $this->category = Category::query()->firstOrCreate(
            ['slug' => 'media-test'],
            ['name' => 'Media test', 'color' => '#6366f1', 'sort_order' => 1],
        );
    }

    /** @param array<string, mixed> $overrides */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Produit '.uniqid(),
            'description' => null,
            'price' => 1190,
            'cost_price' => 500,
            'vat_rate' => 19,
            'category_id' => $this->category->slug,
            'stock' => 10,
            'unlimited_stock' => false,
            'active' => true,
        ], $overrides);
    }

    public function test_multiple_images_are_attached_with_conversions(): void
    {
        $payload = $this->payload([
            'images' => [
                UploadedFile::fake()->image('front.jpg', 800, 600),
                UploadedFile::fake()->image('side.png', 600, 800),
            ],
        ]);

        $this->actingAs($this->user)->post('/produits', $payload)->assertSessionHasNoErrors();

        $product = Product::query()->where('name', $payload['name'])->firstOrFail();
        $media = $product->getMedia(Product::MEDIA_COLLECTION);

        $this->assertCount(2, $media);
        $this->assertNotEmpty($product->image_url);
        $this->assertCount(2, $product->images);
        $this->assertTrue($product->images[0]['is_cover']);
        $this->assertSame($media->first()->id, $product->cover_media_id);

        foreach ($media as $item) {
            $disk = Storage::disk($item->disk);

            $this->assertTrue($item->hasGeneratedConversion('thumb'));
            $this->assertTrue($item->hasGeneratedConversion('preview'));
            $disk->assertExists($item->getPathRelativeToRoot());
            $disk->assertExists($item->getPathRelativeToRoot('thumb'));
            $disk->assertExists($item->getPathRelativeToRoot('preview'));
        }
    }

    public function test_invalid_and_oversized_images_are_rejected(): void
    {
        $this->actingAs($this->user)
            ->post('/produits', $this->payload(['images' => [UploadedFile::fake()->image('anim.gif')]]))
            ->assertSessionHasErrors('images.0');

        $this->actingAs($this->user)
            ->post('/produits', $this->payload(['images' => [UploadedFile::fake()->image('big.jpg')->size(Product::MEDIA_MAX_KB + 1)]]))
            ->assertSessionHasErrors('images.0');

        $tooMany = array_map(
            fn (int $i) => UploadedFile::fake()->image("image-{$i}.jpg"),
            range(1, Product::MEDIA_MAX_FILES + 1),
        );

        $this->actingAs($this->user)
            ->post('/produits', $this->payload(['images' => $tooMany]))
            ->assertSessionHasErrors('images');
    }

    public function test_update_adds_removes_and_reorders_images(): void
    {
        $createPayload = $this->payload([
            'images' => [
                UploadedFile::fake()->image('first.jpg', 800, 600),
                UploadedFile::fake()->image('second.jpg', 600, 800),
            ],
        ]);

        $this->actingAs($this->user)->post('/produits', $createPayload)->assertSessionHasNoErrors();

        $product = Product::query()->where('name', $createPayload['name'])->firstOrFail();
        $media = $product->getMedia(Product::MEDIA_COLLECTION);
        $first = $media[0];
        $second = $media[1];

        $updatePayload = $this->payload([
            '_method' => 'put',
            'images' => [UploadedFile::fake()->image('third.webp', 900, 900)],
            'remove_media' => [$first->id],
            'cover_media_id' => $second->id,
        ]);

        $this->actingAs($this->user)
            ->post("/produits/{$product->id}", $updatePayload)
            ->assertSessionHasNoErrors();

        $product->refresh();
        $remaining = $product->getMedia(Product::MEDIA_COLLECTION);

        $this->assertCount(2, $remaining);
        $this->assertDatabaseMissing('media', ['id' => $first->id]);
        $this->assertDatabaseHas('media', ['id' => $second->id]);
        $this->assertSame($second->id, $product->cover_media_id);
        Storage::disk($first->disk)->assertMissing($first->getPathRelativeToRoot());
    }

    public function test_legacy_image_can_be_displayed_and_removed(): void
    {
        Storage::disk('public')->put('products/legacy.jpg', 'legacy');

        $product = Product::query()->create($this->payload(['image' => '/storage/products/legacy.jpg']));

        $this->assertSame('/storage/products/legacy.jpg', $product->image_url);

        $this->actingAs($this->user)
            ->post("/produits/{$product->id}", $this->payload([
                '_method' => 'put',
                'remove_legacy_image' => true,
            ]))
            ->assertSessionHasNoErrors();

        $this->assertNull($product->fresh()->image);
        $this->assertNull($product->fresh()->image_url);
        Storage::disk('public')->assertMissing('products/legacy.jpg');
    }

    public function test_deleting_a_product_deletes_its_media_and_files(): void
    {
        $payload = $this->payload(['images' => [UploadedFile::fake()->image('front.jpg')]]);

        $this->actingAs($this->user)->post('/produits', $payload)->assertSessionHasNoErrors();

        $product = Product::query()->where('name', $payload['name'])->firstOrFail();
        $media = $product->getMedia(Product::MEDIA_COLLECTION)->firstOrFail();

        $this->actingAs($this->user)->delete("/produits/{$product->id}")->assertRedirect();

        $this->assertDatabaseMissing('media', ['id' => $media->id]);
        Storage::disk($media->disk)->assertMissing($media->getPathRelativeToRoot());
    }

    public function test_products_index_exposes_the_gallery(): void
    {
        $this->actingAs($this->user)
            ->post('/produits', $this->payload(['images' => [UploadedFile::fake()->image('front.jpg')]]))
            ->assertSessionHasNoErrors();

        $this->actingAs($this->user)->get('/produits')->assertInertia(
            fn (Assert $page) => $page
                ->has('products.0.images')
                ->has('products.0.image_url')
                ->has('products.0.cover_media_id')
        );
    }
}
