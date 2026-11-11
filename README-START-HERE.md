# LUMIBOOK complete build v2 (phases 1-8)

## Folder map
| Folder | What it is |
| --- | --- |
| `backend-overlay/` | LUMIBOOK's Laravel files (the setup script copies them onto a fresh Laravel project into `backend/`) |
| `frontend/` | React + TypeScript website and dashboards |
| `deploy/` + `docs/` | Docker/HTTPS deployment, backup script, security / UAT / launch checklists |
| `landing/` | The premium 3D landing page (single HTML file, just double-click) |
| `demo/` | The dashboard demo on fake data (single HTML file) |

## Run it on Windows (about 5 minutes)
Needs PHP 8.2+, Composer, Node 18+.
1. Extract this zip to a NEW empty folder, for example `C:\dev\lumibook` (not into System32).
2. Open PowerShell in that folder and run:
   `powershell -ExecutionPolicy Bypass -File .\setup-windows.ps1`
3. When it prints DONE, run:
   `powershell -ExecutionPolicy Bypass -File .\start-dev.ps1`
4. Sign in at http://localhost:5173 with `owner@lumibook.test` / `ChangeMe!2026` (owner) or `premium@lumibook.test` / `password` (member).

If PHP says an extension is missing (gd, fileinfo...), open php.ini (`php --ini` shows where) and remove the `;` before that `extension=` line.

## Trying payments locally
Create a PayMongo account, copy the TEST secret key into `backend\.env` as `PAYMONGO_SECRET_KEY=sk_test_...`, then restart `php artisan serve`. For the webhook locally you need a tunnel (such as ngrok) pointed at port 8000 and a test webhook for `checkout_session.payment.paid`; see `backend-overlay\BACKEND_NOTES.md`. Local seeding adds TEST prices of 99 / 199 / 299 pesos.
