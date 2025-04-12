// GamepadUI.js - Manages display of gamepad controls and bindings

class GamepadUI {
    constructor() {
        this.isVisible = false;
        this.controlsContainer = null;
        this.activeInputDisplay = null;
        
        // Create the UI elements (safe to do early)
        this.initUI();
        
        // Defer listener setup until managers are ready
        document.addEventListener('managersReady', this.setupListeners.bind(this));
        
        // Register button handler for gamepad help toggle (also deferred)
        // this.registerButtonHandler(); // Moved to setupListeners
        
        // Initialize active input display (will be updated once managers are ready)
        // this.updateActiveInputDisplay(); // Moved to setupListeners
    }

    setupListeners() {
        console.log("[GamepadUI] managersReady event received. Setting up listeners.");
        if (window.inputManager) {
            window.inputManager.on('gamepadconnected', this.onGamepadConnected.bind(this));
            window.inputManager.on('gamepaddisconnected', this.onGamepadDisconnected.bind(this));
            // This listener handles subsequent changes
            window.inputManager.on('inputtypechange', this.onInputTypeChange.bind(this));
            
            // Register button handler now that InputManager is ready
            this.registerButtonHandler();
            
            // Update display initially now that InputManager is ready
            // This might show default before init finishes setting the type
            this.updateActiveInputDisplay(); 

            // Add listener for gameEngineReady to ensure final initial state is shown
            window.addEventListener('gameEngineReady', () => {
                console.log("[GamepadUI] gameEngineReady event received. Updating display.");
                this.updateActiveInputDisplay();
            }, { once: true });

        } else {
            console.error("[GamepadUI] InputManager not found even after managersReady event!");
        }
    }

    initUI() {
        // Create the main container
        this.controlsContainer = document.createElement('div');
        this.controlsContainer.id = 'gamepad-controls-popup';
        this.controlsContainer.style.position = 'fixed';
        this.controlsContainer.style.bottom = '60px';
        this.controlsContainer.style.right = '20px';
        this.controlsContainer.style.width = '300px';
        this.controlsContainer.style.maxHeight = '400px';
        this.controlsContainer.style.overflowY = 'auto';
        this.controlsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.controlsContainer.style.color = 'white';
        this.controlsContainer.style.padding = '15px';
        this.controlsContainer.style.borderRadius = '8px';
        this.controlsContainer.style.border = '1px solid #555';
        this.controlsContainer.style.zIndex = '1010';
        this.controlsContainer.style.fontFamily = 'Arial, sans-serif';
        this.controlsContainer.style.fontSize = '14px';
        this.controlsContainer.style.display = 'none'; // Initially hidden
        this.controlsContainer.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
        
        // Title
        const title = document.createElement('h3');
        title.textContent = 'Gamepad Controls';
        title.style.marginTop = '0';
        title.style.marginBottom = '15px';
        title.style.borderBottom = '1px solid #444';
        title.style.paddingBottom = '10px';
        this.controlsContainer.appendChild(title);
        
        // Bindings list
        this.bindingsList = document.createElement('ul');
        this.bindingsList.style.listStyle = 'none';
        this.bindingsList.style.padding = '0';
        this.bindingsList.style.margin = '0';
        this.controlsContainer.appendChild(this.bindingsList);
        
        // Close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.marginTop = '15px';
        closeButton.style.padding = '8px 15px';
        closeButton.style.backgroundColor = '#555';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '4px';
        closeButton.style.cursor = 'pointer';
        closeButton.addEventListener('click', () => this.toggleVisibility(false));
        this.controlsContainer.appendChild(closeButton);
        
        // Append to body
        document.body.appendChild(this.controlsContainer);
        
        // Also initialize the active input display element here
        this.createActiveInputDisplayElement();
    }

    // New function to just create the element, not update text
    createActiveInputDisplayElement() {
         if (!this.activeInputDisplay) {
            this.activeInputDisplay = document.createElement('div');
            this.activeInputDisplay.id = 'active-input-display'; // Give it an ID
            this.activeInputDisplay.style.position = 'absolute';
            this.activeInputDisplay.style.top = '10px'; // Adjust position as needed
            this.activeInputDisplay.style.left = 'calc(50% - 100px)'; // Center it roughly
            this.activeInputDisplay.style.width = '200px';
            this.activeInputDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
            this.activeInputDisplay.style.color = 'white';
            this.activeInputDisplay.style.padding = '5px 10px';
            this.activeInputDisplay.style.borderRadius = '5px';
            this.activeInputDisplay.style.fontFamily = 'Arial, sans-serif';
            this.activeInputDisplay.style.fontSize = '12px';
            this.activeInputDisplay.style.zIndex = '1001'; 
            this.activeInputDisplay.style.textAlign = 'center';
            this.activeInputDisplay.style.cursor = 'pointer';
            this.activeInputDisplay.style.userSelect = 'none';
            this.activeInputDisplay.title = 'Click to toggle input method';
            this.activeInputDisplay.textContent = 'Input: ...'; // Initial placeholder
            
            // Add click event to toggle input type
            this.activeInputDisplay.addEventListener('click', () => {
                if (window.inputManager) {
                    window.inputManager.toggleActiveInputType();
                }
            });
            
            // Append to body
            document.body.appendChild(this.activeInputDisplay);
            console.log("[GamepadUI] Created active input display element.");
        }
    }

    updateBindingsDisplay() {
        // Get config from input manager if available
        const config = window.inputManager ? window.inputManager.gamepadConfig : {
            buttonMapping: {
                0: 'space', // A button -> jump
                1: 'v',     // B button -> toggle view
                4: 'q',     // LB -> Q
                5: 'e',     // RB -> E
                6: 'shift', // LT -> shift
                7: 'shift'  // RT -> shift (alternative)
            }
        };
        
        // Clear existing content
        if (this.bindingsContent) {
            this.controlsContainer.removeChild(this.bindingsContent);
        }
        
        // Create content container
        this.bindingsContent = document.createElement('div');
        
        // Add controller image/diagram
        const controllerImage = document.createElement('div');
        controllerImage.style.textAlign = 'center';
        controllerImage.style.margin = '10px 0';
        controllerImage.innerHTML = `
            <div style="width: 300px; height: 180px; margin: 0 auto; background-color: rgba(50, 50, 50, 0.5); border-radius: 5px; display: flex; justify-content: center; align-items: center;">
                <svg width="240" height="150" viewBox="0 0 240 150">
                    <!-- Simple controller outline -->
                    <rect x="70" y="30" width="100" height="60" rx="30" fill="#444" />
                    <rect x="30" y="50" width="40" height="40" rx="20" fill="#555" />
                    <rect x="170" y="50" width="40" height="40" rx="20" fill="#555" />
                    
                    <!-- Left stick -->
                    <circle cx="50" cy="70" r="15" fill="#333" stroke="#777" stroke-width="2" />
                    <text x="50" y="95" text-anchor="middle" fill="white" font-size="8">Left Stick</text>
                    <text x="50" y="105" text-anchor="middle" fill="white" font-size="8">Move</text>
                    
                    <!-- Right stick -->
                    <circle cx="190" cy="70" r="15" fill="#333" stroke="#777" stroke-width="2" />
                    <text x="190" y="95" text-anchor="middle" fill="white" font-size="8">Right Stick</text>
                    <text x="190" y="105" text-anchor="middle" fill="white" font-size="8">Look</text>
                    
                    <!-- Face buttons -->
                    <circle cx="170" cy="50" r="8" fill="#4CAF50" />
                    <text x="170" y="53" text-anchor="middle" fill="white" font-size="8">A</text>
                    
                    <circle cx="190" cy="70" r="8" fill="#F44336" />
                    <text x="190" y="73" text-anchor="middle" fill="white" font-size="8">B</text>
                    
                    <!-- Shoulder buttons -->
                    <rect x="60" y="20" width="25" height="10" rx="5" fill="#777" />
                    <text x="72" y="28" text-anchor="middle" fill="white" font-size="8">LB</text>
                    
                    <rect x="155" y="20" width="25" height="10" rx="5" fill="#777" />
                    <text x="167" y="28" text-anchor="middle" fill="white" font-size="8">RB</text>
                </svg>
            </div>
        `;
        this.bindingsContent.appendChild(controllerImage);
        
        // Add text description of controls
        const controlsList = document.createElement('div');
        controlsList.style.fontSize = '14px';
        controlsList.style.lineHeight = '1.5';
        
        const controlBindings = [
            { label: 'Left Stick', action: 'Movement (WASD)' },
            { label: 'Right Stick', action: 'Look around' },
            { label: 'A Button', action: 'Jump' },
            { label: 'B Button', action: 'Toggle View' },
            { label: 'LB/RB', action: 'Turn Left/Right' },
            { label: 'LT/RT', action: 'Sprint' }
        ];
        
        controlBindings.forEach(binding => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.marginBottom = '5px';
            
            const label = document.createElement('span');
            label.textContent = binding.label;
            label.style.fontWeight = 'bold';
            
            const action = document.createElement('span');
            action.textContent = binding.action;
            
            row.appendChild(label);
            row.appendChild(action);
            controlsList.appendChild(row);
        });
        
        // Add connected gamepads info
        if (window.navigator.getGamepads) {
            const gamepads = navigator.getGamepads();
            if (gamepads && gamepads.some(gp => gp !== null)) {
                const connectedSection = document.createElement('div');
                connectedSection.style.marginTop = '15px';
                connectedSection.style.borderTop = '1px solid rgba(255, 255, 255, 0.3)';
                connectedSection.style.paddingTop = '10px';
                
                const heading = document.createElement('h4');
                heading.textContent = 'Connected Controllers';
                heading.style.margin = '0 0 8px 0';
                heading.style.fontSize = '14px';
                connectedSection.appendChild(heading);
                
                for (let i = 0; i < gamepads.length; i++) {
                    const gamepad = gamepads[i];
                    if (gamepad) {
                        const gamepadInfo = document.createElement('div');
                        gamepadInfo.textContent = `${i+1}: ${gamepad.id.substring(0, 25)}${gamepad.id.length > 25 ? '...' : ''}`;
                        gamepadInfo.style.fontSize = '12px';
                        gamepadInfo.style.opacity = '0.8';
                        gamepadInfo.style.marginBottom = '4px';
                        connectedSection.appendChild(gamepadInfo);
                    }
                }
                
                controlsList.appendChild(connectedSection);
            }
        }
        
        this.bindingsContent.appendChild(controlsList);
        this.controlsContainer.appendChild(this.bindingsContent);
    }
    
    updateActiveInputDisplay() {
        // Ensure the element exists
        if (!this.activeInputDisplay) {
            console.warn("[GamepadUI] Trying to update active input display, but element doesn't exist.");
            this.createActiveInputDisplayElement(); // Attempt to create if missing
            if (!this.activeInputDisplay) return; // Exit if creation failed
        }
        
        // Ensure InputManager exists before trying to get type
        if (!window.inputManager) {
            console.warn("[GamepadUI] InputManager not ready, cannot update active input display text.");
            this.activeInputDisplay.textContent = 'Input: Waiting...'; // Show waiting state
            return;
        }
        
        // Update the text based on current input type
        const inputType = window.inputManager.getActiveInputType();
        this.activeInputDisplay.textContent = `Input: ${inputType === 'keyboardMouse' ? 'Keyboard/Mouse' : 'Gamepad'}`;
        
        // Add a visual indicator if gamepad is active
        if (inputType === 'gamepad') {
            this.activeInputDisplay.style.border = '1px solid #00dd00'; // Use a subtle border
            this.activeInputDisplay.style.boxShadow = '0 0 5px #00dd00';
        } else {
            this.activeInputDisplay.style.border = 'none';
            this.activeInputDisplay.style.boxShadow = 'none';
        }
        console.log(`[GamepadUI] Updated active input display to: ${this.activeInputDisplay.textContent}`);
    }
    
    toggleVisibility(forcedState) {
        // If forcedState is provided, use it; otherwise toggle
        this.isVisible = forcedState !== undefined ? forcedState : !this.isVisible;
        this.controlsContainer.style.display = this.isVisible ? 'block' : 'none';
        
        // Update controls information when showing
        if (this.isVisible) {
            this.updateBindingsDisplay();
        }
    }
    
    onGamepadConnected(event) {
        console.log(`[GamepadUI] Gamepad connected: ${event.gamepad.id}`);
        // Show a notification or update UI when a gamepad is connected
        this.updateBindingsDisplay();
        this.updateActiveInputDisplay();
    }
    
    onGamepadDisconnected(event) {
        // Update bindings display if visible
        if (this.isVisible) {
            this.updateBindingsDisplay();
        }
    }
    
    onInputTypeChange(data) {
        console.log(`[GamepadUI] Input type change event received: ${data.type}`);
        // Directly update the UI text and style based on the event data
        if (!this.activeInputDisplay) {
            console.warn("[GamepadUI] activeInputDisplay element not found during input type change.");
            this.createActiveInputDisplayElement(); // Attempt to create if missing
            if (!this.activeInputDisplay) return; 
        }
        
        const inputType = data.type; // Use the type directly from the event data
        this.activeInputDisplay.textContent = `Input: ${inputType === 'keyboardMouse' ? 'Keyboard/Mouse' : 'Gamepad'}`;
        
        // Add/remove visual indicator based on the event type
        if (inputType === 'gamepad') {
            this.activeInputDisplay.style.border = '1px solid #00dd00';
            this.activeInputDisplay.style.boxShadow = '0 0 5px #00dd00';
        } else {
            this.activeInputDisplay.style.border = 'none';
            this.activeInputDisplay.style.boxShadow = 'none';
        }
        console.log(`[GamepadUI] Directly updated active input display to: ${this.activeInputDisplay.textContent}`);
        
        // We no longer need to call this if we update directly
        // this.updateActiveInputDisplay(); 
    }
    
    registerButtonHandler() {
        // Register handler for gamepad button to toggle controls
        if (window.inputManager) {
            // First, let's check if controllers are detected
            window.inputManager.on('gamepadbuttondown', (event) => {
                // Use Start button (button 9 on most controllers) to toggle the display
                if (event.buttonIndex === 9) {
                    this.toggleVisibility();
                }
            });
            
            console.log("Registered gamepad button handler for controls toggle");
        }
    }
}

// Create and expose the UI instance
window.gamepadUI = new GamepadUI(); 