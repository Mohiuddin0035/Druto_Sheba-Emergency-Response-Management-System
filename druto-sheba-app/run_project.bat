@echo off
title Druto Sheba - Emergency Response System Launcher
color 0A

echo ================================================================
echo    EMERGENCY RESPONSE SYSTEM (DRUTO SHEBA) - ONE-CLICK LAUNCHER
echo ================================================================
echo.

:: Move to script directory
cd /d "%~dp0"

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

:: Check if .next build exists
if not exist ".next" (
    echo [*] Pre-compiling project for lightning-fast performance...
    call npm run build
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Build failed.
        pause
        exit /b 1
    )
)

echo [*] Starting Next.js Local Server on port 3600...
echo [*] Opening browser instantly at http://localhost:3600...
echo.

:: Smart background watcher: Polls port 3600 and opens browser only when server is truly ready
start "" /b powershell -NoProfile -Command "while (-not (Test-NetConnection -ComputerName localhost -Port 3600 -WarningAction SilentlyContinue).TcpTestSucceeded) { Start-Sleep -Milliseconds 300 }; Start-Sleep -Milliseconds 500; Start-Process 'http://localhost:3600'"

:: Start the Next.js production server (instant 70ms response time, zero lag, no black screen!)
call npx next start -H localhost -p 3600

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server terminated with an error.
    pause
)
