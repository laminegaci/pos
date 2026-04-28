<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Settings extends Model
{
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
}
