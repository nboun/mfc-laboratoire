@echo off
chcp 65001 >nul
cd /d "%~dp0"

:: Lire la version
set "APP_VERSION=?"
for /f "tokens=2 delims=:," %%a in ('findstr /c:"\"version\"" package.json 2^>nul') do (
    set "APP_VERSION=%%~a"
)
set "APP_VERSION=%APP_VERSION: =%"
set "APP_VERSION=%APP_VERSION:"=%"
title MFC Laboratoire v%APP_VERSION%

cls
echo.
echo       ╔═══════════════════════════════════════════╗
echo       :                                           :
echo       :   ╔╦╗╔═╗╔═╗  ╦  ╔═╗╔╗ ╔═╗╦═╗╔═╗╔╦╗╔═╗  :
echo       :   ║║║╠╣ ║    ║  ╠═╣╠╩╗║ ║╠╦╝╠═╣ ║ ║ ║  :
echo       :   ╩ ╩╚  ╚═╝  ╩═╝╚ ╝╚═╝╚═╝╩╚═╚ ╝ ╩ ╚═╝  :
echo       :                   v%APP_VERSION%                           :
echo       :     Maitre Cirier depuis 1904              :
echo       ╚═══════════════════════════════════════════╝
echo.

:: ═══════ VÉRIFICATIONS ═══════

node -v >nul 2>&1
if errorlevel 1 (
    echo  ❌ Node.js non trouvé. Installer depuis https://nodejs.org
    pause
    exit /b 1
)

git --version >nul 2>&1
if errorlevel 1 (
    echo  ❌ Git non trouvé. Installer depuis https://git-scm.com
    pause
    exit /b 1
)

:: ═══════ MISE À JOUR GITHUB ═══════

echo  [1/4] Synchronisation GitHub...
git pull origin main 2>nul
if errorlevel 1 (
    echo        ⚠ Pull échoué — on continue avec la version locale
) else (
    echo        ✓ Code à jour
)

:: ═══════ DÉPENDANCES ═══════

if not exist "node_modules" (
    echo.
    echo  [2/4] Installation des dépendances...
    call npm install
    echo        ✓ Dépendances installées
) else (
    echo  [2/4] Dépendances ✓
)

:: ═══════ BASE DE DONNÉES ═══════

echo  [3/4] Base de données...

:: Priorité 1 : dans le repo (mfc-data/)
if exist "mfc-data\database.sqlite" (
    echo        ✓ Base trouvée dans le repo
    goto :db_ok
)

:: Priorité 2 : à côté du repo (C:\MFC\mfc-data\ ou ..\mfc-data\)
if exist "..\mfc-data\database.sqlite" (
    echo        ✓ Base trouvée à côté du repo
    if not exist "mfc-data" mkdir "mfc-data"
    copy /Y "..\mfc-data\database.sqlite" "mfc-data\database.sqlite" >nul
    echo        ✓ Copie dans le repo pour synchro
    goto :db_ok
)

:: Priorité 3 : C:\MFC\mfc-data (chemin bureau fixe)
if exist "C:\MFC\mfc-data\database.sqlite" (
    echo        ✓ Base trouvée dans C:\MFC\mfc-data\
    if not exist "mfc-data" mkdir "mfc-data"
    copy /Y "C:\MFC\mfc-data\database.sqlite" "mfc-data\database.sqlite" >nul
    echo        ✓ Copie dans le repo pour synchro
    goto :db_ok
)

echo        ⚠ Aucune base trouvée — une base vide sera créée

:db_ok

:: ═══════ LANCEMENT ═══════

:: Detect IP
echo  [4/4] Démarrage du serveur...
echo.
echo  ─────────────────────────────────────────
echo.
node server.js

:: ═══════ SYNCHRO APRÈS ARRÊT ═══════

echo.
echo  ─────────────────────────────────────────
echo.
echo  Serveur arrêté.
echo.

:: Synchro DB vers repo si elle est externe
if exist "..\mfc-data\database.sqlite" (
    if not exist "mfc-data" mkdir "mfc-data"
    copy /Y "..\mfc-data\database.sqlite" "mfc-data\database.sqlite" >nul
    echo  ✓ Base copiée dans le repo
)
if exist "C:\MFC\mfc-data\database.sqlite" (
    if not exist "mfc-data" mkdir "mfc-data"
    copy /Y "C:\MFC\mfc-data\database.sqlite" "mfc-data\database.sqlite" >nul
    echo  ✓ Base copiée dans le repo
)

set /p SYNC="  Synchroniser vers GitHub ? (O/N) : "
if /i "%SYNC%"=="O" (
    echo.
    echo  Synchronisation...
    git add mfc-data\database.sqlite
    git add -A
    for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set "TODAY=%%c-%%b-%%a"
    for /f "tokens=1-2 delims=: " %%a in ('time /t') do set "NOW=%%a:%%b"
    git commit -m "sync DB %TODAY% %NOW%"
    git push origin main
    echo.
    echo  ✓ Tout synchronisé sur GitHub
)

echo.
pause
