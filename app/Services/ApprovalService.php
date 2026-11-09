<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * Sensitive actions (cancel a ticket, make a return) need a manager.
 *  - a manager/admin acts alone;
 *  - a cashier needs a manager to type their credentials on the spot.
 * The returned id is stored on the record so it is always clear who approved.
 */
class ApprovalService
{
    private const MAX_ATTEMPTS = 5;

    /**
     * @return int id of the user who approved
     *
     * @throws ValidationException
     */
    public function approve(User $actor, ?string $email, ?string $password): int
    {
        if ($actor->isManager()) {
            return $actor->id;
        }

        if (blank($email) || blank($password)) {
            throw ValidationException::withMessages(['approver_email' => __('returns.approval_required')]);
        }

        $key = 'approval:'.$actor->id;
        if (RateLimiter::tooManyAttempts($key, self::MAX_ATTEMPTS)) {
            throw ValidationException::withMessages([
                'approver_password' => __('returns.approval_throttled', ['seconds' => RateLimiter::availableIn($key)]),
            ]);
        }

        $approver = User::query()->where('email', $email)->first();

        // Same answer for "unknown email", "not a manager" and "wrong password": nothing to enumerate.
        if (! $approver || ! $approver->isManager() || ! Hash::check((string) $password, $approver->password)) {
            RateLimiter::hit($key, 60);
            throw ValidationException::withMessages(['approver_password' => __('returns.approval_invalid')]);
        }

        RateLimiter::clear($key);

        return $approver->id;
    }
}
