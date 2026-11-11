# Security checklist (phase 7)

## Automated (run before every release)
- [ ] `php artisan test` all green (includes: admin routes reject guests/members, security headers, login rate limit, fair-use cap, webhook signature + idempotency)
- [ ] `composer audit` and `npm audit`: no high/critical issues left unexplained
- [ ] `php artisan route:list` reviewed: only intended routes are public

## Configuration
- [ ] `APP_DEBUG=false`, `APP_ENV=production`, unique `APP_KEY`
- [ ] HTTPS only; HSTS header present (check with securityheaders.com)
- [ ] `ADMIN_PASSWORD` is long and random; changed from the seeded value; stored in a password manager
- [ ] PayMongo LIVE secret key and webhook secret only on the server; never in the frontend or git
- [ ] `.env` and `storage/` not web-accessible; PDFs only on the private disk (try opening `/storage/pdfs/...`: must 404)
- [ ] `SANCTUM_TOKEN_EXPIRATION` set; CORS origin is your domain only
- [ ] Database user has no superuser rights; DB port not exposed to the internet
- [ ] Server: SSH keys only, firewall on, automatic security updates on

## Manual attack tests (use a member account)
- [ ] Open an admin URL (e.g. `/admin/users`): redirected; calling `/api/admin/users` returns 403
- [ ] Download a title above your plan: refused. Re-use an old download link: refused (410). Edit the link's signature: refused
- [ ] Hit login 6 times with a wrong password: rate limited
- [ ] Upload a `.exe` renamed `.pdf` (as admin): rejected
- [ ] Replay a PayMongo webhook with a wrong signature: 400. Replay a real one: no double activation
- [ ] Suspend a member: they are signed out and cannot sign in

## Known gaps to decide on
- No two-factor login for the owner account (recommended before launch; Laravel Fortify or a TOTP package)
- ClamAV scanning is optional and off by default
- Tokens live in browser localStorage (acceptable if the app has no XSS; cookie-based Sanctum is the stricter option)
