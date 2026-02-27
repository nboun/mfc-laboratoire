@echo off
chcp 65001 >nul
echo.
echo ═══════════════════════════════════════
echo   MFC Laboratoire — Install DD Portable
echo ═══════════════════════════════════════
echo.

:: Vérifier Node.js sur le PC hôte
node -v >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js non trouvé sur ce PC.
    echo    Installer depuis https://nodejs.org
    pause
    exit /b 1
)
echo ✓ Node.js trouvé

:: Vérifier Git sur le PC hôte
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git non trouvé sur ce PC.
    echo    Installer depuis https://git-scm.com
    pause
    exit /b 1
)
echo ✓ Git trouvé

:: Déterminer le dossier du DD portable (là où ce .bat se trouve)
set "MFC_DIR=%~dp0mfc-laboratoire"

echo.
if exist "%MFC_DIR%\server.js" (
    echo [1/3] Repo existant — mise à jour...
    cd /d "%MFC_DIR%"
    git pull origin main
) else (
    echo [1/3] Clonage du repo sur le DD portable...
    cd /d "%~dp0"
    git clone https://github.com/nboun/mfc-laboratoire.git
)

echo.
echo [2/3] Installation des dépendances...
cd /d "%MFC_DIR%"
call npm install

echo.
echo [3/3] Copie de la base de données depuis le bureau...
if exist "C:\MFC\mfc-data\database.sqlite" (
    if not exist "%MFC_DIR%\mfc-data" mkdir "%MFC_DIR%\mfc-data"
    copy /Y "C:\MFC\mfc-data\database.sqlite" "%MFC_DIR%\mfc-data\database.sqlite" >nul
    echo ✓ Base copiée depuis C:\MFC\mfc-data\
) else if exist "%MFC_DIR%\mfc-data\database.sqlite" (
    echo ✓ Base déjà présente sur le DD
) else (
    echo ⚠ Base non trouvée — lancer SYNC.bat au bureau d'abord
)

echo.
echo ═══════════════════════════════════════
echo   ✓ Installation terminée !
echo.
echo   Pour lancer : MFC-PORTABLE.bat
echo   Pour synchroniser : SYNC.bat
echo ═══════════════════════════════════════
echo.
pause
