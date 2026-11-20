# LUMIBOOK one-command setup for Windows (PowerShell).
# Run from this folder:  powershell -ExecutionPolicy Bypass -File .\setup-windows.ps1
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$api  = Join-Path $root 'backend'
$web  = Join-Path $root 'frontend'

function Need($cmd) { if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { throw "$cmd is not installed or not on PATH." } }
function Set-Env($file, $key, $value) {
    $lines = @(Get-Content $file)
    $found = $false
    $out = @(foreach ($l in $lines) {
        if ($l -match "^\s*#?\s*$key=") { if (-not $found) { "$key=$value"; $found = $true } } else { $l }
    })
    if (-not $found) { $out += "$key=$value" }
    Set-Content -Path $file -Value $out -Encoding ASCII
}

Write-Host "`n== 1/6 Checking tools ==" -ForegroundColor Cyan
Need php; Need composer; Need node; Need npm
$mods = (php -m) -join ' '
foreach ($m in 'gd', 'fileinfo', 'mbstring', 'openssl', 'pdo_sqlite') {
    if ($mods -notmatch $m) { Write-Warning "PHP extension '$m' is not enabled. Open php.ini (run: php --ini) and remove the ';' before extension=$m, then re-run." }
}
php -v | Select-Object -First 1

Write-Host "`n== 2/6 Creating the Laravel project (first run only) ==" -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $api 'artisan'))) {
    composer create-project laravel/laravel $api --no-interaction
}
Push-Location $api
if (-not (Test-Path 'vendor\laravel\sanctum')) {
    composer require laravel/sanctum --no-interaction
    php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider" --tag=sanctum-migrations --no-interaction
}

Write-Host "`n== 3/6 Copying LUMIBOOK backend files ==" -ForegroundColor Cyan
Copy-Item -Path (Join-Path $root 'backend-overlay\*') -Destination $api -Recurse -Force
Copy-Item -Path (Join-Path $api '.env.example') -Destination (Join-Path $api '.env') -Force:$false -ErrorAction SilentlyContinue
$envFile = Join-Path $api '.env'
Set-Env $envFile 'APP_ENV' 'local'
Set-Env $envFile 'APP_URL' 'http://localhost:8000'
Set-Env $envFile 'FRONTEND_URL' 'http://localhost:5173'
Set-Env $envFile 'QUEUE_CONNECTION' 'sync'
Set-Env $envFile 'MAIL_MAILER' 'log'
Set-Env $envFile 'ADMIN_EMAIL' 'owner@lumibook.test'
Set-Env $envFile 'ADMIN_PASSWORD' 'ChangeMe!2026'
Set-Env $envFile 'PAYMONGO_MODE' 'test'
composer dump-autoload --no-interaction
php artisan config:clear

Write-Host "`n== 4/6 Database ==" -ForegroundColor Cyan
php artisan migrate --force
php artisan db:seed --class=LumibookSeeder --force
try { php artisan storage:link } catch { Write-Host 'storage link already exists' }

Write-Host "`n== 5/6 Running backend tests ==" -ForegroundColor Cyan
php artisan test
if ($LASTEXITCODE -ne 0) { Write-Warning 'Some tests failed. Copy the first red error and send it back; the app may still run.' }
Pop-Location

Write-Host "`n== 6/6 Installing frontend packages ==" -ForegroundColor Cyan
Push-Location $web
npm install
Pop-Location

Write-Host "`nDONE. Start both servers with:  powershell -ExecutionPolicy Bypass -File .\start-dev.ps1" -ForegroundColor Green
Write-Host "Owner login:  owner@lumibook.test  /  ChangeMe!2026"
Write-Host "Test members: free@ premium@ plus@ all@lumibook.test  /  password"
