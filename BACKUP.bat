@echo off
chcp 65001 >nul 2>nul
title MFC Laboratoire - Sauvegarde complete
color 0F
cd /d "%~dp0"

echo.
echo   +===========================================================+
echo   !                                                           !
echo   !       MAISON FRANCAISE DES CIRES                          !
echo   !       Maitre Cirier depuis 1904                           !
echo   !                                                           !
echo   !       S A U V E G A R D E   C O M P L E T E              !
echo   !                                                           !
echo   +===========================================================+
echo.
echo   Ce script cree une copie complete de l'application
echo   et de toutes vos donnees sur le Bureau.
echo.
pause

:: ============================================================
::  CONFIGURATION
:: ============================================================
set APP_DIR=%~dp0
set DATA_DIR=%APP_DIR%..\mfc-data

:: Generer un nom avec date
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul') do set DT=%%I
set STAMP=%DT:~0,4%-%DT:~4,2%-%DT:~6,2%_%DT:~8,2%h%DT:~10,2%
set BACKUP_NAME=MFC-Backup_%STAMP%
set BACKUP_DIR=%USERPROFILE%\Desktop\%BACKUP_NAME%

echo.
echo   Destination : %BACKUP_DIR%
echo.

:: ============================================================
::  ETAPE 1 : Creer le dossier
:: ============================================================
echo   [1/4] Creation du dossier...
mkdir "%BACKUP_DIR%" 2>nul
if not exist "%BACKUP_DIR%" (
    echo   ERREUR : impossible de creer le dossier.
    pause
    exit /b 1
)
echo   [OK]

:: ============================================================
::  ETAPE 2 : Copier le code source
:: ============================================================
echo   [2/4] Copie du code source (sans node_modules)...
mkdir "%BACKUP_DIR%\mfc-laboratoire" 2>nul

:: Fichiers racine
for %%f in (server.js package.json package-lock.json MFC-Laboratoire.bat INSTALLER.bat MISE-A-JOUR.bat BACKUP.bat update-termux.sh) do (
    if exist "%APP_DIR%%%f" copy "%APP_DIR%%%f" "%BACKUP_DIR%\mfc-laboratoire\" >nul 2>nul
)

:: Dossiers
if exist "%APP_DIR%public" xcopy "%APP_DIR%public" "%BACKUP_DIR%\mfc-laboratoire\public\" /E /I /Q /Y >nul 2>nul
if exist "%APP_DIR%modules" xcopy "%APP_DIR%modules" "%BACKUP_DIR%\mfc-laboratoire\modules\" /E /I /Q /Y >nul 2>nul
if exist "%APP_DIR%seed" xcopy "%APP_DIR%seed" "%BACKUP_DIR%\mfc-laboratoire\seed\" /E /I /Q /Y >nul 2>nul

echo   [OK] Code source copie

:: ============================================================
::  ETAPE 3 : Copier les donnees
:: ============================================================
echo   [3/4] Copie des donnees (mfc-data)...
if exist "%DATA_DIR%" (
    xcopy "%DATA_DIR%" "%BACKUP_DIR%\mfc-data\" /E /I /Q /Y >nul 2>nul
    echo   [OK] Donnees copiees
    if exist "%DATA_DIR%\database.sqlite" echo        - Base de donnees OK
    if exist "%DATA_DIR%\documents" echo        - Documents OK
    if exist "%DATA_DIR%\backups" echo        - Backups OK
) else (
    echo   [INFO] Pas de dossier mfc-data trouve.
    mkdir "%BACKUP_DIR%\mfc-data" 2>nul
    mkdir "%BACKUP_DIR%\mfc-data\backups" 2>nul
)

:: ============================================================
::  ETAPE 4 : Creer le fichier d'info
:: ============================================================
echo   [4/4] Creation du fichier LISEZMOI...

echo MFC Laboratoire - Sauvegarde Complete> "%BACKUP_DIR%\LISEZMOI.txt"
echo.>> "%BACKUP_DIR%\LISEZMOI.txt"
echo Date : %date% %time%>> "%BACKUP_DIR%\LISEZMOI.txt"
echo Poste : %COMPUTERNAME%>> "%BACKUP_DIR%\LISEZMOI.txt"
echo.>> "%BACKUP_DIR%\LISEZMOI.txt"
echo POUR RESTAURER SUR UN AUTRE PC :>> "%BACKUP_DIR%\LISEZMOI.txt"
echo.>> "%BACKUP_DIR%\LISEZMOI.txt"
echo 1. Installez les prerequis :>> "%BACKUP_DIR%\LISEZMOI.txt"
echo    - Node.js LTS depuis https://nodejs.org>> "%BACKUP_DIR%\LISEZMOI.txt"
echo    - Python 3.12+ depuis https://python.org>> "%BACKUP_DIR%\LISEZMOI.txt"
echo    - Tesseract OCR + langue French>> "%BACKUP_DIR%\LISEZMOI.txt"
echo.>> "%BACKUP_DIR%\LISEZMOI.txt"
echo 2. Copiez les 2 dossiers cote a cote :>> "%BACKUP_DIR%\LISEZMOI.txt"
echo    mfc-laboratoire\   le code>> "%BACKUP_DIR%\LISEZMOI.txt"
echo    mfc-data\           les donnees>> "%BACKUP_DIR%\LISEZMOI.txt"
echo.>> "%BACKUP_DIR%\LISEZMOI.txt"
echo 3. Lancez INSTALLER.bat dans mfc-laboratoire>> "%BACKUP_DIR%\LISEZMOI.txt"
echo 4. Puis MFC-Laboratoire.bat pour demarrer>> "%BACKUP_DIR%\LISEZMOI.txt"

echo   [OK]

:: ============================================================
::  RAPPORT
:: ============================================================
echo.
echo.
echo   +===========================================================+
echo   !       SAUVEGARDE TERMINEE !                                !
echo   +===========================================================+
echo.
echo   Emplacement : %BACKUP_DIR%
echo.
echo   Contenu :
echo     mfc-laboratoire\   Code source
echo     mfc-data\          Base + documents + backups
echo     LISEZMOI.txt       Instructions de restauration
echo.
echo   Pour transferer : copiez le dossier sur cle USB ou NAS.
echo   Sur le nouveau PC : lancez INSTALLER.bat puis MFC-Laboratoire.bat
echo.

choice /c OF /m "   Ouvrir le dossier (O) ou Fermer (F) ? "
if %errorlevel% equ 1 (
    explorer "%BACKUP_DIR%"
)
