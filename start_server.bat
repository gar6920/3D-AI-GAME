@echo off
echo Starting 3D AI Game Server

REM Check and install dependencies
echo Verifying and installing dependencies...
call npm ci
if %errorlevel% neq 0 (
    echo npm ci failed, trying npm install instead...
    call npm install
    if %errorlevel% neq 0 (
        echo npm install failed! Exiting.
        pause
        exit /b %errorlevel%
    )
)
echo Dependencies are up to date.

REM Kill any existing Node.js processes
echo Killing any existing Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 /nobreak >nul

REM Start the game server
echo Server starting - press Ctrl+C to stop
npm start