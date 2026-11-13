# Opens the API (port 8000) and the website (port 5173) in two windows, then opens the browser.
$root = $PSScriptRoot
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$root\backend'; php artisan serve"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$root\frontend'; npm run dev"
Start-Sleep -Seconds 6
Start-Process 'http://localhost:5173'
