@echo off
title AegisShield - Enable Windows Boot Protection
echo ====================================================
echo    AEGIS SHIELD - INSTALL AUTOSTART ON SYSTEM BOOT
echo ====================================================

set APP_DIR=%~dp0
set VBS_PATH=%APP_DIR%start-hidden.vbs

echo Configuring Windows Startup Registry...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "AegisShield" /t REG_SZ /d "wscript.exe \"%VBS_PATH%\"" /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] AegisShield will now automatically start on every Windows boot!
    echo Protection is locked and guarded against unauthorized termination.
) else (
    echo.
    echo [ERROR] Failed to write startup key. Please run as Administrator.
)
pause
