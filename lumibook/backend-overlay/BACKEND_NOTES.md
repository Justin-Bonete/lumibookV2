# LUMIBOOK backend (Laravel 11 + PostgreSQL + Sanctum)

Drop these files into a fresh Laravel 11 project (they overwrite `app/Models/User.php`).

## Setup
```bash
composer create-project laravel/laravel lumibook && cd lumibook
php artisan install:api                 # installs Sanctum + routes/api.php
# copy this folder's contents over the project, then:
# .env -> DB_CONNECTION=pgsql ..., ADMIN_EMAIL=you@domain.com, ADMIN_PASSWORD=<strong password>
```
Register the middleware alias in `bootstrap/app.php`:
```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias(['role' => \App\Http\Middleware\EnsureRole::class]);
})
```
```bash
php artisan migrate
php artisan db:seed --class=LumibookSeeder
php artisan serve
```
PDFs are stored on the private `local` disk (`storage/app/private`), never in `public/`.

## Roles
| Role | Can do |
| --- | --- |
| `admin` (owner) | Everything under `/api/admin/*`: all users, plan trace, assign plans, suspend, titles, collections, audit log |
| `member` | `/api/me`, `/api/library`, `/api/history`, `/api/titles/{id}/download` — limited to their plan |

## Access rules (EntitlementService)
Free: 5 titles, 3 downloads/month (proposed) · Premium: up to 20, 10 lifetime · Premium Plus: up to 58, 30 lifetime · All Access: all eligible, unlimited (throttled).
A download needs: signed-in + active account → title published and rights-cleared → title in plan collection → quota remaining (row-locked reservation) → 5-minute signed link. Failed downloads don't consume quota.

## Tests
```bash
php artisan test        # tests/Feature/AccessRulesTest.php: plan gating, quotas, roles, signed links
```

## Phase 5: catalogue & PDFs
```bash
php artisan migrate          # adds cover_path + file_size
php artisan storage:link     # serves covers from the public disk
```
- PDFs go to the private `local` disk; covers (jpg/png/webp, 2 MB) go to the `public` disk.
- Uploads are checked for a real `%PDF-` header. To also scan with ClamAV add to `config/services.php`: `'clamav' => ['enabled' => env('CLAMAV_ENABLED', false)]` and set `CLAMAV_ENABLED=true` (needs `clamdscan`).
- New endpoints: `GET /api/library?q=&category=&access=unlocked|locked&sort=title|newest&page=`, `GET /api/categories`, `GET /api/titles/{id}`; admin: `POST /api/admin/titles` (multipart), `POST /api/admin/titles/{id}/cover`, `POST /api/admin/titles/{id}/file`, `GET /api/admin/plans/{id}`.
- `GET /api/library` is now paginated (12 per page).

## Phase 6-8 additions
- **Overwrite** `bootstrap/app.php` and `bootstrap/providers.php` with the versions in this zip (role middleware alias, security headers, rate limiters, JSON errors). `config/cors.php`, `config/sanctum.php`, `config/paymongo.php`, `config/lumibook.php` are included too.
- `php artisan migrate` (adds checkout columns + `webhook_events`), then add the block from `.env.example.lumibook` to your `.env`.
- Local queue: set `QUEUE_CONNECTION=sync` in `.env` so receipt emails send without a worker; use `MAIL_MAILER=log` to read emails in `storage/logs/laravel.log`.
- PayMongo: create a TEST webhook for `checkout_session.payment.paid` pointing at `/api/webhooks/paymongo` (use a tunnel such as ngrok locally) and put its secret in `PAYMONGO_WEBHOOK_SECRET`.
- Prices: set `PRICE_PREMIUM` etc. in `.env` before seeding, or set them in the owner console (Plan collections). In `APP_ENV=local` the seeder adds TEST prices of 99/199/299 pesos.
- New endpoints: `POST /api/checkout`, `GET /api/orders`, `GET /api/plans`, `POST /api/webhooks/paymongo`, `POST /api/forgot-password`, `POST /api/reset-password`, `GET /api/email/verify/{id}/{hash}`, `GET /api/health`, admin `GET /api/admin/orders`, `POST /api/admin/orders/{id}/recheck`, `PUT /api/admin/plans/{id}/price`.
