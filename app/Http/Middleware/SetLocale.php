<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Session;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->get('locale');

        if (! $locale) {
            $locale = Session::get('locale');
        }

        if (! $locale && $request->hasHeader('Accept-Language')) {
            $header = $request->header('Accept-Language');
            $locale = explode(',', $header)[0] ?? null;
            $locale = explode('-', $locale)[0] ?? null;
        }

        if (! $locale || ! in_array($locale, ['en', 'fr'])) {
            $locale = config('app.locale', 'fr');
        }

        App::setLocale($locale);
        Session::put('locale', $locale);

        return $next($request);
    }
}
