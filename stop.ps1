# TNP Webshop - Stop Script
# Kills all Node.js processes related to the webshop

$ErrorActionPreference = "SilentlyContinue"
$projectDir = "D:\WORKS\TNP\tnp-store"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Tänapäev Veebipood - Peatamine" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Kill processes on port 3000
$portProcesses = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($portProcesses) {
    Write-Host "  Sulgemine pordil 3000..." -ForegroundColor Yellow
    $portProcesses | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    Write-Host "  Port 3000 vabastatud." -ForegroundColor Green
} else {
    Write-Host "  Port 3000 on juba vaba." -ForegroundColor Green
}

# Kill any remaining node/npm processes in the webshop context
Get-Process -Name "node" -ErrorAction SilentlyContinue | ForEach-Object {
    $proc = $_
    try {
        $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)").CommandLine
        if ($cmd -like "*tnp-store*" -or $cmd -like "*next*dev*") {
            Write-Host "  Sulgemine: node (PID $($proc.Id))" -ForegroundColor Yellow
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    } catch { }
}

Write-Host "  Kõik protsessid peatatud." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
