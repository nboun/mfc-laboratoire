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
echo       ========================================
echo       =                                      =
echo       =   MFC LABORATOIRE                    =
echo       =   v%APP_VERSION%                              =
echo       =   Maitre Cirier depuis 1904           =
echo       =                                      =
echo       ========================================
echo.

:: Ouvrir Claude
start https://claude.ai
echo  [OK] Claude ouvert dans le navigateur

:: Git pull
git pull origin main 2>nul
if errorlevel 1 (
    echo  [!!] Pull echoue - version locale
) else (
    echo  [OK] Code a jour
)

:: npm install
if not exist "node_modules" (
    echo  [..] Installation des dependances...
    call npm install >nul 2>&1
)
echo  [OK] Dependances OK

:: Base de donnees
if not exist "mfc-data" mkdir "mfc-data"
if exist "..\mfc-data\database.sqlite" (
    copy /Y "..\mfc-data\database.sqlite" "mfc-data\database.sqlite" >nul
    echo  [OK] Base copiee depuis mfc-data externe
) else if exist "C:\MFC\mfc-data\database.sqlite" (
    copy /Y "C:\MFC\mfc-data\database.sqlite" "mfc-data\database.sqlite" >nul
    echo  [OK] Base copiee depuis C:\MFC\mfc-data\
) else if exist "mfc-data\database.sqlite" (
    echo  [OK] Base presente
) else (
    echo  [!!] Aucune base - creation automatique au demarrage
)

:: Info chemin
echo.
echo  -----------------------------------------
echo  Chemin application : %~dp0
echo  Base de donnees    : %~dp0mfc-data\database.sqlite
echo  Repo GitHub        : https://github.com/nboun/mfc-laboratoire.git
echo  -----------------------------------------
echo.

:: Ouvrir app dans le navigateur apres 3s
timeout /t 3 /nobreak >nul
start http://localhost:3000

:: Lancement
node server.js

:: Synchro auto apres arret
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
git push origin main 2>nul
if errorlevel 1 (
    echo  [!!] Push echoue
) else (
    echo  [OK] Synchronise sur GitHub
)

echo.
pause
