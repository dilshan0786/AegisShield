@echo off
title AegisShield Secure Uninstaller
echo ====================================================
echo        AEGIS SHIELD - SECURE UNINSTALLER
echo ====================================================
echo Checking master password authentication...
cd /d "%~dp0"
node engine/uninstall-guard.js
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Uninstallation authorized. Protection removed.
    pause
) else (
    echo.
    echo [DENIED] AegisShield cannot be uninstalled without Master Password!
    pause
)
