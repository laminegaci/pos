# AGENTS.md

Guidelines for agentic coding agents operating in this repository.

## Project Overview

- **Framework**: Laravel 12 (PHP ^8.2) with Inertia.js + React
- **Database**: SQLite at `database/database.sqlite`
- **Working Directory**: `C:\laragon\www\pos`

---

## Build / Lint / Test Commands

### PHP / Laravel

| Command | Description |
|---------|------------|
| `php artisan serve` | Start Laravel dev server |
| `php artisan migrate` | Run database migrations |
| `./vendor/bin/pint` | Format PHP code (Laravel Pint) |
| `php artisan test` | Run full PHPUnit suite |
| `php artisan test --filter=TestName` | Run single test by name |
| `php artisan test tests/Unit` | Run Unit test suite only |
| `php artisan test tests/Feature` | Run Feature test suite only |

### Node / Frontend

| Command | Description |
|---------|------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build with Vite |
| `npm run preview` | Preview production build |

### Full Dev Stack

```bash
# Run all dev services concurrently
composer run dev
```

### Code Quality

```bash
# Format PHP with Pint
./vendor/bin/pint

# Run tests
php artisan test --filter=ExampleTest
```

---

## Code Style Guidelines

### PHP (Laravel)

- **Formatter**: Laravel Pint (uses .php-cs-fixer internally)
- **Run**: `./vendor/bin/pint` (no config file needed)
- **Standards**: PSR-12 + Laravel conventions

### PHP Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Classes | PascalCase | `UserService`, `OrderController` |
| Traits | PascalCase | `HasFactory`, `Notifiable` |
| Interfaces | PascalCase + Interface suffix | `Authenticatable` |
| Methods | camelCase | `getUser()`, `processOrder()` |
| Variables | camelCase | `$user`, `$orderItems` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Controller methods | snake_case | `store()`, `update()` |
| Database tables | snake_case (plural) | `users`, `order_items` |
| Database columns | snake_case | `created_at`, `user_id` |

### PHP Type Declarations

- Use strict types: `declare(strict_types=1);` at top of all PHP files
- Use return types on all methods:
  ```php
  public function getUser(int $id): ?User
  {
      // ...
  }
  ```
- Use union types (PHP 8+):
  ```php
  public function process(int|string $input): int|string
  ```

### PHP DocBlocks

Use generic types for Laravel Eloquent models:

```php
/** @use HasFactory<\Database\Factories\UserFactory> */
use HasFactory, Notifiable;

/**
 * Get the attributes that should be cast.
 *
 * @return array<string, string>
 */
protected function casts(): array
{
    return ['email_verified_at' => 'datetime'];
}
```

### PHP Imports

- Group imports by type: built-in, external, then internal
- Sort alphabetically within groups
- Use fully qualified class names in `@extends`, `@implements` annotations

### React / JavaScript

- **JSX**: Use `.jsx` extension for components
- **Hooks**: Functional components with hooks; no class components
- **Props**: Destructure in component signature
  ```jsx
  export default function UserCard({ name, email, onEdit }) {
      // ...
  }
  ```

### React Naming

- Components: PascalCase (`UserCard.jsx`, `OrderList.jsx`)
- Files in `Pages/`: match Inertia route (`Welcome.jsx` → `Inertia::render('Welcome')`)
- Props passed from Laravel: camelCase

### Tailwind CSS (v4)

- Use utility classes in JSX
- Custom theme in `resources/css/app.css` via `@theme` directive
- Responsive: mobile-first (`sm:`, `md:`, `lg:`, `xl:`)

### Error Handling

- Laravel: Use exceptions in `app/Exceptions/`, register in `bootstrap/app.php`
- React: Inline error boundaries for critical components
- API responses: Return consistent JSON structure

### Routing

- Web routes: `routes/web.php`
- Console routes: `routes/console.php`
- Return Inertia pages: `Inertia::render('PageName', $props)`

### Testing

- Unit tests: `tests/Unit/`
- Feature tests: `tests/Feature/`
- Extend `Tests\TestCase` (which extends Laravel's `TestCase`)
- Use PHPUnit assertions

```php

```

### Architecture

- Models: `app/Models/`
- Controllers: `app/Http/Controllers/`
- Middleware: `app/Http/Middleware/`
- Requests/Requests: `app/Http/Requests/`
- Resources: `app/Http/Resources/`
- React Pages: `resources/js/Pages/`

### Shared Props (Inertia)

Add shared props in `app/Http/Middleware/HandleInertiaRequests.php`:

```php
public function share(Request $request): array
{
    return [
        ...parent::share($request),
        'auth' => $request->user(),
    ];
}
```

### Environment

- Copy `.env.example` to `.env` for local development
- Database: SQLite at `database/database.sqlite`
- Run `php artisan key:generate` for new installations

---

## Important Notes

- This is a fresh Laravel 12 skeleton with Inertia + React
- No domain models/controllers exist yet — treat as greenfield
- Use `composer run dev` for full concurrent dev stack
- Database uses SQLite; no migrations exist yet