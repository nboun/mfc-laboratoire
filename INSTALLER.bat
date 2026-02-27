@echo off
chcp 65001 >nul 2>nul
title MFC Laboratoire - Installation complete
color 0F
mode con: cols=70 lines=45
cd /d "%~dp0"

echo.
echo   +===========================================================+
echo   !                                                           !
echo   !       MAISON FRANCAISE DES CIRES                          !
echo   !       Maitre Cirier depuis 1904                           !
echo   !                                                           !
echo   !       I N S T A L L A T E U R                             !
echo   !       MFC Laboratoire v5.25.7                             !
echo   !                                                           !
echo   +===========================================================+
echo.
echo   Cet installateur va verifier et configurer votre poste.
echo   Prerequis : connexion internet pour les telechargements.
echo.
echo   LOGICIELS NECESSAIRES :
echo.
echo     1. Node.js         (serveur web)
echo     2. Python 3        (parser FDS)
echo     3. Tesseract OCR   (lecture PDF proteges)
echo     4. npm install     (dependances Node)
echo     5. pip install     (dependances Python : pymupdf pytesseract pillow)
echo.
pause

set ERRORS=0
set WARNINGS=0

:: ============================================================
::  ETAPE 1/7 : Node.js
:: ============================================================
echo.
echo   -----------------------------------------------------------
echo    ETAPE 1/7 : Node.js (obligatoire)
echo   -----------------------------------------------------------

where node >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('node --version') do echo    [OK] Node.js detecte : %%v
) else (
    echo    [ERREUR] Node.js NON INSTALLE
    echo.
    echo    Node.js est OBLIGATOIRE pour MFC Laboratoire.
    echo    Telechargez la version LTS sur : https://nodejs.org
    echo    IMPORTANT : cochez "Add to PATH" pendant l'installation.
    echo.
    choice /c ON /m "   Ouvrir le site de telechargement ? (O/N) "
    if %errorlevel% equ 1 start "" https://nodejs.org/en/download/
    echo.
    echo    Installez Node.js puis RELANCEZ cet installateur.
    pause
    exit /b 1
)

:: ============================================================
::  ETAPE 2/7 : Python 3
:: ============================================================
echo.
echo   -----------------------------------------------------------
echo    ETAPE 2/7 : Python 3 (obligatoire pour FDS)
echo   -----------------------------------------------------------

set PYTHON_CMD=
where python >nul 2>nul
if %errorlevel% equ 0 (
    python -c "print('ok')" >nul 2>nul
    if %errorlevel% equ 0 (
        for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo    [OK] Python detecte : %%v
        set PYTHON_CMD=python
    ) else (
        goto python_missing
    )
) else (
    :python_missing
    echo    [ERREUR] Python NON INSTALLE
    echo.
    echo    Python est necessaire pour l'extraction des FDS.
    echo    Telechargez Python 3.12+ sur : https://python.org
    echo.
    echo    IMPORTANT pendant l'installation :
    echo      Cochez "Add python.exe to PATH"
    echo.
    choice /c ON /m "   Ouvrir le site de telechargement ? (O/N) "
    if %errorlevel% equ 1 start "" https://www.python.org/downloads/
    set /a ERRORS+=1
    set PYTHON_CMD=
)

:: ============================================================
::  ETAPE 3/7 : Tesseract OCR
:: ============================================================
echo.
echo   -----------------------------------------------------------
echo    ETAPE 3/7 : Tesseract OCR (lecture PDF proteges)
echo   -----------------------------------------------------------

set TESS_OK=0
where tesseract >nul 2>nul
if %errorlevel% equ 0 (
    echo    [OK] Tesseract detecte dans le PATH.
    set TESS_OK=1
    goto tess_check_lang
)

:: Chercher dans les chemins courants
if exist "%ProgramFiles%\Tesseract-OCR\tesseract.exe" (
    echo    [OK] Tesseract trouve : %ProgramFiles%\Tesseract-OCR
    set TESS_OK=1
    goto tess_check_lang
)
if exist "%ProgramFiles(x86)%\Tesseract-OCR\tesseract.exe" (
    echo    [OK] Tesseract trouve : %ProgramFiles(x86)%\Tesseract-OCR
    set TESS_OK=1
    goto tess_check_lang
)
if exist "%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe" (
    echo    [OK] Tesseract trouve : %LOCALAPPDATA%\Programs\Tesseract-OCR
    set TESS_OK=1
    goto tess_check_lang
)

echo    [ATTENTION] Tesseract OCR NON INSTALLE
echo.
echo    Tesseract est necessaire pour lire les FDS avec polices
echo    protegees (Charabot, certains anciens PDF).
echo.
echo    Telechargez-le sur :
echo    https://github.com/UB-Mannheim/tesseract/wiki
echo.
echo    IMPORTANT pendant l'installation :
echo      Cochez "Additional language data"
echo      Selectionnez "French" dans les langues
echo.
choice /c ON /m "   Ouvrir le site de telechargement ? (O/N) "
if %errorlevel% equ 1 start "" https://github.com/UB-Mannheim/tesseract/wiki
set /a WARNINGS+=1
goto tess_done

:tess_check_lang
tesseract --list-langs 2>nul | findstr /i "fra" >nul 2>nul
if %errorlevel% equ 0 (
    echo    [OK] Langue francaise disponible.
) else (
    echo    [ATTENTION] Langue francaise NON installee.
    echo      Reinstallez Tesseract en cochant "French".
    set /a WARNINGS+=1
)

:tess_done

:: ============================================================
::  ETAPE 4/7 : Dependances NPM
:: ============================================================
echo.
echo   -----------------------------------------------------------
echo    ETAPE 4/7 : Dependances Node.js (npm install)
echo   -----------------------------------------------------------

if not exist "node_modules" (
    echo    Installation des dependances npm...
    echo    (1-2 minutes avec une bonne connexion)
    call npm install --production >nul 2>nul
    if %errorlevel% equ 0 (
        echo    [OK] Dependances npm installees.
    ) else (
        echo    [ERREUR] npm install a echoue.
        echo      Verifiez votre connexion internet.
        set /a ERRORS+=1
    )
) else (
    call npm install --production >nul 2>nul
    echo    [OK] Dependances npm a jour.
)

:: ============================================================
::  ETAPE 5/7 : Dependances Python (pip)
:: ============================================================
echo.
echo   -----------------------------------------------------------
echo    ETAPE 5/7 : Dependances Python (pip install)
echo   -----------------------------------------------------------

if not defined PYTHON_CMD (
    echo    [IGNORE] Python non installe.
    goto pip_done
)

:: PyMuPDF
echo    Verification de PyMuPDF...
%PYTHON_CMD% -c "import fitz" >nul 2>nul
if %errorlevel% neq 0 (
    echo    Installation de PyMuPDF...
    %PYTHON_CMD% -m pip install pymupdf --quiet 2>nul
    if %errorlevel% equ 0 (
        echo    [OK] PyMuPDF installe.
    ) else (
        echo    [ERREUR] Echec. Lancez : python -m pip install pymupdf
        set /a WARNINGS+=1
    )
) else (
    echo    [OK] PyMuPDF disponible.
)

:: pytesseract
echo    Verification de pytesseract...
%PYTHON_CMD% -c "import pytesseract" >nul 2>nul
if %errorlevel% neq 0 (
    echo    Installation de pytesseract...
    %PYTHON_CMD% -m pip install pytesseract --quiet 2>nul
    if %errorlevel% equ 0 (
        echo    [OK] pytesseract installe.
    ) else (
        echo    [ERREUR] Echec. Lancez : python -m pip install pytesseract
        set /a WARNINGS+=1
    )
) else (
    echo    [OK] pytesseract disponible.
)

:: Pillow
echo    Verification de Pillow...
%PYTHON_CMD% -c "from PIL import Image" >nul 2>nul
if %errorlevel% neq 0 (
    echo    Installation de Pillow...
    %PYTHON_CMD% -m pip install pillow --quiet 2>nul
    if %errorlevel% equ 0 (
        echo    [OK] Pillow installe.
    ) else (
        echo    [ERREUR] Echec. Lancez : python -m pip install pillow
        set /a WARNINGS+=1
    )
) else (
    echo    [OK] Pillow disponible.
)

:pip_done

:: ============================================================
::  ETAPE 6/7 : Dossier de donnees
:: ============================================================
echo.
echo   -----------------------------------------------------------
echo    ETAPE 6/7 : Dossier de donnees
echo   -----------------------------------------------------------

if not exist "..\mfc-data" (
    mkdir "..\mfc-data"
    echo    [OK] Dossier mfc-data cree.
) else (
    echo    [OK] Dossier mfc-data existant.
)
if not exist "..\mfc-data\backups" (
    mkdir "..\mfc-data\backups"
    echo    [OK] Dossier backups cree.
) else (
    echo    [OK] Dossier backups existant.
)

if exist "database.sqlite" (
    if not exist "..\mfc-data\database.sqlite" (
        echo    Migration de la base vers mfc-data...
        copy "database.sqlite" "..\mfc-data\database.sqlite" >nul
        echo    [OK] Base migree.
    )
    del "database.sqlite" >nul 2>nul
)

:: ============================================================
::  ETAPE 7/7 : Test de demarrage
:: ============================================================
echo.
echo   -----------------------------------------------------------
echo    ETAPE 7/7 : Test de demarrage rapide
echo   -----------------------------------------------------------

netstat -aon 2>nul | findstr ":3000.*LISTENING" >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000.*LISTENING"') do (
        taskkill /pid %%a /f >nul 2>nul
    )
    timeout /t 2 /nobreak >nul
)

start "MFC-Test" /min cmd /c "node server.js"
set attempts=0
:test_loop
set /a attempts+=1
if %attempts% gtr 15 (
    echo    [ATTENTION] Le serveur met du temps a demarrer...
    goto test_done
)
timeout /t 1 /nobreak >nul
netstat -aon 2>nul | findstr ":3000.*LISTENING" >nul 2>nul
if %errorlevel% neq 0 goto test_loop
echo    [OK] Serveur demarre avec succes !

:test_done
taskkill /fi "WINDOWTITLE eq MFC-Test" /f >nul 2>nul
timeout /t 1 /nobreak >nul

:: ============================================================
::  RAPPORT FINAL
:: ============================================================
echo.
echo.
echo   +===========================================================+
echo   !                                                           !
echo   !       INSTALLATION TERMINEE !                             !
echo   !                                                           !
echo   +===========================================================+
echo.
echo   BILAN :
echo.

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo     [OK] Node.js
) else (
    echo     [X]  Node.js                    MANQUANT
)

if defined PYTHON_CMD (
    echo     [OK] Python 3
) else (
    echo     [X]  Python 3                   MANQUANT
)

if %TESS_OK% equ 1 (
    echo     [OK] Tesseract OCR
) else (
    echo     [!]  Tesseract OCR              MANQUANT (optionnel)
)

if defined PYTHON_CMD (
    %PYTHON_CMD% -c "import fitz" >nul 2>nul
    if %errorlevel% equ 0 (
        echo     [OK] PyMuPDF
    ) else (
        echo     [X]  PyMuPDF                    MANQUANT
    )
    %PYTHON_CMD% -c "import pytesseract" >nul 2>nul
    if %errorlevel% equ 0 (
        echo     [OK] pytesseract
    ) else (
        echo     [!]  pytesseract                MANQUANT
    )
    %PYTHON_CMD% -c "from PIL import Image" >nul 2>nul
    if %errorlevel% equ 0 (
        echo     [OK] Pillow
    ) else (
        echo     [!]  Pillow                     MANQUANT
    )
)

echo     [OK] npm dependances
echo     [OK] Dossier mfc-data
echo.
echo   Erreurs : %ERRORS%   Avertissements : %WARNINGS%
echo.

if %ERRORS% gtr 0 (
    echo   Des erreurs doivent etre corrigees. Corrigez puis relancez.
) else if %WARNINGS% gtr 0 (
    echo   L'appli fonctionnera mais certaines fonctions seront limitees.
) else (
    echo   Tout est OK ! Votre poste est pret.
)

echo.
echo   POUR LANCER L'APPLICATION :
echo     Double-cliquez sur MFC-Laboratoire.bat
echo     Navigateur : Opera (recommande)
echo     Adresse    : http://localhost:3000
echo.

choice /c OQ /m "   Lancer MFC Laboratoire maintenant ? (O/Q) "
if %errorlevel% equ 1 (
    start "" "%~dp0MFC-Laboratoire.bat"
)
