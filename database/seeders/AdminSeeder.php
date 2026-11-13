<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::updateOrCreate(
            ['email' => 'root@app.com'],
            [
                'name' => 'root',
                'email' => 'root@app.com',
                'email_verified_at' => now(),
                'password' => Hash::make('123456789'),
                'remember_token' => null,
            ]
        );

        // `role` is not mass assignable on purpose, so set it explicitly.
        $admin->role = User::ROLE_ADMIN;
        $admin->save();
    }
}
