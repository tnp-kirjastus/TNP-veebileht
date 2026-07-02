@echo off
echo ========================================
echo   Tänapäev Veebipood - Käivitamine
echo ========================================
echo.
echo Käivitan serveri ja avan brauseris...
echo URL: http://localhost:3000
echo Vajuta Ctrl+C peatamiseks
echo ========================================
echo.

start http://localhost:3000
cd /d D:\WORKS\TNP\tnp-store
call npm run dev
