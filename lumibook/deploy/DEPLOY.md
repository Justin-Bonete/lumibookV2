# Deploying LUMIBOOK (single VPS with Docker)

Untested here: follow it on a staging server first.

## 1. Server
Ubuntu 22.04/24.04, 2 GB RAM minimum. Point your domain's A record at the server. Open ports 80 and 443 only (plus SSH). Install Docker + the compose plugin. Create a non-root deploy user.

## 2. Code
```bash
git clone <your repo> /srv/lumibook && cd /srv/lumibook      # ./backend ./frontend ./deploy
cp backend/.env.example backend/.env                          # then add the block from .env.example.lumibook
```
Set in `backend/.env`: `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://yourdomain.com`, `FRONTEND_URL=https://yourdomain.com`, `DB_CONNECTION=pgsql`, `DB_HOST=db`, DB name/user/password, mail settings, PayMongo keys, `REQUIRE_ADMIN_2FA=true`, `QUEUE_CONNECTION=database`. Export `DOMAIN=yourdomain.com` (put it in `deploy/.env` next to the compose file with `DB_*` copied from backend/.env).

## 3. Build and start
```bash
cd frontend && npm ci && npm run build && cd ..
docker compose -f deploy/docker-compose.yml up -d --build
docker compose -f deploy/docker-compose.yml exec app composer install --no-dev -o
docker compose -f deploy/docker-compose.yml exec app php artisan key:generate --force
docker compose -f deploy/docker-compose.yml exec app php artisan migrate --force
docker compose -f deploy/docker-compose.yml exec app php artisan db:seed --class=LumibookSeeder --force
docker compose -f deploy/docker-compose.yml exec app php artisan storage:link
docker compose -f deploy/docker-compose.yml exec app php artisan config:cache
docker compose -f deploy/docker-compose.yml exec app php artisan route:cache
docker compose -f deploy/docker-compose.yml exec app chown -R www-data:www-data storage bootstrap/cache
```
Caddy fetches the HTTPS certificate automatically on first request.

## 4. PayMongo webhook (do this in TEST mode first, then again for LIVE)
Dashboard → Developers → Webhooks → add `https://yourdomain.com/api/webhooks/paymongo`, event `checkout_session.payment.paid`. Copy the signing secret into `PAYMONGO_WEBHOOK_SECRET`, then `config:cache` again. Test and live use separate endpoints and secrets. Make a test purchase end to end before going live.

## 5. Monitoring
- Uptime monitor on `https://yourdomain.com/api/health` (expects `{"status":"ok"}`).
- Logs: `docker compose -f deploy/docker-compose.yml logs -f app queue web`; Laravel log at `backend/storage/logs`.
- Optional: add Sentry (`composer require sentry/sentry-laravel`) for error alerts.

## 6. Backups
Install the cron in `deploy/backup.sh`. **Practise a restore** on a scratch server before launch: `gunzip -c db-*.sql.gz | psql ...` and untar the files archive.

## 7. Updating
```bash
git pull && (cd frontend && npm ci && npm run build)
docker compose -f deploy/docker-compose.yml exec app composer install --no-dev -o
docker compose -f deploy/docker-compose.yml exec app php artisan migrate --force
docker compose -f deploy/docker-compose.yml exec app php artisan config:cache
docker compose -f deploy/docker-compose.yml restart queue scheduler
```
Rollback: `git checkout <previous tag>`, rebuild the frontend, restore the latest DB backup only if a migration must be undone.
