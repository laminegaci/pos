<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Imports the Sada Luxe catalog (MySQL dump) into the POS database.
 *
 * Source mapping:
 *  - `shop_products`         -> products (price, qty = stock, is_visible = active)
 *  - `shop_category_product` -> first category linked to the shop product
 *  - `product-images/<id>/`  -> copied to the POS public disk (`/storage/...` URL)
 *
 * Idempotent: shop products are keyed on the generated SKU "SADL-<shop_id>",
 * categories on their slug; images are only copied once.
 *
 * Usage: php artisan db:seed --class=SAdaluxeProductSeeder
 */
class SAdaluxeProductSeeder extends Seeder
{
    /** Default paths; both can be overridden via the constructor. */
    private const SQL_DUMP = '/home/lamdev/Downloads/ehufwaaa_sadaluxe.sql';

    private const IMAGES_DIR = '/var/www/sada-luxe/sada-luxe-back/storage/app/public/product-images';

    public function __construct(
        private string $sqlDump = self::SQL_DUMP,
        private string $imagesDir = self::IMAGES_DIR,
    ) {}

    public function run(): void
    {
        $sql = (string) file_get_contents($this->sqlDump);

        $products = $this->insertRows($sql, 'shop_products');
        $categories = $this->insertRows($sql, 'shop_categories');
        $pivots = $this->insertRows($sql, 'shop_category_product');

        $this->command->info(sprintf('Sada Luxe: %d produits, %d catégories, %d lieons.', count($products), count($categories), count($pivots)));

        // pos_category_slug indexed by the source `shop_categories.id`.
        $categorySlugsBySourceId = $this->seedCategories($categories);

        // First source category per source product id.
        $firstCategoryByProductId = [];
        foreach ($pivots as [$id, $categoryId, $productId]) {
            $firstCategoryByProductId[$productId] ??= $categorySlugsBySourceId[$categoryId] ?? null;
        }

        $created = 0;
        $updated = 0;
        $noImage = 0;

        foreach ($products as $row) {
            if (! is_array($row) || count($row) < 16) {
                continue;
            }

            $sourceId = (int) $row[0];
            $name = is_string($row[2]) ? trim($row[2]) : '';
            $descriptionHtml = $row[6];
            $qty = $row[7];
            $isVisible = $row[10];
            $price = $row[12];
            $specialPrice = $row[13];
            $surCommande = $row[14];

            $attributes = [
                'name' => $name,
                'sku' => sprintf('SADL-%d', $sourceId),
                'description' => $this->cleanDescription($descriptionHtml),
                // Promotional price first, then the regular price.
                'price' => (float) (((float) $specialPrice > 0) ? $specialPrice : $price),
                'stock' => (int) $qty,
                // "Sur commande" items are never decremented.
                'unlimited_stock' => ((int) $surCommande === 1),
                'active' => ((int) $isVisible === 1),
                'category_id' => $firstCategoryByProductId[$sourceId] ?? null,
                'image' => null,
            ];

            if ($attributes['name'] === '') {
                continue;
            }

            $image = $this->copyImage($sourceId);
            if ($image !== null) {
                $attributes['image'] = $image;
            } else {
                $noImage++;
            }

            /** @var Product $product */
            $product = Product::query()->updateOrCreate(['sku' => $attributes['sku']], $attributes);

            $product->wasRecentlyCreated ? $created++ : $updated++;

            $this->createInitialMovement($product);
        }

        $this->command->info("Sada Luxe: {$created} crees, {$updated} mis a jour, {$noImage} sans image.");
    }

    /**
     * Creates the POS categories from the shop ones, returns slugs by source id.
     *
     * @param  list<array{0: int, 2: string}>  $categories  `[id, parent_id, name, ...]` rows
     * @return array<int, string>
     */
    private function seedCategories(array $categories): array
    {
        $slugs = [];

        foreach ($categories as $row) {
            $name = trim((string) $row[2]);
            if ($name === '') {
                continue;
            }

            // Keep an already-seeded category untouched when its slug exists with another name.
            $base = $this->categorySlug($name);
            $slug = Category::query()->where('slug', $base)->where('name', '!=', $name)->exists()
                ? Category::uniqueSlug($name)
                : $base;

            $category = Category::query()->updateOrCreate(
                ['slug' => $slug],
                ['name' => $name, 'color' => Category::COLORS[(int) $row[0] % count(Category::COLORS)]],
            );

            $slugs[(int) $row[0]] = $category->slug;
        }

        return $slugs;
    }

    /** Slug from the category name, following the POS convention (underscore separator). */
    private function categorySlug(string $name): string
    {
        return Str::slug($name, '_') ?: 'categorie';
    }

    /**
     * Copies the first product image from the Sada Luxe folder to the POS public disk.
     * Returns the public URL to store in `products.image`, or null when there is none.
     */
    private function copyImage(int $sourceId): ?string
    {
        $dir = $this->imagesDir.'/'.$sourceId;
        if (! is_dir($dir)) {
            return null;
        }

        foreach (scandir($dir) ?: [] as $file) {
            if (in_array($file, ['.', '..'], true) || $file === 'conversions') {
                continue;
            }

            $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            if (! in_array($extension, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
                continue;
            }

            $target = sprintf('products/sadaluxe/%d-%s', $sourceId, $file);

            Storage::disk('public')->put($target, (string) file_get_contents($dir.'/'.$file));

            return '/storage/'.$target;
        }

        return null;
    }

    /** Opening balance of the stock journal, mirroring the backfill migration. */
    private function createInitialMovement(Product $product): void
    {
        if ($product->unlimited_stock || $product->stock <= 0) {
            return;
        }

        $exists = DB::table('stock_movements')
            ->where('product_id', $product->id)
            ->where('type', 'initial')
            ->exists();

        if ($exists) {
            return;
        }

        $now = now();
        DB::table('stock_movements')->insert([
            'product_id' => $product->id,
            'type' => 'initial',
            'quantity' => $product->stock,
            'stock_before' => 0,
            'stock_after' => $product->stock,
            'note' => 'Import Sada Luxe',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    /** Strips HTML, decodes entities and collapses whitespace. */
    private function cleanDescription(?string $html): ?string
    {
        $text = str_replace(["\r", "\n", "\t"], ' ', (string) $html);
        $text = trim(preg_replace('/\s+/', ' ', strip_tags($text)) ?? '');

        return $text === '' ? null : html_entity_decode($text, ENT_QUOTES, 'UTF-8');
    }

    /**
     * Parses the VALUES rows of every `INSERT INTO `{$table}`` statement of the dump.
     * Returns tuples of values: counts are ints, "NULL" is null, the rest are strings.
     *
     * @return list<list<int|string|null>>
     */
    private function insertRows(string $sql, string $table): array
    {
        $needle = 'INSERT INTO `'.$table.'`';
        $result = [];

        $offset = 0;
        while (($start = strpos($sql, $needle, $offset)) !== false) {
            $offset = $start + strlen($needle);

            $valuesAt = strpos($sql, 'VALUES', $start);
            if ($valuesAt === false) {
                continue;
            }

            $result = [...$result, ...$this->tuplesAfter($sql, $valuesAt + strlen('VALUES'))];
        }

        return $result;
    }

    /**
     * Reads the tuples that follow a VALUES clause, until the statement's end.
     * Handles quoted strings, backslash escapes (\' and friends) and doubled quotes;
     * no escaped newline occurs inside dump strings, so ");\n" is a safe terminator.
     *
     * @return list<list<int|string|null>>
     */
    private function tuplesAfter(string $sql, int $start): array
    {
        // The statement ends at ");\n" (unescaped newlines never appear inside dump strings).
        $end = strpos($sql, ");\n", $start);
        if ($end === false) {
            return [];
        }

        $tuples = [];
        $i = $start;

        while ((($tupleStart = strpos($sql, '(', $i)) !== false) && $tupleStart < $end) {
            $values = [];
            $current = null;
            $inString = false;

            $i = $tupleStart + 1;
            for ($length = strlen($sql); $i < $length; $i++) {
                $char = $sql[$i];

                if ($inString) {
                    if ($char === '\\') { // \', \" and friends: keep the next character verbatim.
                        $i++;
                        $current = ($current ?? '').($sql[$i] ?? '');
                    } elseif ($char === "'") {
                        if (($sql[$i + 1] ?? '') === "'") { // Doubled quote inside the string.
                            $i++;
                            $current .= "'";
                        } else {
                            $inString = false;
                        }
                    } else {
                        $current = ($current ?? '').$char;
                    }

                    continue;
                }

                if ($char === "'") {
                    $inString = true;
                    $current ??= '';

                    continue;
                }
                if ($char === ',') {
                    $values[] = $this->castLiteral($current);
                    $current = null;

                    continue;
                }
                if ($char === ')') {
                    $values[] = $this->castLiteral($current);
                    break;
                }
                if (ctype_space($char)) {
                    continue;
                }
                $current = ($current ?? '').$char;
            }

            $tuples[] = $values;

            // ",\n(" separates consecutive rows on the next line; the loop's $tupleStart < $end
            // bound stops the scan from leaking into the following INSERT statement.
            $next = strpos($sql, '(', $i);
            if ($next === false) {
                break;
            }

            $i = $next;
        }

        return $tuples;
    }

    /** Numbers as ints, "NULL" as null, everything else as string. */
    private function castLiteral(?string $literal): int|string|null
    {
        $trimmed = trim(($literal ?? ''), ' ');

        if ($trimmed === '' or strcasecmp($trimmed, 'NULL') === 0) {
            return null;
        }

        if (preg_match('/^-?\d+$/', $trimmed) === 1) {
            return (int) $trimmed;
        }

        return $trimmed;
    }
}
