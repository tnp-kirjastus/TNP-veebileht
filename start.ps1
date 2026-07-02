# TNP Webshop - Start Script
# Starts the Next.js dev server and opens in browser

$ErrorActionPreference = "Stop"
$projectDir = "D:\WORKS\TNP\tnp-store"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Tänapäev Veebipood - Käivitamine" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Set-Location -LiteralPath $projectDir

# Kill any existing node processes on port 3000
$existing = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($existing) {
    Write-Host "  Port 3000 on kasutusel. Sulgen eelmise protsessi..." -ForegroundColor Yellow
    $existing | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 2
}

Write-Host "  Käivitan Next.js arendusserveri..." -ForegroundColor Green
Write-Host "  URL: http://localhost:3000" -ForegroundColor White
Write-Host "  Vajuta Ctrl+C peatamiseks" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan

Start-Process "http://localhost:3000"

npm run dev
