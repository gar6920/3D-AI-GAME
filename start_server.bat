@echo off
echo Starting 3D AI Game Server

REM Check for administrator privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: This script may require administrator privileges for some operations.
    echo Please run this script as Administrator to avoid permission issues.
    echo You can right-click the script and select 'Run as administrator'.
)

REM Check if full cleanup is requested via command line argument (e.g., start_server.bat clean)
set DOCLEAN=false
if "%1"=="clean" (
    set DOCLEAN=true
    echo Full cleanup requested via command line argument.
)

REM Cleanup existing node_modules only if requested
if %DOCLEAN%==true (
    echo Cleaning up existing node_modules directory if present...
    if exist node_modules (
        echo Removing old node_modules...
        rmdir /S /Q node_modules >nul 2>&1
        if %errorlevel% neq 0 (
            echo Failed to remove node_modules. Trying with administrator privileges...
            powershell -Command "Remove-Item -Path node_modules -Recurse -Force" >nul 2>&1
            if %errorlevel% neq 0 (
                echo ERROR: Could not remove node_modules. Please delete it manually or run as administrator.
                pause
                exit /b %errorlevel%
            )
        )
    )
    REM Also cleanup package-lock.json only if full cleanup is requested
    if exist package-lock.json (
        echo Removing old package-lock.json...
        del /Q package-lock.json >nul 2>&1
        if %errorlevel% neq 0 (
            echo Failed to remove package-lock.json. Trying with administrator privileges...
            powershell -Command "Remove-Item -Path package-lock.json -Force" >nul 2>&1
            if %errorlevel% neq 0 (
                echo ERROR: Could not remove package-lock.json. Please delete it manually or run as administrator.
                pause
                exit /b %errorlevel%
            )
        )
    )
) else (
    echo Skipping full cleanup. To force cleanup, run 'start_server.bat clean'
)

REM Check and install dependencies
echo Verifying and installing dependencies...
if "%1"=="reinstall" (
    echo Reinstall requested via command line argument.
    if exist package-lock.json (
        call npm ci --no-warnings --no-audit --no-fund
        if %errorlevel% neq 0 (
            echo npm ci failed, trying npm install instead...
            call npm install --no-warnings --no-audit --no-fund
            if %errorlevel% neq 0 (
                echo npm install failed! Exiting.
                pause
                exit /b %errorlevel%
            )
        )
    ) else (
        echo No package-lock.json found, using npm install...
        call npm install --no-warnings --no-audit --no-fund
        if %errorlevel% neq 0 (
            echo npm install failed! Exiting.
            pause
            exit /b %errorlevel%
        )
    )
) else (
    if exist node_modules\electron (
        echo node_modules directory with electron found, assuming dependencies are installed. Skipping npm install...
        echo To force reinstall, run 'start_server.bat reinstall'
    ) else (
        if exist package-lock.json (
            call npm ci --no-warnings --no-audit --no-fund
            if %errorlevel% neq 0 (
                echo npm ci failed, trying npm install instead...
                call npm install --no-warnings --no-audit --no-fund
                if %errorlevel% neq 0 (
                    echo npm install failed! Exiting.
                    pause
                    exit /b %errorlevel%
                )
            )
        ) else (
            echo No package-lock.json found, using npm install...
            call npm install --no-warnings --no-audit --no-fund
            if %errorlevel% neq 0 (
                echo npm install failed! Exiting.
                pause
                exit /b %errorlevel%
            )
        )
    )
)
echo Dependencies are up to date.

REM Kill any existing Node.js process listening on port 3000
echo Killing any existing Node.js process on port 8080...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":8080"') do (
    set PID=%%a
    if defined PID (
        echo Found process with PID %PID% listening on port 8080. Terminating...
        taskkill /F /PID %PID% >nul 2>&1
    ) else (
        echo No process found listening on port 8080.
    )
)
timeout /t 1 /nobreak >nul

REM Start the game server
echo Server starting - press Ctrl+C to stop
npm start