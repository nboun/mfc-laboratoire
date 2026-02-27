@echo off
chcp 65001 >nul 2>nul
title MFC Laboratoire - Mise a jour
color 0E
mode con: cols=65 lines=40
cd /d "%~dp0"

echo.
echo    +===================================================+
echo    |                                                   |
echo    |       M I S E   A   J O U R                       |
echo    |                                                   |
echo    |       MFC Laboratoire                             |
echo    |       Maison Francaise des Cires                  |
echo    |                                                   |
echo    +===================================================+
echo.

:: ------------------------------------------------------
:: ETAPE 1 : Arreter le serveur s'il tourne
:: ------------------------------------------------------
echo    [1/5] Arret du serveur...
taskkill /fi "WINDOWTITLE eq MFC-Server" /f >nul 2>nul
netstat -aon 2>nul | findstr ":3000.*LISTENING" >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000.*LISTENING"') do (
        taskkill /pid %%a /f >nul 2>nul
    )
    timeout /t 2 /nobreak >nul
    echo          OK - Serveur arrete.
) else (
    echo          OK - Serveur deja arrete.
)
echo.

:: ------------------------------------------------------
:: ETAPE 2 : Detecter le dossier ZIP extrait
:: ------------------------------------------------------
echo    [2/5] Recherche de la mise a jour...

:: Le script est dans le dossier mfc-laboratoire.
:: On cherche un dossier frere "mfc-laboratoire" issu du ZIP
:: OU des fichiers ZIP dans le dossier parent / Downloads

set "UPDATE_SRC="

:: Cas 1 : dossier "update" à côté du script
if exist "update\server.js" (
    set "UPDATE_SRC=update"
    echo          Trouve : update\
    goto found_update
)

:: Cas 2 : dossier "mfc-laboratoire" à côté (issu du ZIP extrait dans le même dossier parent)
if exist "..\mfc-laboratoire-v5_17_0\mfc-laboratoire\server.js" (
    set "UPDATE_SRC=..\mfc-laboratoire-v5_17_0\mfc-laboratoire"
    echo          Trouve dans dossier ZIP extrait.
    goto found_update
)

:: Cas 3 : dossier Downloads de l'utilisateur
if exist "%USERPROFILE%\Downloads\mfc-laboratoire-v5_17_0\mfc-laboratoire\server.js" (
    set "UPDATE_SRC=%USERPROFILE%\Downloads\mfc-laboratoire-v5_17_0\mfc-laboratoire"
    echo          Trouve dans Downloads.
    goto found_update
)

:: Cas 4 : dossier mfc-laboratoire directement dans Downloads
if exist "%USERPROFILE%\Downloads\mfc-laboratoire\server.js" (
    set "UPDATE_SRC=%USERPROFILE%\Downloads\mfc-laboratoire"
    echo          Trouve dans Downloads\mfc-laboratoire.
    goto found_update
)

:: Cas 5 : Ce script EST dans le nouveau dossier extrait
:: (l'utilisateur a extrait le zip et a lancé MISE-A-JOUR.bat depuis le nouveau dossier)
:: Vérifier si un dossier frère contient l'ancienne install
if exist "..\mfc-data\database.sqlite" (
    echo          Ce dossier est deja a jour.
    echo          Les fichiers sont en place.
    goto skip_copy
)

:: Pas trouvé -> demander à l'utilisateur
echo.
echo    +===================================================+
echo    |  SOURCE NON TROUVEE                               |
echo    |                                                   |
echo    |  Methode simple :                                 |
echo    |                                                   |
echo    |  1. Telecharger le ZIP depuis Claude              |
echo    |  2. Extraire le ZIP (clic droit - Extraire tout)  |
echo    |  3. Dans le dossier extrait, prendre le dossier   |
echo    |     "mfc-laboratoire" et le renommer "update"     |
echo    |  4. Glisser "update" ICI, dans votre dossier      |
echo    |     mfc-laboratoire actuel                        |
echo    |  5. Relancer MISE-A-JOUR.bat                      |
echo    |                                                   |
echo    |  Structure :                                      |
echo    |    mfc-laboratoire\           ^<-- vous etes ici   |
echo    |      |---- update\              ^<-- nouveau code    |
echo    |      |---- server.js            (ancien)            |
echo    |      \---- MISE-A-JOUR.bat      (ce script)        |
echo    +===================================================+
echo.
pause
exit /b 1

:found_update

:: ------------------------------------------------------
:: ETAPE 3 : Copier les fichiers (sauf node_modules et database)
:: ------------------------------------------------------
echo.
echo    [3/5] Copie des fichiers...

:: Copier tout sauf node_modules et database.sqlite
xcopy "%UPDATE_SRC%\*" "." /s /y /exclude:exclude-update.txt >nul 2>nul
if %errorlevel% neq 0 (
    :: xcopy exclude file doesn't exist, create it and retry
    echo node_modules> exclude-update.txt
    echo database.sqlite>> exclude-update.txt
    echo .sqlite>> exclude-update.txt
    xcopy "%UPDATE_SRC%\*" "." /s /y /exclude:exclude-update.txt >nul 2>nul
)

:: Copier les sous-dossiers importants explicitement
if exist "%UPDATE_SRC%\modules" (
    xcopy "%UPDATE_SRC%\modules\*" "modules\" /s /y >nul 2>nul
)
if exist "%UPDATE_SRC%\public" (
    xcopy "%UPDATE_SRC%\public\*" "public\" /s /y >nul 2>nul
)

:: Copier les fichiers racine un par un pour être sûr
for %%f in (server.js package.json MFC-Laboratoire.bat INSTALLER.bat MISE-A-JOUR.bat) do (
    if exist "%UPDATE_SRC%\%%f" (
        copy /y "%UPDATE_SRC%\%%f" "%%f" >nul 2>nul
    )
)

echo          OK - Fichiers mis a jour.

:: Nettoyer le fichier d'exclusion temporaire
del exclude-update.txt >nul 2>nul

echo.

:skip_copy

:: ------------------------------------------------------
:: ETAPE 4 : Verifier les dependances npm
:: ------------------------------------------------------
echo    [4/5] Verification des dependances...
if exist "node_modules" (
    call npm install --production >nul 2>nul
    echo          OK - Dependances verifiees.
) else (
    echo          Installation des dependances npm...
    call npm install --production >nul 2>nul
    if %errorlevel% equ 0 (
        echo          OK - Dependances installees.
    ) else (
        echo          ERREUR npm install.
        echo          Verifiez la connexion internet.
    )
)

:: Vérifier PyMuPDF
where python >nul 2>nul
if %errorlevel% equ 0 (
    python -c "import fitz" >nul 2>nul
    if %errorlevel% neq 0 (
        echo          Installation de PyMuPDF...
        python -m pip install pymupdf --quiet >nul 2>nul
        if %errorlevel% equ 0 (
            echo          OK - PyMuPDF installe.
        ) else (
            echo          Attention : PyMuPDF non installe.
            echo          Lancez : python -m pip install pymupdf
        )
    ) else (
        echo          OK - PyMuPDF disponible.
    )
)
echo.

:: ------------------------------------------------------
:: ETAPE 5 : Forcer le vidage du cache navigateur
:: ------------------------------------------------------
echo    [5/5] Nettoyage du cache navigateur...

:: Créer un fichier flag que le cache-buster détectera
echo %date% %time% > public\.cache-reset
echo          OK - Cache invalide.
echo.

:: ------------------------------------------------------
:: TERMINE - Relancer ?
:: ------------------------------------------------------

:: Lire la version depuis package.json
for /f "tokens=2 delims=:," %%a in ('findstr "version" package.json') do (
    set "NEW_VER=%%~a"
)

echo.
echo    +===================================================+
echo    |                                                   |
echo    |    MISE A JOUR TERMINEE !                         |
echo    |                                                   |
echo    |    Version : %NEW_VER%                              |
echo    |                                                   |
echo    |    Lancez MFC-Laboratoire.bat pour demarrer.      |
echo    |    Dans le navigateur : Ctrl+Shift+R              |
echo    |                                                   |
echo    +===================================================+
echo.

choice /c ON /m "    Lancer MFC Laboratoire maintenant ? (O/N) "
if %errorlevel% equ 1 (
    start "" "MFC-Laboratoire.bat"
)

echo.
echo    A bientot !
timeout /t 3 /nobreak >nul
