<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateSettingsRequest;
use App\Models\Sale;
use App\Models\Settings;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
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

        return Inertia::render('Settings/Index', [
            'users' => $users,
            'settings' => Settings::current()->toFrontend(),
            // Used by the "print a test ticket" button.
            'lastSaleId' => Sale::where('status', 'completed')->max('id'),
        ]);
    }

    public function updateSettings(UpdateSettingsRequest $request): RedirectResponse
    {
        Settings::current()->update(Settings::fromFrontend($request->validated()));

        return back()->with('success', __('messages.settings_saved'));
    }
}
