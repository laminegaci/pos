<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Settings;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Trim strings and turn checkbox-like values into real booleans before validating.
     */
    protected function prepareForValidation(): void
    {
        $booleans = [
            'showLogo', 'printAuto', 'cashEnabled', 'cardEnabled', 'creditEnabled',
            'notifLowStock', 'notifDailyReport', 'notifNewSale', 'twoFactor', 'autoBackup',
        ];

        $merge = [];
        foreach ($booleans as $key) {
            if ($this->has($key)) {
                $value = filter_var($this->input($key), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                $merge[$key] = $value ?? $this->input($key);
            }
        }

        // receipt_footer is a NOT NULL text column: an emptied footer is stored as ''.
        if ($this->has('receiptFooter') && $this->input('receiptFooter') === null) {
            $merge['receiptFooter'] = '';
        }

        $this->merge($merge);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // General (NOT NULL columns)
            'shopName' => ['sometimes', 'required', 'string', 'max:255'],
            'shopCode' => ['sometimes', 'required', 'string', 'max:255'],
            'currency' => ['sometimes', 'required', Rule::in(['DZD', 'EUR', 'USD'])],
            'language' => ['sometimes', 'required', Rule::in(['fr', 'en', 'ar'])],
            'timezone' => ['sometimes', 'required', 'timezone:all'],

            // Company (nullable columns)
            'company' => ['sometimes', 'nullable', 'string', 'max:255'],
            'rc' => ['sometimes', 'nullable', 'string', 'max:255'],
            'nif' => ['sometimes', 'nullable', 'string', 'max:255'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],

            // Billing
            'vatRate' => ['sometimes', 'required', 'integer', 'between:0,100'],
            'receiptFooter' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'showLogo' => ['sometimes', 'required', 'boolean'],
            'printAuto' => ['sometimes', 'required', 'boolean'],
            'printerName' => ['sometimes', 'required', 'string', 'max:255'],
            'paperSize' => ['sometimes', 'required', Rule::in(['58mm', '80mm', 'A4'])],

            // Payments
            'cashEnabled' => ['sometimes', 'required', 'boolean'],
            'cardEnabled' => ['sometimes', 'required', 'boolean'],
            'creditEnabled' => ['sometimes', 'required', 'boolean'],

            // Appearance
            'theme' => ['sometimes', 'required', Rule::in(['light', 'dark', 'auto'])],
            'accentColor' => ['sometimes', 'required', Rule::in(['indigo', 'emerald', 'rose', 'amber', 'sky'])],

            // Notifications
            'notifLowStock' => ['sometimes', 'required', 'boolean'],
            'lowStockThreshold' => ['sometimes', 'required', 'integer', 'between:0,100000'],
            'notifDailyReport' => ['sometimes', 'required', 'boolean'],
            'notifNewSale' => ['sometimes', 'required', 'boolean'],

            // Security
            'twoFactor' => ['sometimes', 'required', 'boolean'],
            'sessionTimeout' => ['sometimes', 'required', 'integer', 'between:1,1440'],

            // Backup
            'autoBackup' => ['sometimes', 'required', 'boolean'],
            'backupFrequency' => ['sometimes', 'required', Rule::in(['hourly', 'daily', 'weekly'])],
        ];
    }

    /**
     * At least one payment method must remain enabled after this update.
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $current = Settings::current();
                $enabled = fn (string $key, string $column) => $this->has($key)
                    ? (bool) $this->boolean($key)
                    : (bool) $current->{$column};

                if (! $enabled('cashEnabled', 'cash_enabled')
                    && ! $enabled('cardEnabled', 'card_enabled')
                    && ! $enabled('creditEnabled', 'credit_enabled')) {
                    $validator->errors()->add('cashEnabled', __('messages.settings_no_payment'));
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        $fr = [
            'shopName' => 'nom de la boutique', 'shopCode' => 'code boutique', 'currency' => 'devise',
            'language' => 'langue', 'timezone' => 'fuseau horaire', 'company' => 'raison sociale',
            'rc' => 'RC', 'nif' => 'NIF', 'address' => 'adresse', 'phone' => 'téléphone', 'email' => 'email',
            'vatRate' => 'taux de TVA', 'receiptFooter' => 'pied de ticket', 'printerName' => 'imprimante',
            'paperSize' => 'format papier', 'theme' => 'thème', 'accentColor' => "couleur d'accent",
            'sessionTimeout' => 'expiration de session', 'backupFrequency' => 'fréquence de sauvegarde',
        ];

        $en = [
            'shopName' => 'shop name', 'shopCode' => 'shop code', 'currency' => 'currency',
            'language' => 'language', 'timezone' => 'timezone', 'company' => 'company name',
            'rc' => 'RC', 'nif' => 'NIF', 'address' => 'address', 'phone' => 'phone', 'email' => 'email',
            'vatRate' => 'VAT rate', 'receiptFooter' => 'receipt footer', 'printerName' => 'printer',
            'paperSize' => 'paper size', 'theme' => 'theme', 'accentColor' => 'accent color',
            'sessionTimeout' => 'session timeout', 'backupFrequency' => 'backup frequency',
        ];

        return str_starts_with(app()->getLocale(), 'fr') ? $fr : $en;
    }
}
