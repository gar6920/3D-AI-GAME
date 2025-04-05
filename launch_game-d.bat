@echo off
echo Launching 3D AI Game in DEVELOPMENT mode...

REM Set environment - DEVELOPMENT
set ENVIRONMENT=development
set SERVER_URL=http://localhost:3000

echo Running in DEVELOPMENT environment, connecting to %SERVER_URL%

REM Try to use Electron executable if available
set LAUNCHER_PATH=%~dp0Electron\3d-ai-game-launcher.exe
set ALT_LAUNCHER_PATH=%~dp03d-ai-game-launcher.exe

if exist "%LAUNCHER_PATH%" (
    echo Found launcher in Electron folder
    start "" "%LAUNCHER_PATH%" "--env=%ENVIRONMENT%" "--server=%SERVER_URL%" %*
    exit /b 0
) 

if exist "%ALT_LAUNCHER_PATH%" (
    echo Found launcher in root folder
    start "" "%ALT_LAUNCHER_PATH%" "--env=%ENVIRONMENT%" "--server=%SERVER_URL%" %*
    exit /b 0
)

REM No executables found, use npx electron directly
echo No launcher executable found - using npx electron directly
cd /d "%~dp0"
npx electron . "--env=%ENVIRONMENT%" "--server=%SERVER_URL%" %*
exit /b 0
