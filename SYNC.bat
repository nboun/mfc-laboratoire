@echo off
chcp 65001 >nul
echo.
echo ═══════════════════════════════════════
echo   MFC Laboratoire — Synchro GitHub
echo ═══════════════════════════════════════
echo.

:: Trouver la DB (dans le repo ou à côté)
set "DB_REPO=%~dp0mfc-data\database.sqlite"
set "DB_PARENT=%~dp0..\mfc-data\database.sqlite"

if exist "%DB_PARENT%" (
    echo [1/4] Copie de la base de données dans le repo...
    if not exist "%~dp0mfc-data" mkdir "%~dp0mfc-data"
    copy /Y "%DB_PARENT%" "%DB_REPO%" >nul
    echo       ✓ database.sqlite copié
) else if exist "%DB_REPO%" (
    echo [1/4] Base déjà dans le repo ✓
) else (
    echo ❌ Aucune base trouvée !
    pause
    exit /b 1
)

echo.
echo [2/4] Git add...
cd /d "%~dp0"
git add mfc-data\database.sqlite
git add -A

echo.
echo [3/4] Git commit...
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set "TODAY=%%c-%%b-%%a"
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set "NOW=%%a:%%b"
git commit -m "sync DB %TODAY% %NOW%"

echo.
echo [4/4] Git push...
git push origin main

echo.
echo ═══════════════════════════════════════
echo   ✓ Synchronisation terminée
echo   Tu peux faire "git pull" depuis
echo   n'importe quel autre PC.
echo ═══════════════════════════════════════
echo.
pause
