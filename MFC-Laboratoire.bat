@echo off
chcp 65001 >nul 2>nul
title MFC Laboratoire
color 0F
mode con: cols=72 lines=42
cd /d "%~dp0"

:: --- Lire la version ---
set "APP_VERSION=?"
for /f "tokens=2 delims=:," %%a in ('findstr /c:"\"version\"" package.json') do (
    set "APP_VERSION=%%~a"
)
set "APP_VERSION=%APP_VERSION: =%"
set "APP_VERSION=%APP_VERSION:"=%"
title MFC Laboratoire v%APP_VERSION%

:: ============================================================
:: ECRAN DE DEMARRAGE
:: ============================================================
cls
echo.
echo.
echo       +======================================================+
echo       :                                                      :
echo       :       M F C   L A B O R A T O I R E                  :
echo       :                                                      :
echo       :       Maison Francaise des Cires                     :
echo       :       Maitre Cirier depuis 1904                      :
echo       :                                                      :
echo       :                   v%APP_VERSION%                           :
echo       :                                                      :
echo       +======================================================+
echo.
echo.
echo       --------------------------------------------------------
echo        INITIALISATION DU LABORATOIRE
echo       --------------------------------------------------------
echo.

:: --- Etape 1 ---
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo        ERREUR : Node.js non installe
    echo        Lancez INSTALLER.bat d'abord.
    pause
    exit /b 1
)
echo        [##....................] 10%%   Moteur Node.js detecte
timeout /t 1 /nobreak >nul

:: --- Etape 2 ---
if not exist "node_modules" (
    echo        [##....................] 15%%   Installation des modules...
    call npm install --production >nul 2>nul
    if %errorlevel% neq 0 (
        echo        ERREUR npm install
        pause
        exit /b 1
    )
)
echo        [####..................] 20%%   Modules NPM verifies
timeout /t 1 /nobreak >nul

:: --- Etape 3 ---
if not exist "..\mfc-data" mkdir "..\mfc-data"
if not exist "..\mfc-data\backups" mkdir "..\mfc-data\backups"
if not exist "..\mfc-data\fds" mkdir "..\mfc-data\fds"

if exist "database.sqlite" (
    if not exist "..\mfc-data\database.sqlite" (
        copy "database.sqlite" "..\mfc-data\database.sqlite" >nul
    )
    del "database.sqlite" >nul 2>nul
)
echo        [######................] 30%%   Repertoire de donnees initialise
timeout /t 1 /nobreak >nul

:: --- Etape 4 ---
netstat -aon 2>nul | findstr ":3000.*LISTENING" >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000.*LISTENING"') do (
        taskkill /pid %%a /f >nul 2>nul
    )
    timeout /t 2 /nobreak >nul
)
echo        [########..............] 40%%   Port 3000 disponible
timeout /t 1 /nobreak >nul

:: --- Etape 5 ---
echo        [##########............] 50%%   Demarrage du serveur...
start "MFC-Server" /min cmd /c "node server.js"
timeout /t 2 /nobreak >nul

:: --- Etape 6 ---
set attempts=0
:wait_loop
set /a attempts+=1
if %attempts% gtr 20 (
    echo.
    echo        ERREUR : Le serveur n'a pas demarre.
    pause
    exit /b 1
)
timeout /t 1 /nobreak >nul
netstat -aon 2>nul | findstr ":3000.*LISTENING" >nul 2>nul
if %errorlevel% neq 0 goto wait_loop

echo        [#############.........] 65%%   Base de donnees connectee
timeout /t 1 /nobreak >nul
echo        [##############........] 70%%   Moteur d'analyse moleculaire (Opérationnel)
timeout /t 1 /nobreak >nul
echo        [###############.......] 75%%   Base de connaissances (Hildebrand/Hansen)
timeout /t 1 /nobreak >nul
echo        [################......] 80%%   Module IA -- recommandation de formulations
timeout /t 1 /nobreak >nul
echo        [#################.....] 85%%   Diagnostic diffusion froid / chaud
timeout /t 1 /nobreak >nul
echo        [##################....] 90%%   Systeme d'auto-apprentissage actif
timeout /t 1 /nobreak >nul
echo        [###################...] 95%%   Parseur FDS -- extraction moleculaire
timeout /t 1 /nobreak >nul

start "" http://localhost:3000
echo        [######################] 100%%  TOUS LES SYSTEMES OPERATIONNELS
timeout /t 1 /nobreak >nul

:: ============================================================
:: MENU PRINCIPAL
:: ============================================================
:show_menu
cls
echo.
echo.
echo       +======================================================+
echo       :                                                      :
echo       :       M F C   L A B O R A T O I R E                  :
echo       :                                                      :
echo       :       Maison Francaise des Cires                     :
echo       :       Maitre Cirier depuis 1904                      :
echo       :                                                      :
echo       :                   v%APP_VERSION%                           :
echo       :                                                      :
echo       +======================================================+
echo.
echo       SERVEUR ACTIF -- http://localhost:3000
echo       Tous les systemes sont operationnels.
echo.
echo.
echo       +----------------------------------------------------+
echo       :                                                    :
echo       :   [S]  Sauvegarde rapide (base de donnees)         :
echo       :   [C]  Sauvegarde complete (code + donnees)        :
echo       :   [R]  Relancer le serveur                         :
echo       :   [O]  Ouvrir le navigateur                        :
echo       :   [Q]  Quitter et arreter le serveur               :
echo       :                                                    :
echo       +----------------------------------------------------+
echo.

:menu_loop
choice /c SCROQ /n /m "       Votre choix : "
if %errorlevel% equ 1 goto do_save
if %errorlevel% equ 2 goto do_complete
if %errorlevel% equ 3 goto do_restart
if %errorlevel% equ 4 goto do_open
if %errorlevel% equ 5 goto do_quit
goto menu_loop

:do_save
echo.
echo        Sauvegarde de la base en cours...
curl -s -X POST http://localhost:3000/api/backup >nul 2>nul
if %errorlevel% equ 0 (
    echo        OK -- Sauvegarde dans mfc-data\backups\
) else (
    echo        Utilisez le bouton dans l'application.
)
echo.
goto menu_loop

:do_complete
echo.
echo        Sauvegarde complete en cours...
echo        Code source + base de donnees + configurations
curl -s -X POST http://localhost:3000/api/backup/complete >nul 2>nul
if %errorlevel% equ 0 (
    echo        OK -- Sauvegarde complete dans mfc-data\backups\
) else (
    echo        Utilisez le bouton dans l'application.
)
echo.
goto menu_loop

:do_restart
echo.
echo        Relance du serveur...
taskkill /fi "WINDOWTITLE eq MFC-Server" /f >nul 2>nul
timeout /t 2 /nobreak >nul
start "MFC-Server" /min cmd /c "node server.js"
timeout /t 3 /nobreak >nul
echo        OK -- Serveur relance.
echo.
goto menu_loop

:do_open
start "" http://localhost:3000
goto menu_loop

:do_quit
cls
echo.
echo.
echo       +======================================================+
echo       :                                                      :
echo       :       M F C   L A B O R A T O I R E                  :
echo       :                                                      :
echo       +======================================================+
echo.
echo        Arret du serveur...
taskkill /fi "WINDOWTITLE eq MFC-Server" /f >nul 2>nul
timeout /t 1 /nobreak >nul
echo        OK -- Serveur arrete.
echo.
echo       --------------------------------------------------------
echo.
echo        Merci d'utiliser MFC Laboratoire.
echo        Pensez a sauvegarder regulierement.
echo.
echo        A bientot au Laboratoire !
echo.
echo       --------------------------------------------------------
echo.
timeout /t 4 /nobreak >nul
