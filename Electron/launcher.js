/**
 * Electron Launcher
 * This script launches the Electron application
 * It is designed to be called from the server when a browser connects
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Check if Electron is already running
 * @returns {Promise<boolean>} True if Electron is running
 */
async function isElectronRunning() {
    return new Promise((resolve) => {
        // On Windows, use tasklist to check for electron processes
        const proc = spawn('tasklist', ['/fi', 'imagename eq electron.exe', '/fo', 'csv', '/nh'], {
            windowsHide: true,
            shell: true
        });
        
        let output = '';
        proc.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        proc.on('close', () => {
            // If we find an Electron process, it's running
            resolve(output.toLowerCase().includes('electron.exe'));
        });
    });
}

/**
 * Launch the Electron application
 */
async function launchElectron() {
    // Check if Electron is already running
    const isRunning = await isElectronRunning();
    if (isRunning) {
        console.log('Electron is already running. Skipping launch.');
        return;
    }
    
    console.log('Launching Electron application...');
    
    // Path to project root (parent of electron folder)
    const projectRoot = path.join(__dirname, '..');
    
    // Launch Electron
    const electronProc = spawn('npx', ['electron', '.'], {
        cwd: projectRoot,
        detached: true, // Run in background
        stdio: 'ignore', // Don't pipe IO
        shell: true,
        windowsHide: false // Show the window
    });
    
    // Detach the process so it runs independently
    electronProc.unref();
    
    console.log('Electron application launched.');
}

// Export the launcher function
module.exports = { launchElectron };

// If this script is run directly, launch Electron
if (require.main === module) {
    launchElectron();
}

// Launcher script for 3D AI Game
document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI
    const startButton = document.getElementById('start-game');
    const playerCountSelect = document.getElementById('player-count');
    const implementationSelect = document.getElementById('implementation');
    const gamepadList = document.getElementById('gamepad-list');
    const serverStatusEl = document.getElementById('server-status');
    
    // Track connected gamepads
    const connectedGamepads = {};
    
    // Check server status
    if (window.api) {
        window.api.checkServer();
        
        window.api.onServerStatus((statusData) => {
            if (statusData.available) {
                serverStatusEl.textContent = 'Connected';
                serverStatusEl.className = 'status-connected';
                startButton.disabled = false;
            } else {
                serverStatusEl.textContent = 'Disconnected';
                serverStatusEl.className = 'status-error';
                startButton.disabled = true;
            }
        });
    }
    
    // Setup gamepad detection
    function setupGamepadDetection() {
        // Handle gamepad connections
        window.addEventListener('gamepadconnected', (e) => {
            console.log(`Gamepad connected: ${e.gamepad.id}`);
            connectedGamepads[e.gamepad.index] = e.gamepad;
            updateGamepadList();
            
            // Also inform main process
            if (window.api && window.api.sendGamepadDetected) {
                window.api.sendGamepadDetected({
                    connected: true,
                    id: e.gamepad.id,
                    index: e.gamepad.index
                });
            }
        });
        
        // Handle gamepad disconnections
        window.addEventListener('gamepaddisconnected', (e) => {
            console.log(`Gamepad disconnected: ${e.gamepad.id}`);
            delete connectedGamepads[e.gamepad.index];
            updateGamepadList();
            
            // Inform main process
            if (window.api && window.api.sendGamepadDetected) {
                window.api.sendGamepadDetected({
                    connected: false,
                    index: e.gamepad.index
                });
            }
        });
        
        // Check for gamepads that are already connected
        const initialGamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let i = 0; i < initialGamepads.length; i++) {
            const gamepad = initialGamepads[i];
            if (gamepad) {
                console.log(`Found already connected gamepad: ${gamepad.id}`);
                connectedGamepads[gamepad.index] = gamepad;
                
                // Inform main process
                if (window.api && window.api.sendGamepadDetected) {
                    window.api.sendGamepadDetected({
                        connected: true,
                        id: gamepad.id,
                        index: gamepad.index
                    });
                }
            }
        }
        
        // Listen for poll requests from main process
        if (window.api && window.api.onPollGamepads) {
            window.api.onPollGamepads(() => {
                // Simply check for gamepads and report any changes
                const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
                for (let i = 0; i < gamepads.length; i++) {
                    const gamepad = gamepads[i];
                    if (gamepad && !connectedGamepads[gamepad.index]) {
                        // Found a new gamepad that wasn't tracked
                        connectedGamepads[gamepad.index] = gamepad;
                        console.log(`Poll detected new gamepad: ${gamepad.id}`);
                        
                        // Inform main process
                        if (window.api && window.api.sendGamepadDetected) {
                            window.api.sendGamepadDetected({
                                connected: true,
                                id: gamepad.id,
                                index: gamepad.index
                            });
                        }
                        
                        updateGamepadList();
                    }
                }
            });
        }
        
        // Initial update
        updateGamepadList();
    }
    
    // Update the gamepad list in the UI
    function updateGamepadList() {
        if (!gamepadList) return;
        
        // Clear existing list
        gamepadList.innerHTML = '';
        
        // Check if any gamepads are connected
        const gamepadCount = Object.keys(connectedGamepads).length;
        
        if (gamepadCount === 0) {
            const noGamepadsEl = document.createElement('div');
            noGamepadsEl.className = 'no-gamepads';
            noGamepadsEl.textContent = 'No controllers detected. Connect a controller before starting or use keyboard/mouse.';
            gamepadList.appendChild(noGamepadsEl);
            return;
        }
        
        // Add each gamepad to the list
        Object.values(connectedGamepads).forEach(gamepad => {
            const gamepadEl = document.createElement('div');
            gamepadEl.className = 'gamepad-item';
            gamepadEl.innerHTML = `
                <div class="gamepad-name">${gamepad.id}</div>
                <div class="gamepad-index">Controller #${gamepad.index + 1}</div>
            `;
            gamepadList.appendChild(gamepadEl);
        });
        
        // Update player count options based on connected gamepads
        updatePlayerCountOptions(gamepadCount);
    }
    
    // Update player count options based on connected gamepads
    function updatePlayerCountOptions(gamepadCount) {
        // We always support at least 1 player (keyboard/mouse)
        // and up to gamepadCount + 1 (keyboard plus gamepads)
        const maxPlayers = Math.min(4, gamepadCount + 1);
        
        // Save current selection if possible
        const currentSelection = playerCountSelect.value;
        
        // Clear existing options
        playerCountSelect.innerHTML = '';
        
        // Add options from 1 to maxPlayers
        for (let i = 1; i <= maxPlayers; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i} Player${i > 1 ? 's' : ''}`;
            playerCountSelect.appendChild(option);
        }
        
        // Restore selection if valid, otherwise select the maximum
        if (currentSelection && parseInt(currentSelection) <= maxPlayers) {
            playerCountSelect.value = currentSelection;
        } else {
            playerCountSelect.value = maxPlayers;
        }
    }
    
    // Start button click handler
    startButton.addEventListener('click', function() {
        const playerCount = parseInt(playerCountSelect.value);
        const implementation = implementationSelect.value;
        
        console.log(`Starting game with ${playerCount} players, implementation: ${implementation}`);
        
        if (window.api) {
            window.api.startGame(playerCount, implementation);
        } else {
            alert('Cannot start game - Electron API not available');
        }
    });
    
    // Quit button click handler
    const quitButton = document.getElementById('quit-game');
    if (quitButton) {
        quitButton.addEventListener('click', function() {
            if (window.api) {
                window.api.quitApp();
            }
        });
    }
    
    // Initialize gamepad detection
    setupGamepadDetection();
});
