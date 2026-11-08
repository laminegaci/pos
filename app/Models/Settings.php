<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Settings extends Model
{
    /**
     * Front-end (camelCase) key => database column.
     */
    public const FIELDS = [
        'shopName' => 'shop_name',
        'shopCode' => 'shop_code',
        'currency' => 'currency',
        'language' => 'language',
        'timezone' => 'timezone',
        'company' => 'company',
        'rc' => 'rc',
        'nif' => 'nif',
        'address' => 'address',
        'phone' => 'phone',
        'email' => 'email',
        'vatRate' => 'vat_rate',
        'receiptFooter' => 'receipt_footer',
        'showLogo' => 'show_logo',
        'printAuto' => 'print_auto',
        'cashEnabled' => 'cash_enabled',
        'cardEnabled' => 'card_enabled',
        'creditEnabled' => 'credit_enabled',
        'printerName' => 'printer_name',
        'paperSize' => 'paper_size',
        'theme' => 'theme',
        'accentColor' => 'accent_color',
        'notifLowStock' => 'notif_low_stock',
        'notifDailyReport' => 'notif_daily_report',
        'notifNewSale' => 'notif_new_sale',
        'twoFactor' => 'two_factor',
        'sessionTimeout' => 'session_timeout',
        'autoBackup' => 'auto_backup',
        'backupFrequency' => 'backup_frequency',
    ];

    protected $fillable = [
        'shop_name', 'shop_code', 'currency', 'language', 'timezone',
        'company', 'rc', 'nif', 'address', 'phone', 'email',
        'vat_rate', 'receipt_footer', 'show_logo', 'print_auto',
        'cash_enabled', 'card_enabled', 'credit_enabled',
        'printer_name', 'paper_size', 'theme', 'accent_color',
        'notif_low_stock', 'notif_daily_report', 'notif_new_sale',
        'two_factor', 'session_timeout', 'auto_backup', 'backup_frequency',
    ];

    protected $casts = [
        'vat_rate' => 'integer',
        'show_logo' => 'boolean',
        'print_auto' => 'boolean',
        'cash_enabled' => 'boolean',
        'card_enabled' => 'boolean',
        'credit_enabled' => 'boolean',
        'notif_low_stock' => 'boolean',
        'notif_daily_report' => 'boolean',
        'notif_new_sale' => 'boolean',
        'two_factor' => 'boolean',
        'session_timeout' => 'integer',
        'auto_backup' => 'boolean',
    ];

    /**
     * The single settings row, created with the database defaults if missing.
     */
    public static function current(): self
    {
        $settings = static::query()->oldest('id')->first();

        if (! $settings) {
            // refresh() so the column defaults from the migration are loaded.
            $settings = static::query()->create()->refresh();
        }

        return $settings;
    }

    /**
     * @return array<string, mixed>
     */
    public function toFrontend(): array
    {
        $data = [];
        foreach (self::FIELDS as $key => $column) {
            $data[$key] = $this->getAttribute($column);
        }

        return $data;
    }

    /**
     * @param  array<string, mixed>  $data  camelCase keys
     * @return array<string, mixed> column => value
     */
    public static function fromFrontend(array $data): array
    {
        $attributes = [];
        foreach (self::FIELDS as $key => $column) {
            if (array_key_exists($key, $data)) {
                $attributes[$column] = $data[$key];
            }
        }

        return $attributes;
    }
}
