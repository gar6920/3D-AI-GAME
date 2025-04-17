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
        } else {
            // Add each gamepad to the list
            Object.values(connectedGamepads).forEach(gamepad => {
                const gamepadItem = document.createElement('div');
                gamepadItem.className = 'gamepad-item';
                
                const nameEl = document.createElement('div');
                nameEl.className = 'gamepad-name';
                nameEl.textContent = gamepad.id || 'Unknown Controller';
                gamepadItem.appendChild(nameEl);
                
                const indexEl = document.createElement('div');
                indexEl.className = 'gamepad-index';
                indexEl.textContent = `Index: ${gamepad.index}`;
                gamepadItem.appendChild(indexEl);
                
                gamepadList.appendChild(gamepadItem);
            });
        }
        
        // Update player count options based on connected gamepads
        updatePlayerCountOptions(gamepadCount);
    }
    
    // Update player count options based on connected gamepads
    function updatePlayerCountOptions(gamepadCount) {
        if (!playerCountSelect) return;
        
        // Clear existing options
        playerCountSelect.innerHTML = '';
        
        // Always allow 1-4 players
        const option1 = document.createElement('option');
        option1.value = '1';
        option1.textContent = '1 Player';
        playerCountSelect.appendChild(option1);
        
        for (let i = 2; i <= 4; i++) {
            const option = document.createElement('option');
            option.value = i.toString();
            option.textContent = `${i} Players`;
            playerCountSelect.appendChild(option);
        }
        
        // Select the highest number by default or based on gamepad count
        playerCountSelect.value = Math.min(4, gamepadCount + 1).toString();
    }
    
    // Start button click handler
    startButton.addEventListener('click', function() {
        const playerCount = parseInt(playerCountSelect.value);
        const implementation = implementationSelect.value;
        
        if (window.api) {
            window.api.startGame(playerCount, implementation);
        } else {
            console.error('API not available');
        }
    });
    
    // Quit button
    const quitButton = document.getElementById('quit-app');
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
