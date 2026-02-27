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

:: ═══════ OUVRIR CLAUDE ═══════
start https://claude.ai
echo  ✓ Claude ouvert dans le navigateur

:: ═══════ GIT PULL ═══════
git pull origin main 2>nul && echo  ✓ Code à jour || echo  ⚠ Pull échoué — version locale

:: ═══════ NPM INSTALL ═══════
if not exist "node_modules" (
    echo  ✓ Installation des dépendances...
    call npm install >nul 2>&1
)
echo  ✓ Dépendances OK

:: ═══════ BASE DE DONNÉES ═══════
if not exist "mfc-data" mkdir "mfc-data"
if exist "..\mfc-data\database.sqlite" (
    copy /Y "..\mfc-data\database.sqlite" "mfc-data\database.sqlite" >nul
    echo  ✓ Base copiée depuis mfc-data externe
) else if exist "C:\MFC\mfc-data\database.sqlite" (
    copy /Y "C:\MFC\mfc-data\database.sqlite" "mfc-data\database.sqlite" >nul
    echo  ✓ Base copiée depuis C:\MFC\mfc-data\
) else if exist "mfc-data\database.sqlite" (
    echo  ✓ Base présente
) else (
    echo  ⚠ Aucune base — création automatique au démarrage
)

:: ═══════ INFO CHEMIN POUR CLAUDE ═══════
echo.
echo  ─────────────────────────────────────────
echo  Chemin de l'application : %~dp0
echo  Base de données         : %~dp0mfc-data\database.sqlite
echo  Repo GitHub             : https://github.com/nboun/mfc-laboratoire.git
echo  ─────────────────────────────────────────
echo.
echo  Donne ces infos à Claude si besoin.
echo.

:: ═══════ OUVRIR L'APP DANS LE NAVIGATEUR ═══════
timeout /t 3 /nobreak >nul
start http://localhost:3000

:: ═══════ LANCEMENT ═══════
node server.js

:: ═══════ SYNCHRO AUTO APRÈS ARRÊT ═══════
echo.
echo  Synchronisation GitHub...

if exist "..\mfc-data\database.sqlite" (
    copy /Y "..\mfc-data\database.sqlite" "mfc-data\database.sqlite" >nul
) else if exist "C:\MFC\mfc-data\database.sqlite" (
    copy /Y "C:\MFC\mfc-data\database.sqlite" "mfc-data\database.sqlite" >nul
)

git add mfc-data\database.sqlite 2>nul
git add -A 2>nul
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set "TODAY=%%c-%%b-%%a"
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set "NOW=%%a:%%b"
git commit -m "sync %TODAY% %NOW%" 2>nul
git push origin main 2>nul && echo  ✓ Synchronisé sur GitHub || echo  ⚠ Push échoué

echo.
pause
