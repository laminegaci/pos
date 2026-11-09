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
                'role' => $user->role,
            ];
        });

        return Inertia::render('Settings/Index', [
            'users' => $users,
            'settings' => Settings::current()->toFrontend(),
            // Used by the "print a test ticket" button.
            'lastSaleId' => Sale::where('status', 'completed')->max('id'),
            'canManageRoles' => (bool) $request->user()?->isAdmin(),
        ]);
    }

    /** PUT /parametres/utilisateurs/{user}/role — admins only. */
    public function updateRole(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $data = $request->validate(['role' => ['required', 'in:'.implode(',', User::ROLES)]]);

        if ($user->id === $request->user()->id) {
            return back()->withErrors(['role' => __('returns.role_self')]);
        }

        // Never leave the shop without an administrator.
        if ($user->isAdmin() && $data['role'] !== User::ROLE_ADMIN && User::where('role', User::ROLE_ADMIN)->count() <= 1) {
            return back()->withErrors(['role' => __('returns.role_last_admin')]);
        }

        $user->role = $data['role'];
        $user->save();

        return back()->with('success', __('returns.role_updated', ['name' => $user->name]));
    }

    public function updateSettings(UpdateSettingsRequest $request): RedirectResponse
    {
        Settings::current()->update(Settings::fromFrontend($request->validated()));

        return back()->with('success', __('messages.settings_saved'));
    }
}
