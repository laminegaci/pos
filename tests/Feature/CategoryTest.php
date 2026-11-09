<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class CategoryTest extends TestCase
{
    use DatabaseTransactions;

    private function user(): User
    {
        return User::factory()->create();
    }

    public function test_products_page_lists_categories_with_counts(): void
    {
        $this->actingAs($this->user())->get('/produits')
            ->assertInertia(fn ($page) => $page
                ->component('Products/Index')
                ->has('categories.0', fn ($c) => $c->hasAll(['id', 'db_id', 'label', 'color', 'products_count'])));
    }

    public function test_create_generates_a_unique_slug(): void
    {
        $user = $this->actingAs($this->user());

        $user->post('/categories', ['name' => 'Chaises Gamer'])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('categories', ['slug' => 'chaises_gamer', 'name' => 'Chaises Gamer']);

        // Same slug base from a different name: gets a suffix instead of colliding.
        $user->post('/categories', ['name' => 'Chaises-Gamer'])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('categories', ['slug' => 'chaises_gamer_2']);
    }

    public function test_duplicate_name_is_rejected(): void
    {
        $this->actingAs($this->user())
            ->post('/categories', ['name' => 'Bureaux'])
            ->assertSessionHasErrorsIn('category', 'name');
    }

    public function test_rename_keeps_the_slug_so_products_stay_linked(): void
    {
        $category = Category::query()->where('slug', 'bureaux')->firstOrFail();

        $this->actingAs($this->user())
            ->put("/categories/{$category->id}", ['name' => 'Grands bureaux', 'color' => '#ef4444'])
            ->assertSessionHasNoErrors();

        $category->refresh();
        $this->assertSame('bureaux', $category->slug);
        $this->assertSame('Grands bureaux', $category->name);
        $this->assertSame('#ef4444', $category->color);
    }

    public function test_cannot_delete_a_category_used_by_products(): void
    {
        $category = Category::query()->create(['slug' => 'temp_used', 'name' => 'Temp used']);
        Product::query()->create([
            'name' => 'P', 'description' => 'd', 'price' => 10, 'category_id' => 'temp_used',
            'stock' => 1, 'sku' => 'CAT-'.uniqid(), 'active' => true,
        ]);

        $this->actingAs($this->user())->delete("/categories/{$category->id}")
            ->assertSessionHasErrorsIn('category', 'category');
        $this->assertDatabaseHas('categories', ['id' => $category->id]);
    }

    public function test_empty_category_can_be_deleted(): void
    {
        $category = Category::query()->create(['slug' => 'temp_empty', 'name' => 'Temp empty']);

        $this->actingAs($this->user())->delete("/categories/{$category->id}")->assertSessionHasNoErrors();
        $this->assertDatabaseMissing('categories', ['id' => $category->id]);
    }

    public function test_product_must_use_an_existing_category(): void
    {
        $this->actingAs($this->user())->post('/produits', [
            'name' => 'X', 'price' => 10, 'category_id' => 'does_not_exist', 'stock' => 1,
        ])->assertSessionHasErrors('category_id');
    }

    public function test_guest_cannot_manage_categories(): void
    {
        $this->post('/categories', ['name' => 'Nope'])->assertRedirect();
        $this->assertDatabaseMissing('categories', ['name' => 'Nope']);
    }
}
