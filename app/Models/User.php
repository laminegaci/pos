<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public const ROLE_ADMIN = 'admin';

    public const ROLE_MANAGER = 'manager';

    public const ROLE_CASHIER = 'cashier';

    public const ROLES = [self::ROLE_ADMIN, self::ROLE_MANAGER, self::ROLE_CASHIER];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    // NOTE: `role` is deliberately NOT mass assignable (it would let anyone register as admin).
    // Set it explicitly: $user->role = User::ROLE_MANAGER; $user->save();

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    /** Admins and managers can approve cancellations, returns and similar actions. */
    public function isManager(): bool
    {
        return in_array($this->role, [self::ROLE_ADMIN, self::ROLE_MANAGER], true);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
