// Split-Screen Multiplayer Setup
// This file handles creating and arranging client windows for local multiplayer

// Initialize when the document is ready
if (window.inputManager) {
    window.inputManager.on('domcontentloaded', function() {
        console.log("Split-screen multiplayer setup initializing");
    });
} else {
    document.addEventListener('DOMContentLoaded', function() {
        console.log("Split-screen multiplayer setup initializing");
    });
}

// Register custom event handlers through InputManager's on method
if (window.inputManager) {
    // Listen for P key to start local multiplayer
    window.inputManager.on('startLocalMultiplayer', function() {
        console.log("Starting local multiplayer setup");
        // Create the player count selection UI
        createPlayerCountUI();
    });
    
    // Listen for player count selection
    window.inputManager.on('playerCountSelected', function(event) {
        const playerCount = event.detail ? event.detail.count : (event.count || 2);
        console.log(`Setting up split-screen for ${playerCount} players`);
        
        // Create client windows/frames for each player
        createClientWindows(playerCount);
        
        // Create keyboard indicator
        createKeyboardIndicator();
    });
    
    // Listen for controller assignment completion
    window.inputManager.on('localMultiplayerReady', function(event) {
        const assignments = event.detail ? event.detail.controllerAssignments : event.controllerAssignments;
        console.log("Local multiplayer ready with assignments:", assignments);
        
        // Start the game on all client windows
        startGame(assignments);
    });
} else {
    // Fallback to direct DOM event listeners
    document.addEventListener('startLocalMultiplayer', function() {
        console.log("Starting local multiplayer setup");
        createPlayerCountUI();
    });
    
    document.addEventListener('playerCountSelected', function(event) {
        const playerCount = event.detail.count;
        console.log(`Setting up split-screen for ${playerCount} players`);
        createClientWindows(playerCount);
        createKeyboardIndicator();
    });
    
    document.addEventListener('localMultiplayerReady', function(event) {
        const assignments = event.detail.controllerAssignments;
        console.log("Local multiplayer ready with assignments:", assignments);
        startGame(assignments);
    });
}

// Create the player count selection UI
function createPlayerCountUI() {
    // Create container
    const container = document.createElement('div');
    container.id = 'player-count-selection';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    container.style.color = 'white';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.zIndex = '3000';
    
    // Add title
    const title = document.createElement('h1');
    title.textContent = 'Select Number of Players';
    title.style.marginBottom = '40px';
    container.appendChild(title);
    
    // Add button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '20px';
    
    // Add buttons for 1-4 players
    for (let i = 1; i <= 4; i++) {
        const button = document.createElement('button');
        button.id = `player-count-button-${i}`;
        button.textContent = i.toString();
        button.style.width = '100px';
        button.style.height = '100px';
        button.style.fontSize = '32px';
        button.style.fontWeight = 'bold';
        button.style.borderRadius = '10px';
        button.style.border = 'none';
        button.style.backgroundColor = '#333';
        button.style.color = 'white';
        button.style.cursor = 'pointer';
        button.style.transition = 'background-color 0.2s, transform 0.2s';
        
        // Set up button event handlers through InputManager if available
        if (window.inputManager) {
            // Hover effects will need to be handled with CSS since InputManager doesn't handle mouseover/mouseout
            // Add click handler through InputManager
            window.inputManager.registerUIElement(`player-count-button-${i}`, 'click', (function(count) {
                return function() {
                    // Dispatch event for player count selection
                    if (window.inputManager) {
                        window.inputManager.dispatchEvent('playerCountSelected', { count: count });
                    } else {
                        document.dispatchEvent(new CustomEvent('playerCountSelected', {
                            detail: { count: count }
                        }));
                    }
                    
                    // Hide selection UI
                    container.style.display = 'none';
                };
            })(i));
            
            // Add manual styles for hover effects since we can't use mouseover/mouseout with InputManager
            button.onmouseover = function() {
                button.style.backgroundColor = '#555';
                button.style.transform = 'scale(1.05)';
            };
            
            button.onmouseout = function() {
                button.style.backgroundColor = '#333';
                button.style.transform = 'scale(1)';
            };
        } else {
            // Use direct event listeners as fallback
            button.addEventListener('mouseover', function() {
                button.style.backgroundColor = '#555';
                button.style.transform = 'scale(1.05)';
            });
            
            button.addEventListener('mouseout', function() {
                button.style.backgroundColor = '#333';
                button.style.transform = 'scale(1)';
            });
            
            button.addEventListener('click', function() {
                // Dispatch event for player count selection
                document.dispatchEvent(new CustomEvent('playerCountSelected', {
                    detail: { count: i }
                }));
                
                // Hide selection UI
                container.style.display = 'none';
            });
        }
        
        buttonContainer.appendChild(button);
    }
    
    container.appendChild(buttonContainer);
    document.body.appendChild(container);
    
    console.log("Player count selection UI created");
}

// Create client windows/frames for each player
function createClientWindows(playerCount) {
    console.log(`Creating ${playerCount} client windows`);
    
    // Create container for client windows
    const splitScreenContainer = document.createElement('div');
    splitScreenContainer.id = 'split-screen-container';
    splitScreenContainer.style.position = 'fixed';
    splitScreenContainer.style.top = '0';
    splitScreenContainer.style.left = '0';
    splitScreenContainer.style.width = '100%';
    splitScreenContainer.style.height = '100%';
    splitScreenContainer.style.display = 'flex';
    splitScreenContainer.style.flexWrap = 'wrap';
    splitScreenContainer.style.backgroundColor = 'black';
    splitScreenContainer.style.zIndex = '1000';
    document.body.appendChild(splitScreenContainer);
    
    // Calculate dimensions based on player count
    let clientWidth, clientHeight, gridCols;
    
    if (playerCount === 1) {
        clientWidth = clientHeight = '100%';
        gridCols = 1;
    } else if (playerCount === 2) {
        // Side by side for 2 players
        clientWidth = '50%';
        clientHeight = '100%';
        gridCols = 2;
    } else {
        // 2x2 grid for 3-4 players
        clientWidth = '50%';
        clientHeight = '50%';
        gridCols = 2;
    }
    
    // Initialize client windows array
    window.clientWindows = [];
    
    // Create client boxes for controller selection
    for (let i = 0; i < playerCount; i++) {
        const clientId = `client-${i}`;
        
        // Create client box
        const clientBox = document.createElement('div');
        clientBox.className = 'client-box';
        clientBox.dataset.clientId = clientId;
        clientBox.style.width = clientWidth;
        clientBox.style.height = clientHeight;
        clientBox.style.padding = '5px';
        clientBox.style.boxSizing = 'border-box';
        clientBox.style.position = 'relative';
        splitScreenContainer.appendChild(clientBox);
        
        // Add player label
        const playerLabel = document.createElement('div');
        playerLabel.textContent = `Player ${i + 1}`;
        playerLabel.style.position = 'absolute';
        playerLabel.style.top = '10px';
        playerLabel.style.left = '10px';
        playerLabel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        playerLabel.style.color = 'white';
        playerLabel.style.padding = '5px 10px';
        playerLabel.style.borderRadius = '5px';
        playerLabel.style.zIndex = '2';
        playerLabel.style.fontFamily = 'Arial, sans-serif';
        playerLabel.style.fontSize = '14px';
        clientBox.appendChild(playerLabel);
        
        // Create instruction text
        const instructions = document.createElement('div');
        instructions.style.position = 'absolute';
        instructions.style.top = '50%';
        instructions.style.left = '50%';
        instructions.style.transform = 'translate(-50%, -50%)';
        instructions.style.color = 'white';
        instructions.style.fontFamily = 'Arial, sans-serif';
        instructions.style.fontSize = '18px';
        instructions.style.textAlign = 'center';
        instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        instructions.style.padding = '20px';
        instructions.style.borderRadius = '10px';
        instructions.style.maxWidth = '80%';
        
        if (i === 0) {
            // Player 1 can use keyboard or controller
            instructions.innerHTML = `
                <p><b>Press any button on your controller</b></p>
                <p>OR</p>
                <p><b>Press ENTER to use keyboard & mouse</b></p>
            `;
        } else {
            // Other players need controllers
            instructions.innerHTML = `
                <p><b>Press any button on your controller</b></p>
            `;
        }
        
        clientBox.appendChild(instructions);
        
        // Store client window info
        window.clientWindows.push({
            clientId,
            element: clientBox,
            playerIndex: i
        });
    }
    
    // Create controller selection UI
    createSelectionUI(playerCount);
    
    console.log(`Created ${playerCount} client windows`);
}

// Create controller selection UI overlay
function createSelectionUI(playerCount) {
    const selectionUI = document.createElement('div');
    selectionUI.id = 'controller-selection-ui';
    selectionUI.style.position = 'fixed';
    selectionUI.style.top = '0';
    selectionUI.style.left = '0';
    selectionUI.style.width = '100%';
    selectionUI.style.height = '100%';
    selectionUI.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    selectionUI.style.color = 'white';
    selectionUI.style.fontFamily = 'Arial, sans-serif';
    selectionUI.style.zIndex = '2000';
    selectionUI.style.display = 'flex';
    selectionUI.style.flexDirection = 'column';
    selectionUI.style.justifyContent = 'center';
    selectionUI.style.alignItems = 'center';
    selectionUI.style.pointerEvents = 'none'; // Allow clicks to pass through
    
    // Add title
    const title = document.createElement('h1');
    title.textContent = 'Select Your Controller';
    title.style.marginBottom = '20px';
    selectionUI.appendChild(title);
    
    // Add instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Use your controller to navigate to a player position and press any button to select';
    instructions.style.marginBottom = '40px';
    selectionUI.appendChild(instructions);
    
    document.body.appendChild(selectionUI);
    
    // Handle keyboard selection for Player 1 using InputManager
    if (window.inputManager) {
        window.inputManager.on('keydown', function(event) {
            if (event.key === 'Enter') {
                const player1Box = document.querySelector('.client-box[data-client-id="client-0"]');
                if (player1Box && !document.querySelector('.keyboard-assigned')) {
                    assignKeyboard(player1Box);
                }
            }
        });
    } else {
        // Fallback to direct event listener
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                const player1Box = document.querySelector('.client-box[data-client-id="client-0"]');
                if (player1Box && !document.querySelector('.keyboard-assigned')) {
                    assignKeyboard(player1Box);
                }
            }
        });
    }
    
    console.log("Controller selection UI created");
}

// Create keyboard indicator
function createKeyboardIndicator() {
    const keyboardIndicator = document.createElement('div');
    keyboardIndicator.className = 'keyboard-indicator';
    keyboardIndicator.style.position = 'fixed';
    keyboardIndicator.style.bottom = '20px';
    keyboardIndicator.style.left = '20px';
    keyboardIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    keyboardIndicator.style.color = 'white';
    keyboardIndicator.style.padding = '10px 15px';
    keyboardIndicator.style.borderRadius = '5px';
    keyboardIndicator.style.fontFamily = 'Arial, sans-serif';
    keyboardIndicator.style.fontSize = '14px';
    keyboardIndicator.style.display = 'flex';
    keyboardIndicator.style.alignItems = 'center';
    keyboardIndicator.style.zIndex = '3000';
    
    const keyboardIcon = document.createElement('span');
    keyboardIcon.textContent = '⌨️';
    keyboardIcon.style.marginRight = '10px';
    keyboardIcon.style.fontSize = '20px';
    
    const keyboardText = document.createElement('span');
    keyboardText.textContent = 'Press ENTER to use Keyboard & Mouse (Player 1 only)';
    
    keyboardIndicator.appendChild(keyboardIcon);
    keyboardIndicator.appendChild(keyboardText);
    document.body.appendChild(keyboardIndicator);
    
    console.log("Keyboard indicator created");
}

// Assign keyboard to player 1
function assignKeyboard(clientBox) {
    console.log("Assigning keyboard to Player 1");
    
    // Create keyboard assignment indicator
    const keyboardAssignment = document.createElement('div');
    keyboardAssignment.className = 'keyboard-assigned';
    keyboardAssignment.style.position = 'absolute';
    keyboardAssignment.style.top = '0';
    keyboardAssignment.style.left = '0';
    keyboardAssignment.style.right = '0';
    keyboardAssignment.style.bottom = '0';
    keyboardAssignment.style.border = '4px solid #E91E63';
    keyboardAssignment.style.borderRadius = '8px';
    keyboardAssignment.style.pointerEvents = 'none';
    keyboardAssignment.style.zIndex = '1001';
    keyboardAssignment.style.boxShadow = '0 0 25px #E91E63';
    
    // Add keyboard indicator
    const indicator = document.createElement('div');
    indicator.style.position = 'absolute';
    indicator.style.top = '10px';
    indicator.style.left = '10px';
    indicator.style.background = '#E91E63';
    indicator.style.color = 'white';
    indicator.style.padding = '2px 8px';
    indicator.style.borderRadius = '4px';
    indicator.style.fontSize = '12px';
    indicator.style.fontWeight = 'bold';
    indicator.textContent = 'Keyboard & Mouse';
    
    // Add "SELECTED" text
    const selectionIndicator = document.createElement('div');
    selectionIndicator.style.position = 'absolute';
    selectionIndicator.style.bottom = '10px';
    selectionIndicator.style.left = '50%';
    selectionIndicator.style.transform = 'translateX(-50%)';
    selectionIndicator.style.background = '#E91E63';
    selectionIndicator.style.color = 'white';
    selectionIndicator.style.padding = '5px 15px';
    selectionIndicator.style.borderRadius = '4px';
    selectionIndicator.style.fontSize = '14px';
    selectionIndicator.style.fontWeight = 'bold';
    selectionIndicator.textContent = 'SELECTED';
    
    keyboardAssignment.appendChild(indicator);
    keyboardAssignment.appendChild(selectionIndicator);
    clientBox.appendChild(keyboardAssignment);
    
    // Hide instructions
    const instructions = clientBox.querySelector('div[style*="transform: translate(-50%, -50%)"]');
    if (instructions) {
        instructions.style.display = 'none';
    }
    
    // Hide keyboard indicator
    const keyboardIndicator = document.querySelector('.keyboard-indicator');
    if (keyboardIndicator) {
        keyboardIndicator.style.display = 'none';
    }
    
    // Store keyboard assignment
    const clientId = clientBox.dataset.clientId;
    if (window.clientWindows) {
        const clientWindow = window.clientWindows.find(cw => cw.clientId === clientId);
        if (clientWindow) {
            clientWindow.inputType = 'keyboard';
        }
    }
    
    // Check if all inputs are assigned
    checkAllInputsAssigned();
    
    // Play selection sound
    playSelectionSound();
}

// Check if all client windows have inputs assigned
function checkAllInputsAssigned() {
    if (!window.clientWindows) return;
    
    // Count assigned controllers
    const gamepadAssignments = window.localMultiplayer ? 
        Object.keys(window.localMultiplayer.getControllerAssignments()).length : 0;
    
    // Count keyboard assignments
    const keyboardAssignments = document.querySelectorAll('.keyboard-assigned').length;
    
    // Total assignments
    const totalAssignments = gamepadAssignments + keyboardAssignments;
    
    console.log(`Checking assignments: ${totalAssignments}/${window.clientWindows.length}`);
    
    // If all clients have inputs, start the game
    if (totalAssignments === window.clientWindows.length) {
        console.log("All clients have inputs assigned");
        
        // Create combined assignments
        const combinedAssignments = {};
        
        // Add gamepad assignments
        if (window.localMultiplayer) {
            Object.assign(combinedAssignments, window.localMultiplayer.getControllerAssignments());
        }
        
        // Add keyboard assignment
        const keyboardClient = window.clientWindows.find(cw => cw.inputType === 'keyboard');
        if (keyboardClient) {
            combinedAssignments.keyboard = keyboardClient.clientId;
        }
        
        // Hide controller selection UI
        const selectionUI = document.getElementById('controller-selection-ui');
        if (selectionUI) {
            selectionUI.style.display = 'none';
        }
        
        // Dispatch ready event
        setTimeout(() => {
            document.dispatchEvent(new CustomEvent('localMultiplayerReady', {
                detail: { controllerAssignments: combinedAssignments }
            }));
        }, 1000);
    }
}

// Start the game on all client windows
function startGame(assignments) {
    console.log("Starting game with assignments:", assignments);
    
    // For each client window, start the appropriate game view
    window.clientWindows.forEach(clientWindow => {
        const clientId = clientWindow.clientId;
        const playerIndex = clientWindow.playerIndex;
        
        // Determine input type (gamepad or keyboard)
        let inputType = 'none';
        let gamepadIndex = null;
        
        // Check if this client has keyboard assigned
        if (assignments.keyboard === clientId) {
            inputType = 'keyboard';
        } else {
            // Check if this client has a gamepad assigned
            for (const [controller, client] of Object.entries(assignments)) {
                if (client === clientId && controller !== 'keyboard') {
                    inputType = 'gamepad';
                    gamepadIndex = parseInt(controller);
                    break;
                }
            }
        }
        
        // Create iframe for this client (actual game view)
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        
        // Build URL with parameters
        const url = new URL(window.location.href);
        url.searchParams.set('playerIndex', playerIndex);
        url.searchParams.set('inputType', inputType);
        if (gamepadIndex !== null) {
            url.searchParams.set('gamepadIndex', gamepadIndex);
        }
        url.searchParams.set('localMultiplayer', 'true');
        url.searchParams.set('playerCount', window.clientWindows.length);
        
        iframe.src = url.toString();
        
        // Clear client box and add iframe
        clientWindow.element.innerHTML = '';
        clientWindow.element.appendChild(iframe);
        
        // Store iframe reference
        clientWindow.iframe = iframe;
        clientWindow.inputType = inputType;
        clientWindow.gamepadIndex = gamepadIndex;
        
        console.log(`Started client ${clientId} with ${inputType} input`);
    });
}

// Play selection sound
function playSelectionSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 440; // Hz - A4 note
        gainNode.gain.value = 0.1;
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (err) {
        console.log('Audio not supported for selection sound');
    }
} 