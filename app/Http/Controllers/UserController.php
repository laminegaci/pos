<?php

namespace App\Http\Controllers;

use App\Models\Settings;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserController extends Controller
{
    public function settings(Request $request)
    {
        $users = User::orderBy('name')->get()->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => 'Caissier',
            ];
        });

        $settings = Settings::first() ?? Settings::create([]);

        return Inertia::render('Settings/Index', [
            'users' => $users,
            'settings' => [
                'shopName' => $settings->shop_name,
                'shopCode' => $settings->shop_code,
                'currency' => $settings->currency,
                'language' => $settings->language,
                'timezone' => $settings->timezone,
                'company' => $settings->company,
                'rc' => $settings->rc,
                'nif' => $settings->nif,
                'address' => $settings->address,
                'phone' => $settings->phone,
                'email' => $settings->email,
                'vatRate' => $settings->vat_rate,
                'receiptFooter' => $settings->receipt_footer,
                'showLogo' => $settings->show_logo,
                'printAuto' => $settings->print_auto,
                'cashEnabled' => $settings->cash_enabled,
                'cardEnabled' => $settings->card_enabled,
                'creditEnabled' => $settings->credit_enabled,
                'printerName' => $settings->printer_name,
                'paperSize' => $settings->paper_size,
                'theme' => $settings->theme,
                'accentColor' => $settings->accent_color,
                'notifLowStock' => $settings->notif_low_stock,
                'notifDailyReport' => $settings->notif_daily_report,
                'notifNewSale' => $settings->notif_new_sale,
                'twoFactor' => $settings->two_factor,
                'sessionTimeout' => $settings->session_timeout,
                'autoBackup' => $settings->auto_backup,
                'backupFrequency' => $settings->backup_frequency,
            ],
        ]);
    }

    public function updateSettings(Request $request)
    {
        $request->validate([]);

        $settings = Settings::first() ?? Settings::create([]);

        $settings->update([
            'shop_name' => $request->input('shopName'),
            'shop_code' => $request->input('shopCode'),
            'currency' => $request->input('currency'),
            'language' => $request->input('language'),
            'timezone' => $request->input('timezone'),
            'company' => $request->input('company'),
            'rc' => $request->input('rc'),
            'nif' => $request->input('nif'),
            'address' => $request->input('address'),
            'phone' => $request->input('phone'),
            'email' => $request->input('email'),
            'vat_rate' => $request->input('vatRate'),
            'receipt_footer' => $request->input('receiptFooter'),
            'show_logo' => $request->input('showLogo'),
            'print_auto' => $request->input('printAuto'),
            'cash_enabled' => $request->input('cashEnabled'),
            'card_enabled' => $request->input('cardEnabled'),
            'credit_enabled' => $request->input('creditEnabled'),
            'printer_name' => $request->input('printerName'),
            'paper_size' => $request->input('paperSize'),
            'theme' => $request->input('theme'),
            'accent_color' => $request->input('accentColor'),
            'notif_low_stock' => $request->input('notifLowStock'),
            'notif_daily_report' => $request->input('notifDailyReport'),
            'notif_new_sale' => $request->input('notifNewSale'),
            'two_factor' => $request->input('twoFactor'),
            'session_timeout' => $request->input('sessionTimeout'),
            'auto_backup' => $request->input('autoBackup'),
            'backup_frequency' => $request->input('backupFrequency'),
        ]);

        return back()->with('success', true);
    }
}
