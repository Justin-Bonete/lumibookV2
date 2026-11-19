# Applies a newer LUMIBOOK package to a project you already set up.
# 1) Extract the new zip over your existing folder (overwrite files), 2) run:
#    powershell -ExecutionPolicy Bypass -File .\update-windows.ps1
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$api  = Join-Path $root 'backend'
if (-not (Test-Path (Join-Path $api 'artisan'))) { throw 'backend\artisan not found. Run setup-windows.ps1 first.' }

Write-Host "`n== Updating backend ==" -ForegroundColor Cyan
Copy-Item -Path (Join-Path $root 'backend-overlay\*') -Destination $api -Recurse -Force
Push-Location $api
composer dump-autoload --no-interaction
php artisan config:clear
php artisan migrate --force
php artisan test
if ($LASTEXITCODE -ne 0) { Write-Warning 'Some tests failed. Copy the first red error and send it back.' }
Pop-Location

Write-Host "`n== Updating frontend packages ==" -ForegroundColor Cyan
Push-Location (Join-Path $root 'frontend')
npm install
Pop-Location
Write-Host "`nDONE. Restart the servers (close the two windows, then run start-dev.ps1)." -ForegroundColor Green
