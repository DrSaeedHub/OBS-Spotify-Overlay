@echo off
:: ------------------------------------------------------------
:: GrantIISAccess.bat
:: ------------------------------------------------------------
:: Grants IUSR and IIS_IUSRS Full Control on the folder
:: containing this script (and all subfolders/files).
:: ------------------------------------------------------------

:: 1) Check for Administrator privileges
net session >nul 2>&1
if %errorlevel% NEQ 0 (
    echo.
    echo This script must be run as Administrator.
    echo Right-click this file and select "Run as administrator."
    pause
    exit /b 1
)

:: 2) Capture the folder of this script into TARGET_FOLDER
set "TARGET_FOLDER=%~dp0"

:: 3) Remove any trailing backslash from TARGET_FOLDER
if "%TARGET_FOLDER:~-1%"=="\" (
    set "TARGET_FOLDER=%TARGET_FOLDER:~0,-1%"
)

:: 4) Show what we’re about to do
echo Granting Full Control to IUSR and IIS_IUSRS on:
echo %TARGET_FOLDER%
echo.

:: 5) Run icacls to grant Full Control
icacls "%TARGET_FOLDER%" /grant IUSR:(F) /T /C
icacls "%TARGET_FOLDER%" /grant "IIS_IUSRS":(F) /T /C

echo.
echo Done! Permissions have been updated.
pause
