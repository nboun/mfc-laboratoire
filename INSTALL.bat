@echo off
chcp 65001 >nul
echo.
echo ═══════════════════════════════════════
echo   MFC Laboratoire — Installation
echo ═══════════════════════════════════════
echo.

:: Vérifier Node.js
node -v >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js non trouvé. Installer depuis https://nodejs.org
    pause
    exit /b 1
)
echo ✓ Node.js trouvé

:: Vérifier Git
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git non trouvé. Installer depuis https://git-scm.com
    pause
    exit /b 1
)
echo ✓ Git trouvé

:: Clone ou pull
if exist "%~dp0server.js" (
    echo.
    echo [1/3] Mise à jour du repo...
    cd /d "%~dp0"
    git pull origin main
) else (
    echo.
    echo [1/3] Clonage du repo...
    git clone https://github.com/nboun/mfc-laboratoire.git .
)

echo.
echo [2/3] Installation des dépendances...
cd /d "%~dp0"
call npm install

echo.
echo [3/3] Vérification de la base de données...
if exist "%~dp0mfc-data\database.sqlite" (
    echo ✓ Base trouvée dans le repo
) else if exist "%~dp0..\mfc-data\database.sqlite" (
    echo ✓ Base trouvée à côté du repo
) else (
    echo ⚠ Aucune base trouvée — l'app en créera une vide
    echo   Pour récupérer la vraie base : faire SYNC.bat au bureau puis git pull ici
)

echo.
echo ═══════════════════════════════════════
echo   ✓ Installation terminée
echo   Lancer avec : MFC-Laboratoire.bat
echo   Ou : npm start
echo ═══════════════════════════════════════
echo.
pause
