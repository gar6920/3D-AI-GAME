@echo off
setlocal enabledelayedexpansion

echo Creating updated compiled_code.txt file...

:: Delete the old file if it exists
if exist compiled_code.txt del compiled_code.txt

:: Create the new file with a header
echo ################################################################## > compiled_code.txt
echo #                                                                  # >> compiled_code.txt
echo #                    3D AI GAME PLATFORM CODEBASE                 # >> compiled_code.txt
echo #                                                                  # >> compiled_code.txt
echo ################################################################## >> compiled_code.txt
echo. >> compiled_code.txt

:: Project Structure Section
echo ################################################################## >> compiled_code.txt
echo #                      PROJECT STRUCTURE                          # >> compiled_code.txt
echo ################################################################## >> compiled_code.txt
echo. >> compiled_code.txt

:: Root level files
echo root\start_server.bat >> compiled_code.txt
echo root\package.json >> compiled_code.txt
echo root\four_player_setup.html >> compiled_code.txt
echo. >> compiled_code.txt

:: Client structure
echo root\client\index.html >> compiled_code.txt
echo root\client\js\core\Player.js >> compiled_code.txt
echo root\client\js\core\Entity.js >> compiled_code.txt
echo root\client\js\core\game-engine.js >> compiled_code.txt
echo root\client\js\core\network-core.js >> compiled_code.txt
echo root\client\js\core\controls.js >> compiled_code.txt
echo root\client\js\core\EntityFactory.js >> compiled_code.txt
echo root\client\js\core\NPC.js >> compiled_code.txt
echo root\client\js\core\collision.js >> compiled_code.txt
echo root\client\js\implementations\default\index.js >> compiled_code.txt
echo root\client\js\implementations\default\DefaultPlayer.js >> compiled_code.txt
echo root\client\js\implementations\default\DefaultEnvironment.js >> compiled_code.txt
echo. >> compiled_code.txt

:: Public structure
echo root\public\player_select.html >> compiled_code.txt
echo. >> compiled_code.txt

:: Server structure
echo root\server\core\index.js >> compiled_code.txt
echo root\server\core\BaseRoom.js >> compiled_code.txt
echo root\server\core\schemas\GameState.js >> compiled_code.txt
echo root\server\core\schemas\Player.js >> compiled_code.txt
echo root\server\implementations\default\DefaultRoom.js >> compiled_code.txt
echo. >> compiled_code.txt

echo. >> compiled_code.txt
echo ################################################################## >> compiled_code.txt
echo. >> compiled_code.txt

:: Add table of contents
echo TABLE OF CONTENTS >> compiled_code.txt
echo ################################################################## >> compiled_code.txt
echo. >> compiled_code.txt
echo 1. Project Configuration >> compiled_code.txt
echo    - Server Startup >> compiled_code.txt
echo    - Package Configuration >> compiled_code.txt
echo    - HTML Entry Points >> compiled_code.txt
echo. >> compiled_code.txt
echo 2. Core Platform >> compiled_code.txt
echo    - Player System >> compiled_code.txt
echo    - Game Engine >> compiled_code.txt
echo    - Networking >> compiled_code.txt
echo    - Entity System >> compiled_code.txt
echo. >> compiled_code.txt
echo 3. Default Implementation >> compiled_code.txt
echo    - Player Implementation >> compiled_code.txt
echo    - Environment Objects >> compiled_code.txt
echo. >> compiled_code.txt
echo 4. Server Components >> compiled_code.txt
echo    - Room Management >> compiled_code.txt
echo    - Game State >> compiled_code.txt
echo. >> compiled_code.txt
echo ################################################################## >> compiled_code.txt
echo. >> compiled_code.txt

set /a totalFiles=0
set /a totalLines=0

:: Project Configuration Files
echo ################################################################## >> compiled_code.txt
echo #                    PROJECT CONFIGURATION                         # >> compiled_code.txt
echo ################################################################## >> compiled_code.txt
echo. >> compiled_code.txt

:: Process config files
set "config_files=start_server.bat package.json client\index.html public\player_select.html four_player_setup.html"
for %%F in (%config_files%) do (
    if exist "%%F" (
        echo Processing %%F...
        echo ################################################################## >> compiled_code.txt
        echo #                                                                  # >> compiled_code.txt
        echo # FILE: %%~nxF >> compiled_code.txt
        
        :: Count lines in the file
        set /a lines=0
        for /f %%L in ('type "%%F" ^| find /v /c ""') do set /a lines=%%L
        set /a totalLines+=!lines!
        echo # LINES: !lines! >> compiled_code.txt
        
        echo #                                                                  # >> compiled_code.txt
        echo ################################################################## >> compiled_code.txt
        echo. >> compiled_code.txt
        type "%%F" >> compiled_code.txt
        echo. >> compiled_code.txt
        echo ################################################################## >> compiled_code.txt
        echo #                       END OF %%~nxF                              # >> compiled_code.txt
        echo ################################################################## >> compiled_code.txt
        echo. >> compiled_code.txt
        echo. >> compiled_code.txt
        set /a totalFiles+=1
    )
)

:: Core Platform Files
echo ################################################################## >> compiled_code.txt
echo #                         CORE PLATFORM                            # >> compiled_code.txt
echo ################################################################## >> compiled_code.txt
echo. >> compiled_code.txt

:: Process core files in specific order
set "core_files=client\js\core\Player.js client\js\core\Entity.js client\js\core\game-engine.js client\js\core\network-core.js client\js\core\controls.js client\js\core\EntityFactory.js client\js\core\NPC.js client\js\core\collision.js"
for %%F in (%core_files%) do (
    if exist "%%F" (
        echo Processing %%F...
        echo ################################################################## >> compiled_code.txt
        echo #                                                                  # >> compiled_code.txt
        echo # FILE: %%~nxF >> compiled_code.txt
        
        :: Count lines in the file
        set /a lines=0
        for /f %%L in ('type "%%F" ^| find /v /c ""') do set /a lines=%%L
        set /a totalLines+=!lines!
        echo # LINES: !lines! >> compiled_code.txt
        
        echo #                                                                  # >> compiled_code.txt
        echo ################################################################## >> compiled_code.txt
        echo. >> compiled_code.txt
        type "%%F" >> compiled_code.txt
        echo. >> compiled_code.txt
        echo ################################################################## >> compiled_code.txt
        echo #                       END OF %%~nxF                              # >> compiled_code.txt
        echo ################################################################## >> compiled_code.txt
        echo. >> compiled_code.txt
        echo. >> compiled_code.txt
        set /a totalFiles+=1
    )
)

:: Default Implementation Files
echo ################################################################## >> compiled_code.txt
echo #                    DEFAULT IMPLEMENTATION                        # >> compiled_code.txt
echo ################################################################## >> compiled_code.txt
echo. >> compiled_code.txt

:: Process implementation files in specific order
set "impl_files=client\js\implementations\default\index.js client\js\implementations\default\DefaultPlayer.js client\js\implementations\default\DefaultEnvironment.js"
for %%F in (%impl_files%) do (
    if exist "%%F" (
        echo Processing %%F...
        echo ################################################################## >> compiled_code.txt
        echo #                                                                  # >> compiled_code.txt
        echo # FILE: %%~nxF >> compiled_code.txt
        
        :: Count lines in the file
        set /a lines=0
        for /f %%L in ('type "%%F" ^| find /v /c ""') do set /a lines=%%L
        set /a totalLines+=!lines!
        echo # LINES: !lines! >> compiled_code.txt
        
        echo #                                                                  # >> compiled_code.txt
        echo ################################################################## >> compiled_code.txt
        echo. >> compiled_code.txt
        type "%%F" >> compiled_code.txt
        echo. >> compiled_code.txt
        echo ################################################################## >> compiled_code.txt
        echo #                       END OF %%~nxF                              # >> compiled_code.txt
        echo ################################################################## >> compiled_code.txt
        echo. >> compiled_code.txt
        echo. >> compiled_code.txt
        set /a totalFiles+=1
    )
)

:: Server Core Files
echo ################################################################## >> compiled_code.txt
echo #                      SERVER COMPONENTS                          # >> compiled_code.txt
echo ################################################################## >> compiled_code.txt
echo. >> compiled_code.txt

:: Process server files in specific order
set "server_files=server\core\index.js server\core\BaseRoom.js server\core\schemas\GameState.js server\core\schemas\Player.js server\implementations\default\DefaultRoom.js"
for %%F in (%server_files%) do (
    if exist "%%F" (
        echo Processing %%F...
        echo ################################################################## >> compiled_code.txt
        echo #                                                                  # >> compiled_code.txt
        echo # FILE: %%~nxF >> compiled_code.txt
        
        :: Count lines in the file
        set /a lines=0
        for /f %%L in ('type "%%F" ^| find /v /c ""') do set /a lines=%%L
        set /a totalLines+=!lines!
        echo # LINES: !lines! >> compiled_code.txt
        
        echo #                                                                  # >> compiled_code.txt
        echo ################################################################## >> compiled_code.txt
        echo. >> compiled_code.txt
        type "%%F" >> compiled_code.txt
        echo. >> compiled_code.txt
        echo ################################################################## >> compiled_code.txt
        echo #                       END OF %%~nxF                              # >> compiled_code.txt
        echo ################################################################## >> compiled_code.txt
        echo. >> compiled_code.txt
        echo. >> compiled_code.txt
        set /a totalFiles+=1
    )
)

:: Add final statistics
echo ################################################################## >> compiled_code.txt
echo #                                                                  # >> compiled_code.txt
echo #                    CODEBASE STATISTICS                          # >> compiled_code.txt
echo #        Total Files: !totalFiles!                                # >> compiled_code.txt
echo #        Total Lines of Code: !totalLines!                        # >> compiled_code.txt
echo #                                                                  # >> compiled_code.txt
echo ################################################################## >> compiled_code.txt

echo.
echo Compilation complete!
echo Files processed: !totalFiles!
echo Total lines of code: !totalLines!
echo The compiled_code.txt file now contains the essential codebase.
echo.

pause
