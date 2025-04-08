// GamepadUI.js - Manages display of gamepad controls and bindings

class GamepadUI {
    constructor() {
        this.isVisible = false;
        this.controlsContainer = null;
        
        // Create the UI element
        this.initUI();
        
        // Set up event listeners for gamepad connections
        if (window.inputManager) {
            window.inputManager.on('gamepadconnected', this.onGamepadConnected.bind(this));
            window.inputManager.on('gamepaddisconnected', this.onGamepadDisconnected.bind(this));
        }
        
        // Register button handler for gamepad help toggle
        this.registerButtonHandler();
    }
    
    initUI() {
        // Create container for controls overlay
        this.controlsContainer = document.createElement('div');
        this.controlsContainer.id = 'gamepad-controls-overlay';
        this.controlsContainer.style.position = 'absolute';
        this.controlsContainer.style.top = '80px';
        this.controlsContainer.style.right = '20px';
        this.controlsContainer.style.padding = '15px';
        this.controlsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.controlsContainer.style.color = 'white';
        this.controlsContainer.style.borderRadius = '8px';
        this.controlsContainer.style.fontFamily = 'Arial, sans-serif';
        this.controlsContainer.style.zIndex = '1000';
        this.controlsContainer.style.maxWidth = '350px';
        this.controlsContainer.style.display = 'none'; // Hidden by default
        this.controlsContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        
        // Create the header with close button
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '10px';
        header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.3)';
        header.style.paddingBottom = '5px';
        
        const title = document.createElement('h3');
        title.textContent = 'Gamepad Controls';
        title.style.margin = '0';
        title.style.fontSize = '16px';
        
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.color = 'white';
        closeButton.style.fontSize = '20px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.padding = '0 5px';
        closeButton.onclick = () => this.toggleVisibility(false);
        
        header.appendChild(title);
        header.appendChild(closeButton);
        this.controlsContainer.appendChild(header);
        
        // Create content area with bindings info
        this.updateBindingsDisplay();
        
        // Add to document
        document.body.appendChild(this.controlsContainer);
        
        // Create toggle button
        this.createToggleButton();
    }
    
    createToggleButton() {
        const toggleButton = document.createElement('button');
        toggleButton.id = 'gamepad-controls-toggle';
        toggleButton.textContent = 'Controls';
        toggleButton.style.position = 'absolute';
        toggleButton.style.bottom = '60px';
        toggleButton.style.right = '20px';
        toggleButton.style.padding = '8px 12px';
        toggleButton.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        toggleButton.style.color = 'white';
        toggleButton.style.border = 'none';
        toggleButton.style.borderRadius = '4px';
        toggleButton.style.cursor = 'pointer';
        toggleButton.style.fontFamily = 'Arial, sans-serif';
        toggleButton.style.zIndex = '100';
        toggleButton.onclick = () => this.toggleVisibility();
        
        document.body.appendChild(toggleButton);
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
        // Update bindings display if visible
        if (this.isVisible) {
            this.updateBindingsDisplay();
        }
    }
    
    onGamepadDisconnected(event) {
        // Update bindings display if visible
        if (this.isVisible) {
            this.updateBindingsDisplay();
        }
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