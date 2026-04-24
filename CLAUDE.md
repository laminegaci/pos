# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Laravel 12 skeleton (PHP ^8.2) with Inertia.js + React scaffolding wired up. No domain code has been added yet: `app/Models` contains only the default `User`, `app/Http/Controllers` is empty, and `database/migrations` holds only the default users/cache/jobs tables. Routes currently render a single Inertia `Welcome` page. Treat new work as greenfield on top of this scaffold — there are no POS-specific models, controllers, or pages yet.

Runs under Laragon on Windows (working directory `C:\laragon\www\pos`). Use Unix-style paths with the bash shell.

## Commands

- `composer run dev` — one-shot dev environment: `php artisan serve` + `queue:listen` + `pail` (log tail) + `npm run dev` (Vite) concurrently. Intended local-dev entry point.
- `php artisan serve` / `npm run dev` — run individually if not using the full concurrent stack.
- `npm run build` — production Vite build.
- `php artisan migrate` — default DB is SQLite at `database/database.sqlite`.
- `./vendor/bin/pint` — Laravel Pint formatter.
- `php artisan test` — PHPUnit suite (`tests/Feature`, `tests/Unit`).
- `php artisan test --filter=TestName` — run a single test.

## Architecture

### Inertia + React

The frontend uses Inertia.js with a React adapter. The request flow:

1. A Laravel route returns `Inertia::render('PageName', $props)` (see [routes/web.php](routes/web.php)).
2. On initial load, Laravel renders [resources/views/app.blade.php](resources/views/app.blade.php), which boots Vite and mounts the React app via [resources/js/app.jsx](resources/js/app.jsx).
3. `createInertiaApp` uses `resolve: { pages: './Pages' }` — the `@inertiajs/vite` plugin expands this to an `import.meta.glob` over [resources/js/Pages/](resources/js/Pages/). New pages are picked up automatically by filename (e.g. `Pages/Orders/Index.jsx` → `Inertia::render('Orders/Index')`).
4. Subsequent navigations are XHR/JSON; Inertia swaps the page component client-side.

[app/Http/Middleware/HandleInertiaRequests.php](app/Http/Middleware/HandleInertiaRequests.php) is the place to expose shared props (auth user, flash, etc.) to every page — it's registered on the web group in [bootstrap/app.php](bootstrap/app.php).

### Vite stack

[vite.config.js](vite.config.js) composes four plugins in order: `laravel()` (hot reload + manifest), `inertia()` (pages glob + SSR dev support), `react()` (JSX/refresh), `tailwindcss()` (Tailwind v4 via `@tailwindcss/vite`). The Laravel input is `resources/js/app.jsx` — there is no `app.js` anymore.

Vite was upgraded to v8 so `@inertiajs/vite` (peer range `^7 || ^8`) could be installed; `laravel-vite-plugin`, `@tailwindcss/vite`, and `@vitejs/plugin-react` were bumped to matching majors. Don't downgrade any of these piecemeal — the peer graph is tight.

### Laravel 12 bootstrap

Laravel 12 uses the streamlined bootstrap in [bootstrap/app.php](bootstrap/app.php) — there is no `app/Http/Kernel.php`. Register middleware, exception handlers, and routing there. The web group currently appends `HandleInertiaRequests` and `AddLinkHeadersForPreloadedAssets`.
