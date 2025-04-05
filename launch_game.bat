@echo off
echo Launching 3D AI Game Electron Application

:: Check if we have a protocol URL passed
if not "%~1"=="" (
    :: Handle protocol URL (3dgame://...)
    echo Protocol launch detected: %1
    
    :: Pass the protocol URL to Electron
    npx electron . "%~1"
) else (
    :: Normal launch (no parameters)
    npx electron .
)

echo Game launcher closed.
