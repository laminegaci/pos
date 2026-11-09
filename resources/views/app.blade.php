<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        @php
            try {
                $shopTheme = \App\Models\Settings::current()->theme;
            } catch (\Throwable) {
                $shopTheme = 'light';
            }
        @endphp
        <script>
            (function () {
                try {
                    // A per-device choice (topbar toggle) wins over the shop default from Settings.
                    var t = localStorage.getItem('theme');
                    if (t !== 'dark' && t !== 'light') t = @json($shopTheme);
                    if (t !== 'dark' && t !== 'light') t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                    document.documentElement.classList.toggle('dark', t === 'dark');
                    document.documentElement.style.colorScheme = t;
                } catch (e) {}
            })();
        </script>

        @viteReactRefresh
        @vite('resources/js/app.jsx')
        @inertiaHead
    </head>
    <body>
        @inertia
    </body>
</html>
