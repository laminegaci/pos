<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Settings;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Applies the "session timeout" setting (minutes of inactivity) as the session lifetime.
 * Runs before StartSession so the database driver expires idle sessions accordingly.
 */
class ApplySessionTimeout
{
    public function handle(Request $request, Closure $next): Response
    {
        try {
            $minutes = (int) Settings::current()->session_timeout;
            if ($minutes >= 1) {
                config(['session.lifetime' => $minutes]);
            }
        } catch (Throwable) {
            // settings table not migrated yet: keep the configured lifetime
        }

        return $next($request);
    }
}
