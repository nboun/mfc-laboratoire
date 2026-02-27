@echo off
chcp 65001 >nul
cd /d "%~dp0"

:: Lire la version
set "APP_VERSION=?"
for /f "tokens=2 delims=:," %%a in ('findstr /c:"\"version\"" package.json') do (
    set "APP_VERSION=%%~a"
)
set "APP_VERSION=%APP_VERSION: =%"
set "APP_VERSION=%APP_VERSION:"=%"
title MFC Laboratoire v%APP_VERSION% — DD PORTABLE

cls
echo.
echo       ╔═══════════════════════════════════════════╗
echo       :                                           :
echo       :   ╔╦╗╔═╗╔═╗  ╦  ╔═╗╔╗ ╔═╗╦═╗╔═╗╔╦╗╔═╗  :
echo       :   ║║║╠╣ ║    ║  ╠═╣╠╩╗║ ║╠╦╝╠═╣ ║ ║ ║  :
echo       :   ╩ ╩╚  ╚═╝  ╩═╝╚ ╝╚═╝╚═╝╩╚═╚ ╝ ╩ ╚═╝  :
echo       :                   v%APP_VERSION%  [PORTABLE]               :
echo       :     Maitre Cirier depuis 1904              :
echo       ╚═══════════════════════════════════════════╝
echo.

:: Vérifier Node.js
node -v >nul 2>&1
if errorlevel 1 (
    echo  ❌ Node.js non trouvé. Installer depuis https://nodejs.org
    pause
    exit /b 1
)

:: Vérifier la base
if exist "mfc-data\database.sqlite" (
    echo  ✓ Base de données trouvée dans le repo
) else if exist "..\mfc-data\database.sqlite" (
    echo  ✓ Base de données trouvée à côté du repo
) else (
    echo  ⚠ Aucune base trouvée — une base vide sera créée
)

:: Vérifier node_modules
if not exist "node_modules" (
    echo.
    echo  Installation des dépendances...
    call npm install
)

echo.
echo  Démarrage du serveur...
echo  ─────────────────────────────────────────
echo.
node server.js
pause
