// Local Multiplayer Controller Management
// This manages controller assignment for local multiplayer split-screen sessions

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log("Local multiplayer controller system initialized");
    
    // Controller-specific colors for each connected gamepad
    const CONTROLLER_COLORS = [
        '#4CAF50', // Controller 1 - Green
        '#2196F3', // Controller 2 - Blue
        '#FF9800', // Controller 3 - Orange
        '#E91E63'  // Controller 4 - Pink
    ];
    
    // Track the state of each connected controller
    const controllerStates = {};
    
    // Map of which controller is assigned to which client
    const controllerAssignments = {};
    
    // Keep track of which clients have controllers assigned
    const assignedClients = new Set();
    
    // Interval ID for controller polling
    let pollingInterval = null;
    
    // Listen for start of multiplayer mode
    document.addEventListener('playerCountSelected', function(event) {
        console.log("Starting controller detection for local multiplayer");
        // Start polling for controller inputs
        startControllerPolling();
    });
    
    // Function to start controller polling
    function startControllerPolling() {
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setInterval(pollControllers, 100);
    }
    
    // Function to stop controller polling
    function stopControllerPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }
    
    // Function to poll connected controllers for input
    function pollControllers() {
        // Get all connected gamepads
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        
        // Process each gamepad
        for (let i = 0; i < gamepads.length; i++) {
            const gamepad = gamepads[i];
            if (!gamepad) continue;
            
            // Initialize controller state if new
            if (!controllerStates[i]) {
                controllerStates[i] = {
                    lastButtonState: Array(gamepad.buttons.length).fill(false),
                    currentClient: null,
                    assigned: false
                };
                // Add visual indicator for this controller
                addControllerIndicator(i, CONTROLLER_COLORS[i % CONTROLLER_COLORS.length]);
            }
            
            // Skip if this controller is already assigned to a client
            if (controllerStates[i].assigned) continue;
            
            // Check directional input for client selection navigation
            handleControllerNavigation(gamepad, i);
            
            // Check buttons for client selection confirmation
            handleControllerSelection(gamepad, i);
            
            // Update last button state for next comparison
            controllerStates[i].lastButtonState = gamepad.buttons.map(b => b.pressed);
        }
    }
    
    // Handle controller navigation between client boxes
    function handleControllerNavigation(gamepad, controllerIndex) {
        // Get directional input from left stick or d-pad
        const horizontalInput = Math.abs(gamepad.axes[0]) > 0.5 ? Math.sign(gamepad.axes[0]) : 0;
        const verticalInput = Math.abs(gamepad.axes[1]) > 0.5 ? Math.sign(gamepad.axes[1]) : 0;
        
        // Also check D-pad
        const dpadRight = gamepad.buttons[15] && gamepad.buttons[15].pressed;
        const dpadLeft = gamepad.buttons[14] && gamepad.buttons[14].pressed;
        const dpadDown = gamepad.buttons[13] && gamepad.buttons[13].pressed;
        const dpadUp = gamepad.buttons[12] && gamepad.buttons[12].pressed;
        
        // Combine inputs
        const moveRight = horizontalInput > 0 || dpadRight;
        const moveLeft = horizontalInput < 0 || dpadLeft;
        const moveDown = verticalInput > 0 || dpadDown;
        const moveUp = verticalInput < 0 || dpadUp;
        
        // Only process if we have directional input
        if (moveRight || moveLeft || moveDown || moveUp) {
            // Get all client boxes
            const clientBoxes = document.querySelectorAll('.client-box');
            if (clientBoxes.length === 0) return;
            
            // Get current highlighted client (if any)
            let currentIndex = -1;
            if (controllerStates[controllerIndex].currentClient !== null) {
                currentIndex = Array.from(clientBoxes).findIndex(
                    box => box.dataset.clientId === controllerStates[controllerIndex].currentClient
                );
            }
            
            // Calculate new index based on direction
            let newIndex = currentIndex;
            
            // Assuming clients are arranged in a grid (e.g., 2x2 for 4 players)
            const gridSize = Math.ceil(Math.sqrt(clientBoxes.length));
            
            if (moveRight && (currentIndex % gridSize < gridSize - 1)) {
                newIndex = currentIndex + 1;
            } else if (moveLeft && (currentIndex % gridSize > 0)) {
                newIndex = currentIndex - 1;
            } else if (moveDown && (currentIndex + gridSize < clientBoxes.length)) {
                newIndex = currentIndex + gridSize;
            } else if (moveUp && (currentIndex - gridSize >= 0)) {
                newIndex = currentIndex - gridSize;
            }
            
            // Select first client if none selected yet
            if (currentIndex === -1) {
                newIndex = 0;
            }
            
            // Keep newIndex within bounds
            newIndex = Math.max(0, Math.min(clientBoxes.length - 1, newIndex));
            
            // Select the new client if it's different and not already assigned
            if (newIndex !== currentIndex) {
                const newClientId = clientBoxes[newIndex].dataset.clientId;
                
                // Skip if this client already has a controller assigned
                if (assignedClients.has(newClientId)) {
                    // Try to find an unassigned client
                    const unassignedClient = Array.from(clientBoxes).find(
                        box => !assignedClients.has(box.dataset.clientId)
                    );
                    
                    if (unassignedClient) {
                        highlightClient(controllerIndex, unassignedClient.dataset.clientId, CONTROLLER_COLORS[controllerIndex % CONTROLLER_COLORS.length]);
                    }
                } else {
                    // Highlight new client
                    highlightClient(controllerIndex, newClientId, CONTROLLER_COLORS[controllerIndex % CONTROLLER_COLORS.length]);
                }
            }
        }
    }
    
    // Handle controller button presses for selection confirmation
    function handleControllerSelection(gamepad, controllerIndex) {
        // Check if any action button is pressed (A, B, X, Y on Xbox)
        const buttonPressed = [0, 1, 2, 3].some(buttonIndex => 
            gamepad.buttons[buttonIndex] && 
            gamepad.buttons[buttonIndex].pressed && 
            !controllerStates[controllerIndex].lastButtonState[buttonIndex]
        );
        
        if (buttonPressed && controllerStates[controllerIndex].currentClient) {
            // Assign this controller to the currently highlighted client
            assignController(controllerIndex, controllerStates[controllerIndex].currentClient);
        }
    }
    
    // Highlight a client box with the controller's color
    function highlightClient(controllerIndex, clientId, color) {
        // Clear previous highlight for this controller
        if (controllerStates[controllerIndex].currentClient) {
            const previousClientId = controllerStates[controllerIndex].currentClient;
            const previousHighlight = document.querySelector(`.controller-highlight-${controllerIndex}`);
            if (previousHighlight) {
                previousHighlight.remove();
            }
        }
        
        // Set new current client
        controllerStates[controllerIndex].currentClient = clientId;
        
        // Find the client box
        const clientBox = document.querySelector(`.client-box[data-client-id="${clientId}"]`);
        if (!clientBox) return;
        
        // Create highlight element
        const highlight = document.createElement('div');
        highlight.className = `controller-highlight controller-highlight-${controllerIndex}`;
        highlight.style.position = 'absolute';
        highlight.style.top = '0';
        highlight.style.left = '0';
        highlight.style.right = '0';
        highlight.style.bottom = '0';
        highlight.style.border = `4px solid ${color}`;
        highlight.style.borderRadius = '8px';
        highlight.style.pointerEvents = 'none';
        highlight.style.zIndex = '1001';
        highlight.style.boxShadow = `0 0 15px ${color}`;
        
        // Add controller indicator
        const indicator = document.createElement('div');
        indicator.style.position = 'absolute';
        indicator.style.top = '10px';
        indicator.style.left = '10px';
        indicator.style.background = color;
        indicator.style.color = 'white';
        indicator.style.padding = '2px 8px';
        indicator.style.borderRadius = '4px';
        indicator.style.fontSize = '12px';
        indicator.style.fontWeight = 'bold';
        indicator.textContent = `Controller ${controllerIndex + 1}`;
        
        highlight.appendChild(indicator);
        clientBox.appendChild(highlight);
        
        // Play navigation sound
        playNavigationSound();
    }
    
    // Assign a controller to a client
    function assignController(controllerIndex, clientId) {
        console.log(`Assigning controller ${controllerIndex} to client ${clientId}`);
        
        // Mark controller as assigned
        controllerStates[controllerIndex].assigned = true;
        
        // Add client to assigned set
        assignedClients.add(clientId);
        
        // Store assignment
        controllerAssignments[controllerIndex] = clientId;
        
        // Update highlight to indicate assignment
        const highlight = document.querySelector(`.controller-highlight-${controllerIndex}`);
        if (highlight) {
            highlight.style.border = `4px solid ${CONTROLLER_COLORS[controllerIndex % CONTROLLER_COLORS.length]}`;
            highlight.style.boxShadow = `0 0 25px ${CONTROLLER_COLORS[controllerIndex % CONTROLLER_COLORS.length]}`;
            
            // Add "SELECTED" text
            const selectionIndicator = document.createElement('div');
            selectionIndicator.style.position = 'absolute';
            selectionIndicator.style.bottom = '10px';
            selectionIndicator.style.left = '50%';
            selectionIndicator.style.transform = 'translateX(-50%)';
            selectionIndicator.style.background = CONTROLLER_COLORS[controllerIndex % CONTROLLER_COLORS.length];
            selectionIndicator.style.color = 'white';
            selectionIndicator.style.padding = '5px 15px';
            selectionIndicator.style.borderRadius = '4px';
            selectionIndicator.style.fontSize = '14px';
            selectionIndicator.style.fontWeight = 'bold';
            selectionIndicator.textContent = 'SELECTED';
            
            highlight.appendChild(selectionIndicator);
        }
        
        // Configure the client window to use this controller exclusively
        window.clientWindows = window.clientWindows || [];
        const clientWindow = window.clientWindows.find(cw => cw.clientId === clientId);
        if (clientWindow && clientWindow.window) {
            // Set controller assignment in the client window
            clientWindow.window.controllerIndex = controllerIndex;
            console.log(`Set controller ${controllerIndex} for client window ${clientId}`);
            
            // Activate the client window
            if (clientWindow.iframe) {
                clientWindow.iframe.focus();
            }
        }
        
        // Play selection confirmation sound
        playSelectionSound();
        
        // Check if all clients have controllers assigned
        checkAllClientsAssigned();
    }
    
    // Add visual indicator for a connected controller
    function addControllerIndicator(controllerIndex, color) {
        // Create or get container for controller indicators
        let container = document.getElementById('controller-indicators');
        if (!container) {
            container = document.createElement('div');
            container.id = 'controller-indicators';
            container.style.position = 'fixed';
            container.style.top = '10px';
            container.style.right = '10px';
            container.style.zIndex = '2000';
            document.body.appendChild(container);
        }
        
        // Create indicator for this controller
        const indicator = document.createElement('div');
        indicator.className = `controller-indicator controller-indicator-${controllerIndex}`;
        indicator.style.background = color;
        indicator.style.color = 'white';
        indicator.style.padding = '5px 10px';
        indicator.style.margin = '5px';
        indicator.style.borderRadius = '5px';
        indicator.style.fontSize = '12px';
        indicator.style.fontWeight = 'bold';
        indicator.style.display = 'flex';
        indicator.style.alignItems = 'center';
        
        // Add gamepad icon
        const icon = document.createElement('span');
        icon.textContent = '🎮 ';
        icon.style.marginRight = '5px';
        icon.style.fontSize = '16px';
        
        // Add controller number/name
        const text = document.createElement('span');
        text.textContent = `Controller ${controllerIndex + 1}`;
        
        indicator.appendChild(icon);
        indicator.appendChild(text);
        container.appendChild(indicator);
        
        console.log(`Added indicator for controller ${controllerIndex}`);
    }
    
    // Check if all clients have controllers assigned
    function checkAllClientsAssigned() {
        const clientBoxes = document.querySelectorAll('.client-box');
        
        // Check if all client boxes have controllers assigned
        if (assignedClients.size === clientBoxes.length) {
            console.log("All clients have controllers assigned, starting game...");
            
            // Start the game after a short delay
            setTimeout(() => {
                // Hide controller selection UI
                const selectionUI = document.getElementById('controller-selection-ui');
                if (selectionUI) {
                    selectionUI.style.display = 'none';
                }
                
                // Signal game start
                document.dispatchEvent(new CustomEvent('localMultiplayerReady', {
                    detail: { controllerAssignments }
                }));
            }, 1000);
        }
    }
    
    // Play sound for navigation
    function playNavigationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.value = 300; // Hz - navigation sound
            gainNode.gain.value = 0.05; // Lower volume
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.05); // Short sound
        } catch (err) {
            console.log('Audio not supported for navigation sound');
        }
    }
    
    // Play sound for selection
    function playSelectionSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.value = 440; // Hz - selection sound (A4)
            gainNode.gain.value = 0.1;
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (err) {
            console.log('Audio not supported for selection sound');
        }
    }
    
    // Export key functions to window for external access
    window.localMultiplayer = {
        getControllerAssignments: () => ({ ...controllerAssignments }),
        isControllerAssigned: (controllerIndex) => controllerStates[controllerIndex]?.assigned || false,
        getAssignedClient: (controllerIndex) => controllerAssignments[controllerIndex] || null,
        getControllerForClient: (clientId) => {
            for (const [controller, client] of Object.entries(controllerAssignments)) {
                if (client === clientId) return Number(controller);
            }
            return null;
        },
        // Function to check if a controller should be processed by a client
        shouldProcessController: (controllerIndex, clientId) => {
            return controllerAssignments[controllerIndex] === clientId;
        },
        // Start controller polling
        startControllerPolling: () => {
            console.log("Starting controller polling from external call");
            startControllerPolling();
        },
        // Stop controller polling
        stopControllerPolling: () => {
            console.log("Stopping controller polling from external call");
            stopControllerPolling();
        }
    };
}); 