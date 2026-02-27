@echo off
chcp 65001 >nul 2>&1
title MFC Laboratoire — Installation Portable
color 0E

echo.
echo  ========================================
echo   MFC LABORATOIRE — Installation Portable
echo   Télécharge Node.js + Python sur le DD
echo  ========================================
echo.

:: Détecte la lettre du lecteur
set "MFC_ROOT=%~dp0.."
echo  Dossier MFC : %MFC_ROOT%
echo.

:: Crée le dossier runtime
if not exist "%MFC_ROOT%\runtime" mkdir "%MFC_ROOT%\runtime"

:: ════════════════════════════════════════
:: 1. NODE.JS PORTABLE
:: ════════════════════════════════════════
if exist "%MFC_ROOT%\runtime\node\node.exe" (
    echo  [OK] Node.js déjà installé
    "%MFC_ROOT%\runtime\node\node.exe" -v
) else (
    echo  [..] Téléchargement Node.js 20.18.1 portable...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.1/node-v20.18.1-win-x64.zip' -OutFile '%MFC_ROOT%\runtime\node.zip'"
    if not exist "%MFC_ROOT%\runtime\node.zip" (
        echo  [!!] Échec téléchargement Node.js
        pause
        exit /b 1
    )
    echo  [..] Extraction...
    powershell -Command "Expand-Archive -Path '%MFC_ROOT%\runtime\node.zip' -DestinationPath '%MFC_ROOT%\runtime' -Force"
    ren "%MFC_ROOT%\runtime\node-v20.18.1-win-x64" node
    del "%MFC_ROOT%\runtime\node.zip"
    echo  [OK] Node.js installé
    "%MFC_ROOT%\runtime\node\node.exe" -v
)

:: ════════════════════════════════════════
:: 2. PYTHON PORTABLE
:: ════════════════════════════════════════
if exist "%MFC_ROOT%\runtime\python\python.exe" (
    echo  [OK] Python déjà installé
    "%MFC_ROOT%\runtime\python\python.exe" --version
) else (
    echo  [..] Téléchargement Python 3.12.7 portable...
    powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.12.7/python-3.12.7-embed-amd64.zip' -OutFile '%MFC_ROOT%\runtime\python.zip'"
    if not exist "%MFC_ROOT%\runtime\python.zip" (
        echo  [!!] Échec téléchargement Python
        pause
        exit /b 1
    )
    echo  [..] Extraction...
    if not exist "%MFC_ROOT%\runtime\python" mkdir "%MFC_ROOT%\runtime\python"
    powershell -Command "Expand-Archive -Path '%MFC_ROOT%\runtime\python.zip' -DestinationPath '%MFC_ROOT%\runtime\python' -Force"
    del "%MFC_ROOT%\runtime\python.zip"

    :: Activer pip dans Python embedded
    echo  [..] Activation pip...
    powershell -Command "(Get-Content '%MFC_ROOT%\runtime\python\python312._pth') -replace '#import site','import site' | Set-Content '%MFC_ROOT%\runtime\python\python312._pth'"
    powershell -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile '%MFC_ROOT%\runtime\python\get-pip.py'"
    "%MFC_ROOT%\runtime\python\python.exe" "%MFC_ROOT%\runtime\python\get-pip.py" --no-warn-script-location
    echo  [OK] Python installé
    "%MFC_ROOT%\runtime\python\python.exe" --version
)

:: ════════════════════════════════════════
:: 3. PYMUPDF (pour extraction FDS)
:: ════════════════════════════════════════
echo  [..] Installation PyMuPDF...
"%MFC_ROOT%\runtime\python\python.exe" -m pip install pymupdf --no-warn-script-location -q
echo  [OK] PyMuPDF installé

:: ════════════════════════════════════════
:: 4. NPM INSTALL
:: ════════════════════════════════════════
echo  [..] Installation dépendances Node.js...
set "PATH=%MFC_ROOT%\runtime\node;%PATH%"
cd /d "%MFC_ROOT%\mfc-laboratoire"
call "%MFC_ROOT%\runtime\node\npm.cmd" install --silent
echo  [OK] Dépendances installées

echo.
echo  ========================================
echo   Installation terminée !
echo   Lancez MFC.bat pour démarrer l'app
echo  ========================================
echo.
pause
