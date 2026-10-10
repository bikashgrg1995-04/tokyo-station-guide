@echo off
title Tokyo Station Guide - Cloudflare Tunnel
cd /d "%~dp0"

echo.
echo ==========================================
echo   Tokyo Station Guide
echo   Astro + Cloudflare Quick Tunnel
echo ==========================================
echo.

echo [1/2] Starting Astro dev server...
start "Tokyo Station Guide - Astro" cmd /k "npm run dev"

echo.
echo Waiting for Astro server...
timeout /t 5 /nobreak >nul

echo.
echo [2/2] Starting Cloudflare Tunnel...
echo.
cloudflared tunnel --protocol http2 --url http://localhost:4321

pause