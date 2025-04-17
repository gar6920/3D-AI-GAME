@echo off
echo Registering 3dgame:// protocol handler for 3D AI Game Platform
echo This requires administrative privileges.

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Please run this script as Administrator.
    echo Right-click the script and select "Run as administrator"
    pause
    exit /b 1
)

set APP_PATH=%~dp0
set APP_PATH=%APP_PATH:~0,-1%

:: Register the protocol handler
reg add "HKCR\3dgame" /ve /t REG_SZ /d "URL:3D AI Game Protocol" /f
reg add "HKCR\3dgame" /v "URL Protocol" /t REG_SZ /d "" /f
reg add "HKCR\3dgame\DefaultIcon" /ve /t REG_SZ /d "\"%APP_PATH%\launch_game.bat\",0" /f
reg add "HKCR\3dgame\shell" /ve /t REG_SZ /d "" /f
reg add "HKCR\3dgame\shell\open" /ve /t REG_SZ /d "" /f
reg add "HKCR\3dgame\shell\open\command" /ve /t REG_SZ /d "\"%APP_PATH%\launch_game.bat\" \"%%1\"" /f

echo Protocol registration complete.
echo You can now use 3dgame:// links to launch the 3D AI Game Platform.
pause
