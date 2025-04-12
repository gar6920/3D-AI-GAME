class InputManager {
    constructor() {
        // Input state tracking
        this.keys = {
            w: false, a: false, s: false, d: false,
            space: false, q: false, e: false, shift: false,
            v: false // Add V key tracking
        };
        this.mouseDelta = { x: 0, y: 0 };
        this.mousePosition = { x: 0, y: 0 };
        this.mouseButtons = { left: false, middle: false, right: false };
        
        // Gamepad tracking
        this.gamepads = {};
        this.isGamepadAvailable = false;
        this.lastActiveInputType = 'none'; // 'keyboardMouse', 'gamepad', or 'none'
        this.activeGamepadIndex = -1;
        
        // Track gamepad stick positions for continuous camera control
        this.rightStickPosition = { x: 0, y: 0 };
        this.leftStickPosition = { x: 0, y: 0 };
        
        // Gamepad configuration
        this.gamepadConfig = {
            deadzone: 0.15, // Reduced deadzone for more responsive controls (Reverted from 0.30)
            lookSensitivity: 40, // Increased sensitivity for camera rotation
            movementAxes: { // Which axes map to WASD movement
                horizontal: 0, // Left stick horizontal
                vertical: 1   // Left stick vertical
            },
            lookAxes: { // Which axes map to mouse movement
                horizontal: 2, // Right stick horizontal
                vertical: 3    // Right stick vertical
            },
            buttonMapping: {
                // Standard gamepad button mapping (Xbox-like)
                0: 'space', // A button -> jump
                1: 'v',     // B button -> toggle view
                4: 'q',     // LB -> Q
                5: 'e',     // RB -> E
                6: 'shift', // LT -> shift
                7: 'shift'  // RT -> shift (alternative)
            }
        };
        
        console.log('[InputManager] Initialized with gamepad config:', {
            deadzone: this.gamepadConfig.deadzone,
            lookSensitivity: this.gamepadConfig.lookSensitivity,
            movementAxes: this.gamepadConfig.movementAxes,
            lookAxes: this.gamepadConfig.lookAxes
        });
        
        // Environment detection (electron vs browser)
        this.isElectron = typeof window.electronAPI !== 'undefined';
        this.playerId = this.isElectron ? (window.electronAPI.getPlayerId ? window.electronAPI.getPlayerId() : 0) : 0;
        
        // Server-compatible state (matches expected schema)
        this.serverInputState = {
            keys: { w: false, a: false, s: false, d: false, space: false, q: false, e: false, shift: false },
            mouseDelta: { x: 0, y: 0 },
            viewMode: window.viewMode || 'firstPerson',
            thirdPersonCameraAngle: window.thirdPersonCameraOrbitX || 0,
            clientRotation: { rotationY: 0, pitch: 0 }
        };
        
        // Event callbacks
        this.callbacks = {
            keydown: [], keyup: [], mousedown: [], mouseup: [], mousemove: [], wheel: [],
            gamepadconnected: [], gamepaddisconnected: [], gamepadbuttondown: [], 
            gamepadbuttonup: [], gamepadaxismove: [], inputtypechange: []
        };
        
        // UI element handlers - store by element ID and event type
        this.uiElementCallbacks = {};
        
        // Bind methods
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onWheel = this.onWheel.bind(this);
        this.update = this.update.bind(this);
        this.handleUIEvent = this.handleUIEvent.bind(this);
        this.onGamepadConnected = this.onGamepadConnected.bind(this);
        this.onGamepadDisconnected = this.onGamepadDisconnected.bind(this);
        this.pollGamepads = this.pollGamepads.bind(this);
        
        // Initialize
        this.init();
        
        // Initialize prevGamepadState
        this.prevGamepadState = {};
    }
    
    init() {
        // Add parallel event listeners that run alongside existing ones
        document.addEventListener('keydown', this.onKeyDown, false);
        document.addEventListener('keyup', this.onKeyUp, false);
        document.addEventListener('mousedown', this.onMouseDown, false);
        document.addEventListener('mouseup', this.onMouseUp, false);
        document.addEventListener('mousemove', this.onMouseMove, false);
        document.addEventListener('wheel', this.onWheel, false);
        
        // Add a global click handler to check for UI element interactions
        document.addEventListener('click', this.handleUIEvent, false);
        
        // Initialize gamepad support if not in Electron mode
        if (!this.isElectron) {
            // Browser-based gamepad support
            window.addEventListener('gamepadconnected', this.onGamepadConnected);
            window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected);
            
            // Check for already connected gamepads
            this.checkForConnectedGamepads();
        } else {
            // In Electron mode, listen for gamepad data from main process
            if (window.electronAPI && window.electronAPI.onGamepadInput) {
                window.electronAPI.onGamepadInput(this.handleElectronGamepadInput.bind(this));
                
                // Notify Electron that we're ready for gamepad input
                if (window.electronAPI.notifyReady) {
                    window.electronAPI.notifyReady();
                }
            }
        }
        
        console.log("InputManager initialized with centralized event handling and gamepad support");
    }
    
    // Check for already connected gamepads
    checkForConnectedGamepads() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let foundGamepads = 0;
        
        for (let i = 0; i < gamepads.length; i++) {
            const gamepad = gamepads[i];
            if (gamepad) {
                // Synthesize a connection event for this gamepad
                this.onGamepadConnected({ gamepad });
                foundGamepads++;
            }
        }
        
        if (foundGamepads > 0) {
            console.log(`Found ${foundGamepads} already connected gamepad(s)`);
        }
    }
    
    // Gamepad event handlers
    onGamepadConnected(event) {
        const gamepad = event.gamepad;
        console.log(`Gamepad connected: ${gamepad.id} (index: ${gamepad.index})`);
        
        this.gamepads[gamepad.index] = {
            id: gamepad.id,
            timestamp: gamepad.timestamp,
            buttons: Array(gamepad.buttons.length).fill(false),
            axes: Array(gamepad.axes.length).fill(0)
        };
        
        this.isGamepadAvailable = true;
        
        // If this is our first gamepad, make it active
        if (this.activeGamepadIndex === -1) {
            this.activeGamepadIndex = gamepad.index;
        }
        
        // Trigger callbacks
        this.callbacks.gamepadconnected.forEach(callback => 
            callback({ gamepad: gamepad, index: gamepad.index, id: gamepad.id })
        );
    }
    
    onGamepadDisconnected(event) {
        const gamepad = event.gamepad;
        console.log(`Gamepad disconnected: ${gamepad.id} (index: ${gamepad.index})`);
        
        delete this.gamepads[gamepad.index];
        
        // If the active gamepad was disconnected, find a new one
        if (this.activeGamepadIndex === gamepad.index) {
            const availableGamepads = Object.keys(this.gamepads);
            this.activeGamepadIndex = availableGamepads.length > 0 ? parseInt(availableGamepads[0]) : -1;
        }
        
        // Update gamepad availability flag
        this.isGamepadAvailable = Object.keys(this.gamepads).length > 0;
        
        // If no more gamepads are available, switch back to keyboard/mouse
        if (!this.isGamepadAvailable && this.lastActiveInputType === 'gamepad') {
            this.lastActiveInputType = 'keyboardMouse';
            this.dispatchEvent('inputtypechange', { type: this.lastActiveInputType });
        }
        
        // Trigger callbacks
        this.callbacks.gamepaddisconnected.forEach(callback => 
            callback({ gamepad: gamepad, index: gamepad.index, id: gamepad.id })
        );
    }
    
    pollGamepads() {
        // Skip polling if we're in Electron mode (input comes via IPC)
        if (this.isElectron) return;
        
        // Debug polling frequency - add a timestamp every second
        const now = performance.now();
        if (!this._lastPollLog || now - this._lastPollLog > 1000) {
            this._lastPollLog = now;
            console.log(`[InputManager] Polling gamepads at ${Math.round(now)}`);
        }
        
        // Get fresh gamepad data
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        
        // Log gamepad status if none are registered but some are found
        if (Object.keys(this.gamepads).length === 0 && gamepads.some(g => g !== null)) {
            console.log('[InputManager] Detected gamepads that aren\'t registered:',
                Array.from(gamepads)
                    .filter(g => g !== null)
                    .map(g => `${g.id} (index: ${g.index})`)
            );
        }
        
        // Process each connected gamepad
        for (let i = 0; i < gamepads.length; i++) {
            const gamepad = gamepads[i];
            if (!gamepad) continue; // Skip if null (disconnected)
            
            // If we haven't seen this gamepad before (missed connection event),
            // add it now
            if (!this.gamepads[gamepad.index]) {
                console.log(`[InputManager] Detected previously unregistered gamepad: ${gamepad.id} (index: ${gamepad.index})`);
                this.onGamepadConnected({ gamepad });
                
                // Force gamepad to be active if none are active
                if (this.activeGamepadIndex === -1) {
                    this.activeGamepadIndex = gamepad.index;
                    this.lastActiveInputType = 'gamepad';
                    console.log(`[InputManager] Set gamepad ${gamepad.index} as active input device`);
                }
                continue;
            }
            
            // Skip if this gamepad hasn't been updated since last poll
            const storedGamepad = this.gamepads[gamepad.index];
            if (gamepad.timestamp === storedGamepad.timestamp) continue;
            
            // Process buttons
            for (let j = 0; j < gamepad.buttons.length; j++) {
                const buttonPressed = gamepad.buttons[j].pressed;
                const prevPressed = storedGamepad.buttons[j];
                
                // Button state has changed
                if (buttonPressed !== prevPressed) {
                    storedGamepad.buttons[j] = buttonPressed;
                    
                    // Handle the button state change
                    this._handleGamepadButton(gamepad.index, j, buttonPressed);
                }
            }
            
            // Process axes
            for (let j = 0; j < gamepad.axes.length; j++) {
                const axisValue = gamepad.axes[j];
                const prevValue = storedGamepad.axes[j];
                
                // Only process if significant change beyond deadzone 
                if (Math.abs(axisValue - prevValue) > 0.01) {
                    storedGamepad.axes[j] = axisValue;
                    
                    // Handle the axis change
                    this._handleGamepadAxis(gamepad.index, j, axisValue);
                }
            }
            
            // Update timestamp
            storedGamepad.timestamp = gamepad.timestamp;
        }
    }
    
    // Handle gamepad button event
    _handleGamepadButton(gamepadIndex, buttonIndex, isPressed) {
        // Mark gamepad as the last active input if a button was pressed
        if (isPressed && this.lastActiveInputType !== 'gamepad') {
            this.lastActiveInputType = 'gamepad';
            this.dispatchEvent('inputtypechange', { type: 'gamepad' });
            console.log(`[InputManager] Input type changed to gamepad due to button ${buttonIndex} press`);
        }
        
        // Only update game state if this is the active gamepad or newly active
        if (isPressed) {
            this.activeGamepadIndex = gamepadIndex;
        }
        
        if (gamepadIndex !== this.activeGamepadIndex) return;
        
        // Trigger event callbacks
        const eventType = isPressed ? 'gamepadbuttondown' : 'gamepadbuttonup';
        console.log(`[Gamepad] Button ${buttonIndex} ${isPressed ? 'pressed' : 'released'}`);
        
        this.callbacks[eventType].forEach(callback => 
            callback({ gamepadIndex, buttonIndex, isPressed })
        );
        
        // Map button to keyboard key if defined in mapping
        const mappedKey = this.gamepadConfig.buttonMapping[buttonIndex];
        if (mappedKey && this.keys[mappedKey] !== undefined) {
            console.log(`[Gamepad] Mapping button ${buttonIndex} to key '${mappedKey}' (${isPressed ? 'pressed' : 'released'})`);
            this.keys[mappedKey] = isPressed;
            
            // Also update server input state for mapped controls
            if (this.serverInputState.keys[mappedKey] !== undefined) {
                this.serverInputState.keys[mappedKey] = isPressed;
                console.log(`[Gamepad] Updated serverInputState.keys.${mappedKey} = ${isPressed}`);
            }
            
            // For toggle buttons like view or building mode, directly trigger action when pressed
            if (isPressed) {
                console.log(`[Gamepad] Checking if special action needed for key: ${mappedKey}`);
                
                // Special case for V key (toggle view)
                if (mappedKey === 'v') {
                    console.log(`[Gamepad] Attempting to toggle camera view`);
                    console.log(`[Gamepad] window.toggleCameraView exists:`, typeof window.toggleCameraView === 'function');
                    
                    if (typeof window.toggleCameraView === 'function') {
                        try {
                            window.toggleCameraView();
                            console.log(`[Gamepad] Successfully called toggleCameraView`);
                        } catch (error) {
                            console.error(`[Gamepad] Error calling toggleCameraView:`, error);
                        }
                    }
                }
                
                // Special case for B key (toggle building mode)
                if (mappedKey === 'b') {
                    console.log(`[Gamepad] Attempting to toggle building mode`);
                    if (window.buildingModeManager && typeof window.buildingModeManager.toggle === 'function') {
                        try {
                            window.buildingModeManager.toggle();
                            console.log(`[Gamepad] Successfully toggled building mode`);
                        } catch (error) {
                            console.error(`[Gamepad] Error toggling building mode:`, error);
                        }
                    }
                }
                
                // Immediately sync to global state to ensure consistent state
                this.syncToGlobalState();
            }
        }
    }
    
    // Handle gamepad axis event
    _handleGamepadAxis(gamepadIndex, axisIndex, value) {
        // Only update game state if this is the active gamepad
        if (gamepadIndex !== this.activeGamepadIndex) return;
        
        // Apply deadzone
        const deadzone = this.gamepadConfig.deadzone; // Reverted to 0.15
        const processedValue = Math.abs(value) < deadzone ? 0 : value;
        
        // Debug log for all axis movements
        console.log(`[Gamepad] Axis ${axisIndex} value: ${processedValue.toFixed(3)}`);
        
        // If any axis has a significant movement, mark gamepad as active input
        if (Math.abs(processedValue) > deadzone && this.lastActiveInputType !== 'gamepad') {
            this.lastActiveInputType = 'gamepad';
            this.dispatchEvent('inputtypechange', { type: 'gamepad' });
            console.log(`[InputManager] Input type changed to gamepad due to axis ${axisIndex} movement`);
        }
        
        // Trigger axis movement callbacks
        this.callbacks.gamepadaxismove.forEach(callback => 
            callback({ gamepadIndex, axisIndex, value: processedValue })
        );
        
        // Handle movement axes (left stick typically)
        const { movementAxes, lookAxes } = this.gamepadConfig;
        
        // Left stick horizontal (usually axis 0) -> A/D keys
        if (axisIndex === movementAxes.horizontal) {
            // Store current position for continuous movement in update()
            this.leftStickPosition.x = processedValue;
            
            // Clear both keys first
            this.keys.a = false;
            this.keys.d = false;
            this.serverInputState.keys.a = false;
            this.serverInputState.keys.d = false;
            
            // Then set the appropriate one if the stick is significantly moved
            if (processedValue < -deadzone) {
                this.keys.a = true;
                this.serverInputState.keys.a = true;
                console.log(`[Gamepad] Left stick left: Setting keys.a = true, value=${processedValue.toFixed(2)}`);
            } else if (processedValue > deadzone) {
                this.keys.d = true;
                this.serverInputState.keys.d = true;
                console.log(`[Gamepad] Left stick right: Setting keys.d = true, value=${processedValue.toFixed(2)}`);
            }
        }
        
        // Left stick vertical (usually axis 1) -> W/S keys
        if (axisIndex === movementAxes.vertical) {
            // Store current position for continuous movement in update()
            this.leftStickPosition.y = processedValue;
            
            // Clear both keys first
            this.keys.w = false;
            this.keys.s = false;
            this.serverInputState.keys.w = false;
            this.serverInputState.keys.s = false;
            
            // Then set the appropriate one if the stick is significantly moved
            if (processedValue < -deadzone) {
                this.keys.w = true;
                this.serverInputState.keys.w = true;
                console.log(`[Gamepad] Left stick up: Setting keys.w = true, value=${processedValue.toFixed(2)}`);
            } else if (processedValue > deadzone) {
                this.keys.s = true;
                this.serverInputState.keys.s = true;
                console.log(`[Gamepad] Left stick down: Setting keys.s = true, value=${processedValue.toFixed(2)}`);
            }
        }
        
        // Right stick -> Store position for continuous camera movement
        if (axisIndex === lookAxes.horizontal) {
            this.rightStickPosition.x = processedValue;
            console.log(`[Gamepad] Right stick X: ${processedValue.toFixed(3)}`);
        } else if (axisIndex === lookAxes.vertical) {
            this.rightStickPosition.y = processedValue;
            console.log(`[Gamepad] Right stick Y: ${processedValue.toFixed(3)}`);
        }
        
        // Log the current state of stick positions
        if (axisIndex === lookAxes.horizontal || axisIndex === lookAxes.vertical) {
            console.log(`[Gamepad] Stick positions:`, {
                rightStickX: this.rightStickPosition.x.toFixed(3),
                rightStickY: this.rightStickPosition.y.toFixed(3)
            });
        }
    }
    
    // Handle gamepad input from Electron main process
    handleElectronGamepadInput(data) {
        if (!data) return;
        
        // Process button events
        if (data.type === 'button') {
            this._handleGamepadButton(data.gamepadIndex, data.buttonIndex, data.isPressed);
        }
        // Process axis events
        else if (data.type === 'axis') {
            this._handleGamepadAxis(data.gamepadIndex, data.axisIndex, data.value);
        }
    }
    
    // Register a UI element for managed event handling
    registerUIElement(elementId, eventType, callback) {
        if (!this.uiElementCallbacks[elementId]) {
            this.uiElementCallbacks[elementId] = {};
        }
        
        this.uiElementCallbacks[elementId][eventType] = callback;
        console.log(`Registered UI element handler: ${elementId} for ${eventType} event`);
        return true;
    }
    
    // Remove a UI element handler
    unregisterUIElement(elementId, eventType) {
        if (this.uiElementCallbacks[elementId] && this.uiElementCallbacks[elementId][eventType]) {
            delete this.uiElementCallbacks[elementId][eventType];
            console.log(`Unregistered UI element handler: ${elementId} for ${eventType} event`);
            return true;
        }
        return false;
    }
    
    // Handle UI element events
    handleUIEvent(event) {
        // Find the element that was clicked (could be the target or a parent)
        let element = event.target;
        while (element) {
            const elementId = element.id;
            
            // Check if we have handlers for this element
            if (elementId && this.uiElementCallbacks[elementId] && this.uiElementCallbacks[elementId]['click']) {
                // Call the registered handler
                console.log(`UI element clicked: ${elementId}`);
                this.uiElementCallbacks[elementId]['click'](event);
                return; // Only handle one element per click
            }
            
            // Move up the DOM tree
            element = element.parentElement;
        }
    }
    
    // Event handlers
    onKeyDown(event) {
        // Skip if we're in an input field
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
            return;
        }
        
        // Set keyboard/mouse as the active input type
        if (this.lastActiveInputType !== 'keyboardMouse') {
            this.lastActiveInputType = 'keyboardMouse';
            this.dispatchEvent('inputtypechange', { type: 'keyboardMouse' });
        }
        
        // Update internal state based on key
        switch (event.code) {
            case 'KeyW': case 'ArrowUp':
                this.keys.w = true;
                this.serverInputState.keys.w = true;
                break;
            case 'KeyA': case 'ArrowLeft':
                this.keys.a = true;
                this.serverInputState.keys.a = true;
                break;
            case 'KeyS': case 'ArrowDown':
                this.keys.s = true;
                this.serverInputState.keys.s = true;
                break;
            case 'KeyD': case 'ArrowRight':
                this.keys.d = true;
                this.serverInputState.keys.d = true;
                break;
            case 'Space':
                this.keys.space = true;
                this.serverInputState.keys.space = true;
                break;
            case 'KeyQ':
                this.keys.q = true;
                this.serverInputState.keys.q = true;
                break;
            case 'KeyE':
                this.keys.e = true;
                this.serverInputState.keys.e = true;
                break;
            case 'ShiftLeft': case 'ShiftRight':
                this.keys.shift = true;
                this.serverInputState.keys.shift = true;
                break;
            case 'KeyV': 
                this.keys.v = true;
                break;
        }
        
        // Create standardized event with all necessary properties
        const keyData = {
            key: event.key,
            code: event.code,
            keyCode: event.keyCode,
            event: event // Include original event for access to all properties
        };
        
        // Trigger callbacks
        this.callbacks.keydown.forEach(callback => callback(keyData));
    }
    
    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW': case 'ArrowUp':
                this.keys.w = false;
                this.serverInputState.keys.w = false;
                break;
            case 'KeyA': case 'ArrowLeft':
                this.keys.a = false;
                this.serverInputState.keys.a = false;
                break;
            case 'KeyS': case 'ArrowDown':
                this.keys.s = false;
                this.serverInputState.keys.s = false;
                break;
            case 'KeyD': case 'ArrowRight':
                this.keys.d = false;
                this.serverInputState.keys.d = false;
                break;
            case 'Space':
                this.keys.space = false;
                this.serverInputState.keys.space = false;
                break;
            case 'KeyQ':
                this.keys.q = false;
                this.serverInputState.keys.q = false;
                break;
            case 'KeyE':
                this.keys.e = false;
                this.serverInputState.keys.e = false;
                break;
            case 'ShiftLeft': case 'ShiftRight':
                this.keys.shift = false;
                this.serverInputState.keys.shift = false;
                break;
            case 'KeyV':
                this.keys.v = false;
                break;
        }
        
        // Create standardized event with all necessary properties
        const keyData = {
            key: event.key,
            code: event.code,
            keyCode: event.keyCode,
            event: event // Include original event for access to all properties
        };
        
        // Trigger callbacks
        this.callbacks.keyup.forEach(callback => callback(keyData));
    }
    
    onMouseDown(event) {
        // Set keyboard/mouse as the active input type
        if (this.lastActiveInputType !== 'keyboardMouse') {
            this.lastActiveInputType = 'keyboardMouse';
            this.dispatchEvent('inputtypechange', { type: 'keyboardMouse' });
        }
        
        // Update mouse button state
        switch (event.button) {
            case 0: // Left button
                this.mouseButtons.left = true;
                break;
            case 1: // Middle button (wheel)
                this.mouseButtons.middle = true;
                break;
            case 2: // Right button
                this.mouseButtons.right = true;
                break;
        }
        
        // Trigger callbacks
        this.callbacks.mousedown.forEach(callback => 
            callback({ button: event.button, position: { x: event.clientX, y: event.clientY }, event })
        );
    }
    
    onMouseUp(event) {
        // Update mouse button state
        switch (event.button) {
            case 0: // Left button
                this.mouseButtons.left = false;
                break;
            case 1: // Middle button (wheel)
                this.mouseButtons.middle = false;
                break;
            case 2: // Right button
                this.mouseButtons.right = false;
                break;
        }
        
        // Trigger callbacks
        this.callbacks.mouseup.forEach(callback => 
            callback({ button: event.button, position: { x: event.clientX, y: event.clientY }, event })
        );
    }
    
    onMouseMove(event) {
        // Set keyboard/mouse as the active input type
        if (this.lastActiveInputType !== 'keyboardMouse') {
            this.lastActiveInputType = 'keyboardMouse';
            this.dispatchEvent('inputtypechange', { type: 'keyboardMouse' });
        }
        
        // Store current position
        this.mousePosition.x = event.clientX;
        this.mousePosition.y = event.clientY;
        
        // Update mouse delta for server in pointerlock mode
        if (document.pointerLockElement) {
            this.mouseDelta.x += event.movementX;
            this.mouseDelta.y += event.movementY;
            this.serverInputState.mouseDelta.x += event.movementX;
            this.serverInputState.mouseDelta.y += event.movementY;
        }
        
        // Trigger callbacks with standardized event format
        const mouseData = { 
            position: { x: event.clientX, y: event.clientY },
            movement: { x: event.movementX, y: event.movementY },
            clientX: event.clientX, // Add direct properties for backward compatibility
            clientY: event.clientY,
            movementX: event.movementX,
            movementY: event.movementY,
            event: event // Include original event for full access
        };
        
        this.callbacks.mousemove.forEach(callback => callback(mouseData));
    }
    
    onWheel(event) {
        // Trigger callbacks with normalized wheel delta
        this.callbacks.wheel.forEach(callback => 
            callback({ delta: Math.sign(event.deltaY), event })
        );
    }
    
    // Ensure internal InputManager state is synced to global state variables 
    syncToGlobalState() {
        // Keep track of previous values to detect changes
        const prevValues = {
            moveForward: window.moveForward,
            moveBackward: window.moveBackward,
            moveLeft: window.moveLeft,
            moveRight: window.moveRight,
            turnLeft: window.turnLeft,
            turnRight: window.turnRight,
            shiftPressed: window.shiftPressed
        };
        
        // Update global movement flags from keys state
        window.moveForward = this.keys.w;
        window.moveBackward = this.keys.s;
        window.moveLeft = this.keys.a;
        window.moveRight = this.keys.d;
        window.turnLeft = this.keys.q;
        window.turnRight = this.keys.e;
        window.shiftPressed = this.keys.shift;
        
        // Log any changes to global state
        if (window.moveForward !== prevValues.moveForward ||
            window.moveBackward !== prevValues.moveBackward ||
            window.moveLeft !== prevValues.moveLeft ||
            window.moveRight !== prevValues.moveRight ||
            window.turnLeft !== prevValues.turnLeft ||
            window.turnRight !== prevValues.turnRight ||
            window.shiftPressed !== prevValues.shiftPressed) {
            
            console.log('[InputManager] Updated global movement state:', {
                moveForward: window.moveForward,
                moveBackward: window.moveBackward,
                moveLeft: window.moveLeft,
                moveRight: window.moveRight,
                turnLeft: window.turnLeft,
                turnRight: window.turnRight,
                shiftPressed: window.shiftPressed
            });
        }
        
        // Also update the global inputState object if it exists
        if (window.inputState) {
            const prevInputState = {
                w: window.inputState.keys.w,
                a: window.inputState.keys.a,
                s: window.inputState.keys.s,
                d: window.inputState.keys.d,
                space: window.inputState.keys.space,
                q: window.inputState.keys.q,
                e: window.inputState.keys.e,
                shift: window.inputState.keys.shift
            };
            
            window.inputState.keys.w = this.keys.w;
            window.inputState.keys.a = this.keys.a;
            window.inputState.keys.s = this.keys.s;
            window.inputState.keys.d = this.keys.d;
            window.inputState.keys.space = this.keys.space;
            window.inputState.keys.q = this.keys.q;
            window.inputState.keys.e = this.keys.e;
            window.inputState.keys.shift = this.keys.shift;
            
            // Sync mouseDelta values too
            window.inputState.mouseDelta.x = this.mouseDelta.x;
            window.inputState.mouseDelta.y = this.mouseDelta.y;
            
            // Log changes to inputState
            if (window.inputState.keys.w !== prevInputState.w ||
                window.inputState.keys.a !== prevInputState.a ||
                window.inputState.keys.s !== prevInputState.s ||
                window.inputState.keys.d !== prevInputState.d ||
                window.inputState.keys.space !== prevInputState.space ||
                window.inputState.keys.q !== prevInputState.q ||
                window.inputState.keys.e !== prevInputState.e ||
                window.inputState.keys.shift !== prevInputState.shift) {
                
                console.log('[InputManager] Updated inputState.keys:', {
                    w: window.inputState.keys.w,
                    a: window.inputState.keys.a,
                    s: window.inputState.keys.s,
                    d: window.inputState.keys.d,
                    space: window.inputState.keys.space,
                    q: window.inputState.keys.q,
                    e: window.inputState.keys.e,
                    shift: window.inputState.keys.shift
                });
            }
        }
    }
    
    update(deltaTime) {
        // Poll gamepads for updates if in browser mode
        this.pollGamepads();
        
        // Store the last time we updated
        const now = performance.now();
        if (!this._lastUpdateTime) this._lastUpdateTime = now;

        const timeSinceLastUpdate = now - this._lastUpdateTime;
        this._lastUpdateTime = now;
        
        // Reset mouseDelta at the start unless pointer is locked
        if (!document.pointerLockElement) {
            this.mouseDelta.x = 0;
            this.mouseDelta.y = 0;
            this.serverInputState.mouseDelta.x = 0;
            this.serverInputState.mouseDelta.y = 0;
        }
        
        // Process gamepad input independently of pointer lock
        if (this.isGamepadAvailable && this.activeGamepadIndex >= 0) {
            const gamepad = this.gamepads[this.activeGamepadIndex];
            if (gamepad) {
                // Set gamepad as active input type if there's significant input
                const stickThreshold = 0.2;
                let hasStickInput = false;
                let hasButtonInput = false;
                
                try {
                    hasStickInput = gamepad.axes && (
                        (gamepad.axes[0] !== undefined && Math.abs(gamepad.axes[0]) > stickThreshold) || 
                        (gamepad.axes[1] !== undefined && Math.abs(gamepad.axes[1]) > stickThreshold) || 
                        (gamepad.axes[2] !== undefined && Math.abs(gamepad.axes[2]) > stickThreshold) || 
                        (gamepad.axes[3] !== undefined && Math.abs(gamepad.axes[3]) > stickThreshold)
                    );
                    hasButtonInput = gamepad.buttons && Array.isArray(gamepad.buttons) && gamepad.buttons.some(btn => btn && typeof btn === 'object' && btn.pressed);
                } catch (e) {
                    console.error("[InputManager] Error checking gamepad input state:", e);
                }
                
                if ((hasStickInput || hasButtonInput) && this.lastActiveInputType !== 'gamepad') {
                    this.lastActiveInputType = 'gamepad';
                    this.dispatchEvent('inputtypechange', { type: 'gamepad' });
                }
                
                // Movement (left stick)
                let moveX = 0;
                let moveY = 0;
                try {
                    moveX = gamepad.axes && gamepad.axes[0] !== undefined && Math.abs(gamepad.axes[0]) > stickThreshold ? gamepad.axes[0] : 0;
                    moveY = gamepad.axes && gamepad.axes[1] !== undefined && Math.abs(gamepad.axes[1]) > stickThreshold ? gamepad.axes[1] : 0;
                } catch (e) {
                    console.error("[InputManager] Error reading gamepad movement axes:", e);
                }
                
                if (moveX || moveY) {
                    // Dispatch movement event
                    this.dispatchEvent('gamepadmove', {
                        x: moveX,
                        y: moveY
                    });
                    
                    // Update global state for movement
                    window.moveForward = moveY < -0.3;
                    window.moveBackward = moveY > 0.3;
                    window.moveLeft = moveX < -0.3;
                    window.moveRight = moveX > 0.3;
                    
                    // Update server input state
                    this.serverInputState.keys.w = window.moveForward;
                    this.serverInputState.keys.s = window.moveBackward;
                    this.serverInputState.keys.a = window.moveLeft;
                    this.serverInputState.keys.d = window.moveRight;
                }
                
                // Look (right stick) - Simulate mouse delta for camera control
                let lookX = 0;
                let lookY = 0;
                try {
                    lookX = gamepad.axes && gamepad.axes[2] !== undefined && Math.abs(gamepad.axes[2]) > stickThreshold ? gamepad.axes[2] * 10 : 0;
                    lookY = gamepad.axes && gamepad.axes[3] !== undefined && Math.abs(gamepad.axes[3]) > stickThreshold ? gamepad.axes[3] * 10 : 0;
                } catch (e) {
                    console.error("[InputManager] Error reading gamepad look axes:", e);
                }
                
                if (lookX || lookY) {
                    this.mouseDelta.x += lookX;
                    this.mouseDelta.y += lookY;
                    this.serverInputState.mouseDelta.x += lookX;
                    this.serverInputState.mouseDelta.y += lookY;
                    
                    // Dispatch look event
                    this.dispatchEvent('gamepadlook', {
                        x: lookX,
                        y: lookY
                    });
                }
                
                // Buttons
                try {
                    if (gamepad.buttons && Array.isArray(gamepad.buttons)) {
                        // Ensure prevGamepadState is initialized for this index
                        if (!this.prevGamepadState[this.activeGamepadIndex]) {
                            this.prevGamepadState[this.activeGamepadIndex] = { buttons: [], axes: [] };
                        }
                        for (let i = 0; i < gamepad.buttons.length; i++) {
                            const button = gamepad.buttons[i];
                            const prevState = this.prevGamepadState[this.activeGamepadIndex];
                            const wasPressed = prevState && prevState.buttons && Array.isArray(prevState.buttons) && i < prevState.buttons.length && prevState.buttons[i] ? prevState.buttons[i].pressed : false;
                            
                            if (button && typeof button === 'object' && button.pressed && !wasPressed) {
                                // Button down
                                this.dispatchEvent(`gamepadbuttondown${i}`, { index: i });
                            } else if (button && typeof button === 'object' && !button.pressed && wasPressed) {
                                // Button up
                                this.dispatchEvent(`gamepadbuttonup${i}`, { index: i });
                            }
                        }
                    }
                } catch (e) {
                    console.error("[InputManager] Error processing gamepad buttons:", e);
                }
            }
        } else {
            // Log if not processing gamepad (e.g., keyboard/mouse active)
            // console.log(`[Input Update] Not processing gamepad input (last type: ${this.lastActiveInputType}, pointer locked: ${!!document.pointerLockElement})`);
            // mouseDelta was already reset at the start if pointer wasn't locked.
            // If pointer IS locked, onMouseMove handles the delta.
        }

        // CRITICAL: Sync InputManager state to global state variables
        // This ensures gamepad inputs affect movement
        this.syncToGlobalState();
        
        // Debugging for input states
        if (this.lastActiveInputType === 'gamepad') {
            // Log input state every few seconds
            if (!this._lastInputStateLog || now - this._lastInputStateLog > 5000) {
                this._lastInputStateLog = now;
                // Show all key states
                console.log('[InputManager] Current key states:', {
                    w: this.keys.w,
                    a: this.keys.a,
                    s: this.keys.s,
                    d: this.keys.d,
                    space: this.keys.space,
                    q: this.keys.q,
                    e: this.keys.e,
                    shift: this.keys.shift,
                    v: this.keys.v
                });
                // Show global movement variables that controls might be using
                console.log('[InputManager] Global movement variables:', {
                    moveForward: window.moveForward,
                    moveBackward: window.moveBackward,
                    moveLeft: window.moveLeft,
                    moveRight: window.moveRight,
                    turnLeft: window.turnLeft,
                    turnRight: window.turnRight,
                    canJump: window.canJump
                });
            }
        }
        
        // Log gamepad state periodically for debugging if a gamepad is active
        if (this.isGamepadAvailable && this.lastActiveInputType === 'gamepad') {
            if (!this._lastGamepadLog || now - this._lastGamepadLog > 3000) {
                this._lastGamepadLog = now;
                const activeGamepad = this.getActiveGamepad();
                if (activeGamepad) {
                    console.log('Active Gamepad:', {
                        id: activeGamepad.id,
                        index: activeGamepad.index,
                        axes: Array.from(activeGamepad.axes).map(v => Math.round(v * 100) / 100),
                        buttons: Array.from(activeGamepad.buttons).map(b => b.pressed ? 1 : 0),
                        rightStick: {
                            x: Math.round(this.rightStickPosition.x * 100) / 100,
                            y: Math.round(this.rightStickPosition.y * 100) / 100
                        }
                    });
                }
            }
        }
        
        // Sync view mode and camera settings from global state
        this.serverInputState.viewMode = 
            window.viewMode === 'firstPerson' ? 'first-person' : 
            window.viewMode === 'thirdPerson' ? 'third-person' : 
            window.viewMode || 'first-person';
            
        this.serverInputState.thirdPersonCameraAngle = window.thirdPersonCameraOrbitX || 0;
        
        // Sync rotation state 
        if (window.playerRotationY !== undefined) {
            this.serverInputState.clientRotation.rotationY = window.playerRotationY;
            this.serverInputState.clientRotation.pitch = window.firstPersonCameraPitch || 0;
        } else if (window.playerEntity && window.playerEntity.mesh) {
            this.serverInputState.clientRotation.rotationY = window.playerEntity.mesh.rotation.y || 0;
        }
        
        // --- Final Reset ---
        // Reset internal mouseDelta AFTER it has been synced and potentially used by callbacks
        // This ensures the next frame starts fresh.
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
        // Optionally reset serverInputState.mouseDelta too, though sendInputUpdate resets window.inputState
        // If sendInputUpdate uses window.inputState, this might be redundant, but doesn't hurt.
        this.serverInputState.mouseDelta.x = 0; 
        this.serverInputState.mouseDelta.y = 0;
        // --- End Final Reset ---
    }
    
    // Registration methods for callbacks
    on(eventType, callback) {
        if (this.callbacks[eventType]) {
            this.callbacks[eventType].push(callback);
            return true;
        }
        return false;
    }
    
    off(eventType, callback) {
        if (this.callbacks[eventType]) {
            const index = this.callbacks[eventType].indexOf(callback);
            if (index !== -1) {
                this.callbacks[eventType].splice(index, 1);
                return true;
            }
        }
        return false;
    }
    
    // Dispatch a custom event through InputManager system
    dispatchEvent(eventType, data = {}) {
        // Standard input events go through the callback system
        if (this.callbacks[eventType]) {
            this.callbacks[eventType].forEach(callback => callback(data));
            return true;
        }
        
        // For non-standard events, fall back to DOM CustomEvent
        // This ensures compatibility with code that listens for these events directly
        const event = new CustomEvent(eventType, { detail: data });
        document.dispatchEvent(event);
        
        console.log(`[InputManager] Dispatched event: ${eventType}`);
        return true;
    }
    
    // Utility methods
    isKeyPressed(key) {
        return this.keys[key] === true;
    }
    
    isMouseButtonPressed(button) {
        return this.mouseButtons[button] === true;
    }
    
    getMousePosition() {
        return { ...this.mousePosition };
    }
    
    getMouseDelta() {
        return { ...this.mouseDelta };
    }
    
    // Method to explicitly set the active input type
    setActiveInputType(type) {
        if (type === 'keyboardMouse' || type === 'gamepad') {
            this.lastActiveInputType = type;
            this.dispatchEvent('inputtypechange', { type });
            return true;
        }
        return false;
    }
    
    // Get the current active input type
    getActiveInputType() {
        return this.lastActiveInputType;
    }
    
    // Check if a gamepad is available
    isGamepadConnected() {
        return this.isGamepadAvailable;
    }
    
    // Gamepad-specific methods
    getActiveGamepad() {
        if (this.activeGamepadIndex === -1) return null;
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        return gamepads[this.activeGamepadIndex] || null;
    }
    
    // Configure gamepad settings
    configureGamepad(config) {
        this.gamepadConfig = { ...this.gamepadConfig, ...config };
        console.log("[InputManager] Gamepad configuration updated", this.gamepadConfig);
    }
    
    // Method for gamepads and other input devices
    addInputDevice(deviceType, deviceConfig) {
        console.log(`[InputManager] Adding input device: ${deviceType}`);
        
        if (deviceType === 'gamepad' && deviceConfig) {
            // Apply custom gamepad configuration if provided
            this.configureGamepad(deviceConfig);
        }
    }

    // New method to be called AFTER game-engine.js is loaded
    registerUpdateCallback() {
        if (window.registerAnimationCallback) {
            const result = window.registerAnimationCallback(this.update);
            if (result) {
                console.log('[InputManager] Update callback registered with game engine.');
            } else {
                console.error('[InputManager] registerAnimationCallback function returned false.');
            }
        } else {
            // This error now indicates a problem in the calling code (main.js)
            console.error('[InputManager] registerAnimationCallback not found when attempting to register update.');
        }
    }
}

// Explicitly attach to window object
window.InputManager = InputManager;
console.log('[InputManager.js] Explicitly assigned InputManager to window. Type:', typeof window.InputManager);

// Create instance - REMOVED
// window.inputManager = new InputManager(); 