<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Category extends Model
{
    public const COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#f97316', '#14b8a6', '#ef4444', '#64748b'];

    protected $fillable = ['slug', 'name', 'color', 'sort_order'];

    /**
     * Categories as the front end consumes them, in display order.
     *
     * @return array<int, array{id: string, db_id: int, label: string, color: string}>
     */
    public static function options(): array
    {
        return static::query()->orderBy('sort_order')->orderBy('id')->get()
            ->map(fn (self $c) => ['id' => $c->slug, 'db_id' => $c->id, 'label' => $c->name, 'color' => $c->color])
            ->all();
    }

    /** A unique, stable key (what products.category_id stores) built from the name. */
    public static function uniqueSlug(string $name): string
    {
        $base = Str::slug($name, '_') ?: 'categorie';
        $slug = $base;
        for ($i = 2; static::query()->where('slug', $slug)->exists(); $i++) {
            $slug = $base.'_'.$i;
        }

        return $slug;
    }
}
