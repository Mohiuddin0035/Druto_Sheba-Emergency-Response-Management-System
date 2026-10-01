@echo off
title Druto Sheba - Emergency Response System Launcher
color 0A

echo ================================================================
echo    EMERGENCY RESPONSE SYSTEM (DRUTO SHEBA) - ONE-CLICK LAUNCHER
echo ================================================================
echo.

:: Move to script directory
cd /d "%~dp0"

:: Check if druto-sheba-app subfolder exists
if exist "druto-sheba-app" (
    cd "druto-sheba-app"
)

:: Check if node_modules exists
if not exist "node_modules" (
    echo [!] node_modules not found. Installing dependencies...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] npm install failed. Please check your internet connection or Node.js installation.
        pause
        exit /b 1
    )
)

:: Auto-free port 3600 if previously occupied by a ghost process
powershell -NoProfile -Command "$conn = Get-NetTCPConnection -LocalPort 3600 -ErrorAction SilentlyContinue; if ($conn) { $conn | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"

echo [*] Building and updating project assets...
call npm run build

echo [*] Starting Next.js Server on port 3600...
echo [*] Opening browser instantly at http://localhost:3600...
echo.

:: Smart background watcher: Polls port 3600 and opens browser only when server is truly ready
start "" /b powershell -NoProfile -Command "while (-not (Test-NetConnection -ComputerName localhost -Port 3600 -WarningAction SilentlyContinue).TcpTestSucceeded) { Start-Sleep -Milliseconds 300 }; Start-Sleep -Milliseconds 500; Start-Process 'http://localhost:3600'"

:: Start the Next.js production server
call npx next start -H 0.0.0.0 -p 3600

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server terminated with an error.
    pause
)
