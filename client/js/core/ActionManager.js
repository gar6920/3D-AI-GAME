class ActionManager {
    constructor() {
        // Action registry
        this.actions = {};
        // Input-to-action bindings
        this.bindings = {}; 
        // Current context (view mode)
        this.context = window.viewMode || 'firstPerson';
        // Currently active actions
        this.activeActions = new Set();
        
        // Wait for InputManager to be ready
        if (!window.inputManager) {
            setTimeout(() => this.init(), 100);
        } else {
            this.init();
        }
    }
    
    init() {
        // Register with InputManager
        window.inputManager.on('keydown', this.handleInput.bind(this, true));
        window.inputManager.on('keyup', this.handleInput.bind(this, false));
        window.inputManager.on('mousedown', this.handleMouseInput.bind(this, true));
        window.inputManager.on('mouseup', this.handleMouseInput.bind(this, false));
        window.inputManager.on('mousemove', this.handleMouseMove.bind(this));
        window.inputManager.on('wheel', this.handleWheel.bind(this));
        
        // Add gamepad support
        window.inputManager.on('gamepadbuttondown', this.handleGamepadButton.bind(this, true));
        window.inputManager.on('gamepadbuttonup', this.handleGamepadButton.bind(this, false));
        window.inputManager.on('gamepadaxismove', this.handleGamepadAxis.bind(this));
        window.inputManager.on('inputtypechange', this.handleInputTypeChange.bind(this));
        
        // Register default bindings
        this.registerDefaultBindings();
        
        // Override sendInputUpdate to use InputManager's state
        this.overrideSendInputUpdate();
    }
    
    registerDefaultBindings() {
        // Define core actions
        this.registerAction('move_forward', 'Move forward');
        this.registerAction('move_backward', 'Move backward');
        this.registerAction('move_left', 'Strafe left');
        this.registerAction('move_right', 'Strafe right');
        this.registerAction('jump', 'Jump');
        this.registerAction('sprint', 'Sprint/Walk');
        this.registerAction('rotate_left', 'Rotate left');
        this.registerAction('rotate_right', 'Rotate right');
        this.registerAction('toggle_view', 'Toggle camera view');
        this.registerAction('toggle_building', 'Toggle building mode');
        this.registerAction('primary_action', 'Primary action/attack');
        this.registerAction('secondary_action', 'Secondary action');
        
        // Bind to keyboard inputs
        this.bindInput('key', 'KeyW', 'move_forward');
        this.bindInput('key', 'ArrowUp', 'move_forward');
        this.bindInput('key', 'KeyS', 'move_backward');
        this.bindInput('key', 'ArrowDown', 'move_backward');
        this.bindInput('key', 'KeyA', 'move_left');
        this.bindInput('key', 'ArrowLeft', 'move_left');
        this.bindInput('key', 'KeyD', 'move_right');
        this.bindInput('key', 'ArrowRight', 'move_right');
        this.bindInput('key', 'Space', 'jump');
        this.bindInput('key', 'ShiftLeft', 'sprint');
        this.bindInput('key', 'ShiftRight', 'sprint');
        this.bindInput('key', 'KeyQ', 'rotate_left');
        this.bindInput('key', 'KeyE', 'rotate_right');
        this.bindInput('key', 'KeyV', 'toggle_view');
        this.bindInput('key', 'KeyB', 'toggle_building');
        this.bindInput('mouseButton', '0', 'primary_action');
        this.bindInput('mouseButton', '2', 'secondary_action');
        
        // Bind to gamepad inputs (standard mapping)
        this.bindInput('gamepadButton', '0', 'jump');          // A button
        this.bindInput('gamepadButton', '1', 'toggle_view');   // B button 
        this.bindInput('gamepadButton', '2', 'secondary_action'); // X button
        this.bindInput('gamepadButton', '3', 'primary_action'); // Y button
        this.bindInput('gamepadButton', '4', 'rotate_left');   // LB
        this.bindInput('gamepadButton', '5', 'rotate_right');  // RB
        this.bindInput('gamepadButton', '6', 'sprint');        // LT
        this.bindInput('gamepadButton', '7', 'sprint');        // RT (alternative)
        this.bindInput('gamepadButton', '8', 'toggle_building'); // Back/Select
        
        // Note: Analog stick movement is handled directly by polling in InputManager
        // and mapping to WASD keys, so we don't need explicit bindings here
        
        // console.log('🎮 ActionManager: Registered default actions and bindings');
        // console.log('   Total actions:', Object.keys(this.actions).length);
        // console.log('   Total bindings:', Object.keys(this.bindings).length);
    }
    
    overrideSendInputUpdate() {
        // Store original function
        const originalSendInputUpdate = window.sendInputUpdate;
        
        // Replace with our version
        window.sendInputUpdate = () => {
            // Skip in free camera mode as per original
            if (window.isFreeCameraMode || window.isRTSMode || !window.playerLoaded) {
                return;
            }
            
            if (window.room) {
                const now = performance.now();
                if ((now - window.lastInputTime) > window.inputThrottleMs) {
                    window.lastInputTime = now;
                    
                    // Use InputManager's server state
                    window.room.send("updateInput", window.inputManager.serverInputState);
                    
                    // Log input state periodically (every 3 seconds)
                    if (this._lastLogTime === undefined || (now - this._lastLogTime > 3000)) {
                        this._lastLogTime = now;
                        // console.log('📡 ActionManager: Sending input to server', {
                        //     keys: {...window.inputManager.serverInputState.keys},
                        //     mouseDelta: {...window.inputManager.serverInputState.mouseDelta},
                        //     viewMode: window.inputManager.serverInputState.viewMode
                        // });
                    }
                    
                    // Reset mouse delta after sending
                    window.inputManager.serverInputState.mouseDelta.x = 0;
                    window.inputManager.serverInputState.mouseDelta.y = 0;
                    window.inputManager.mouseDelta.x = 0;
                    window.inputManager.mouseDelta.y = 0;
                }
            }
        };
        
        // console.log('🔄 ActionManager: Overrode sendInputUpdate');
    }
    
    registerAction(actionId, description) {
        this.actions[actionId] = {
            id: actionId,
            description: description,
            callbacks: []
        };
        return this;
    }
    
    bindInput(type, code, actionId) {
        const key = `${type}:${code}`;
        this.bindings[key] = actionId;
        return this;
    }
    
    handleInput(isActive, event) {
        const key = `key:${event.code}`;
        const actionId = this.bindings[key];
        
        if (actionId) {
            // Log action triggers (but not for movement keys to avoid spam)
            if (!['move_forward', 'move_backward', 'move_left', 'move_right'].includes(actionId)) {
                // console.log(`🎯 ActionManager: Key ${event.code} triggered action '${actionId}' (${isActive ? 'activated' : 'deactivated'})`);
            }
            
            // Mirror to existing global state first (for compatibility)
            this.updateGlobalState(actionId, isActive);
            
            // Trigger action for subscribers
            this.triggerAction(actionId, {
                active: isActive,
                original: event
            });
        }
    }
    
    handleMouseInput(isActive, data) {
        const key = `mouseButton:${data.button}`;
        const actionId = this.bindings[key];
        
        if (actionId) {
            // console.log(`🖱️ ActionManager: Mouse button ${data.button} triggered action '${actionId}' (${isActive ? 'pressed' : 'released'})`);
            
            this.triggerAction(actionId, {
                active: isActive,
                original: data
            });
        }
    }
    
    handleGamepadButton(isActive, data) {
        const key = `gamepadButton:${data.buttonIndex}`;
        const actionId = this.bindings[key];
        
        if (actionId) {
            // console.log(`🎮 ActionManager: Gamepad button ${data.buttonIndex} triggered action '${actionId}' (${isActive ? 'pressed' : 'released'})`);
            
            // Mirror to existing global state first (for compatibility)
            this.updateGlobalState(actionId, isActive);
            
            // Trigger action for subscribers
            this.triggerAction(actionId, {
                active: isActive,
                original: data
            });
        }
    }
    
    handleGamepadAxis(data) {
        // Analog stick movement is mapped directly to WASD keys by InputManager,
        // which updates this.keys and serverInputState
        // so no need to directly map axes-to-actions here
        
        // But we can check if the axis is a trigger in future implementations
        // (Some gamepads have LT/RT as axes 2/5 instead of buttons 6/7)
    }
    
    handleInputTypeChange(data) {
        // React to changes in input type (keyboard/mouse <-> gamepad)
        // console.log(`🔄 ActionManager: Input type changed to ${data.type}`);
    }
    
    handleMouseMove(data) {
        // No specific action bindings for mousemove currently
        // Just for future expansion
    }
    
    handleWheel(data) {
        // Primarily for camera zoom in third person mode
        // To be expanded later
    }
    
    // Update global state for compatibility
    updateGlobalState(actionId, isActive) {
        switch(actionId) {
            case 'move_forward':
                window.moveForward = isActive;
                window.inputState.keys.w = isActive;
                break;
            case 'move_backward':
                window.moveBackward = isActive;
                window.inputState.keys.s = isActive;
                break;
            case 'move_left':
                window.moveLeft = isActive;
                window.inputState.keys.a = isActive;
                break;
            case 'move_right':
                window.moveRight = isActive;
                window.inputState.keys.d = isActive;
                break;
            case 'jump':
                window.inputState.keys.space = isActive;
                // Handle jump physics as in the original code
                if (isActive && window.velocity) {
                    window.velocity.y = Math.sqrt(window.jumpHeight * 2 * 9.8);
                }
                break;
            case 'sprint':
                window.shiftPressed = isActive;
                window.inputState.keys.shift = isActive;
                break;
            case 'rotate_left':
                window.turnLeft = isActive;
                window.inputState.keys.q = isActive;
                break;
            case 'rotate_right':
                window.turnRight = isActive;
                window.inputState.keys.e = isActive;
                break;
            case 'toggle_view':
                // Only trigger on activation (key down), not release
                if (isActive && typeof window.toggleCameraView === 'function') {
                    window.toggleCameraView();
                }
                break;
            case 'toggle_building':
                // Only trigger on activation (key down), not release
                if (isActive && window.buildingModeManager && 
                    typeof window.buildingModeManager.toggle === 'function') {
                    window.buildingModeManager.toggle();
                }
                break;
        }
    }
    
    triggerAction(actionId, data) {
        if (this.actions[actionId]) {
            // Update active actions set
            if (data.active) {
                this.activeActions.add(actionId);
            } else {
                this.activeActions.delete(actionId);
            }
            
            // For non-movement actions, log when callbacks are triggered
            if (!['move_forward', 'move_backward', 'move_left', 'move_right'].includes(actionId) && 
                this.actions[actionId].callbacks.length > 0) {
                // console.log(`🔔 ActionManager: Triggering ${this.actions[actionId].callbacks.length} callbacks for '${actionId}'`);
            }
            
            // Call subscribers
            this.actions[actionId].callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    // console.error(`Error in action callback (${actionId}):`, error);
                }
            });
        }
    }
    
    onAction(actionId, callback) {
        if (this.actions[actionId]) {
            this.actions[actionId].callbacks.push(callback);
            return true;
        }
        return false;
    }
    
    offAction(actionId, callback) {
        if (this.actions[actionId]) {
            const index = this.actions[actionId].callbacks.indexOf(callback);
            if (index !== -1) {
                this.actions[actionId].callbacks.splice(index, 1);
                return true;
            }
        }
        return false;
    }
    
    isActionActive(actionId) {
        return this.activeActions.has(actionId);
    }
    
    setContext(context) {
        const oldContext = this.context;
        this.context = context;
        // Update InputManager's server state
        window.inputManager.serverInputState.viewMode = 
            context === 'firstPerson' ? 'first-person' : 
            context === 'thirdPerson' ? 'third-person' : 
            context;
        
        // console.log(`🔄 ActionManager: Context changed from '${oldContext}' to '${context}'`);
    }
}

// Create instance - REMOVED
// window.actionManager = new ActionManager(); 