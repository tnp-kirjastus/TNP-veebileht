@echo off
echo ========================================
echo   Tänapäev Veebipood - Peatamine
echo ========================================
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Sulgemine PID %%a pordil 3000...
    taskkill /PID %%a /F >nul 2>&1
)

echo Port 3000 vabastatud.
echo Kõik protsessid peatatud.
echo ========================================
pause
