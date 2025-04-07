# Input System Refactoring Plan

This document outlines a 3-step approach to refactoring the game's input system, introducing a proper InputManager and ActionManager while maintaining full functionality at each step.

## Goal
Refactor all inputs to flow through an InputManager, which feeds into an ActionManager that converts raw inputs into game actions based on the current context (view mode, build mode, etc.).

## Step 1: Introduce InputManager as a Parallel System ✅ (COMPLETED)

### Implementation
1. ✅ Create a new file `client/js/core/InputManager.js` with the InputManager class
2. ✅ Initialize the InputManager in parallel with existing input handlers
3. ✅ Track input state in the InputManager but don't replace existing functionality

```javascript
class InputManager {
    constructor() {
        // Input state tracking
        this.keys = {
            w: false, a: false, s: false, d: false,
            space: false, q: false, e: false, shift: false
        };
        this.mouseDelta = { x: 0, y: 0 };
        this.mousePosition = { x: 0, y: 0 };
        this.mouseButtons = { left: false, middle: false, right: false };
        
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
            keydown: [], keyup: [], mousedown: [], mouseup: [], mousemove: [], wheel: []
        };
        
        // Bind methods
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onWheel = this.onWheel.bind(this);
        this.update = this.update.bind(this);
        
        // Initialize
        this.init();
    }
    
    init() {
        // Add parallel event listeners that run alongside existing ones
        document.addEventListener('keydown', this.onKeyDown, false);
        document.addEventListener('keyup', this.onKeyUp, false);
        document.addEventListener('mousedown', this.onMouseDown, false);
        document.addEventListener('mouseup', this.onMouseUp, false);
        document.addEventListener('mousemove', this.onMouseMove, false);
        document.addEventListener('wheel', this.onWheel, false);
        
        // Register for animation loop updates
        if (window.registerAnimationCallback) {
            window.registerAnimationCallback(this.update);
        }
        
        console.log("InputManager initialized in parallel mode");
    }
    
    // Event handlers
    onKeyDown(event) {
        // Skip if we're in an input field
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
            return;
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
        }
        
        // Trigger callbacks
        this.callbacks.keydown.forEach(callback => callback(event));
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
        }
        
        // Trigger callbacks
        this.callbacks.keyup.forEach(callback => callback(event));
    }
    
    onMouseDown(event) {
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
        
        // Trigger callbacks
        this.callbacks.mousemove.forEach(callback => 
            callback({ 
                position: { x: event.clientX, y: event.clientY },
                movement: { x: event.movementX, y: event.movementY },
                event
            })
        );
    }
    
    onWheel(event) {
        // Trigger callbacks with normalized wheel delta
        this.callbacks.wheel.forEach(callback => 
            callback({ delta: Math.sign(event.deltaY), event })
        );
    }
    
    update(delta) {
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
}

// Create instance
window.inputManager = new InputManager();
```

4. ✅ Add the script to the HTML file after controls.js

### Testing Step 1
1. **Movement Controls**: Verify that player movement with WASD still works
2. **Camera Controls**: Verify that mouse look still functions correctly
3. **View Toggle**: Verify that pressing V still toggles between camera views
4. **Building Mode**: Verify that B still toggles building mode
5. **Network Sync**: Verify that player movement is still synchronized with the server
6. **UI Input**: Verify that clicking UI elements still works
7. **Debug**: Check console for any errors related to the InputManager

## Step 2: Add ActionManager and Modify SendInputUpdate ✅ (COMPLETED)

### Implementation
1. ✅ Create a new file `client/js/core/ActionManager.js` with the ActionManager class
2. ✅ Initialize the ActionManager to translate inputs into actions
3. ✅ Modify sendInputUpdate to use the InputManager's state

```javascript
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
        
        // Register default bindings
        this.registerDefaultBindings();
        
        // Override sendInputUpdate to use InputManager's state
        this.overrideSendInputUpdate();
        
        console.log("ActionManager initialized");
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
        
        // Bind to inputs
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
                    
                    // Reset mouse delta after sending
                    window.inputManager.serverInputState.mouseDelta.x = 0;
                    window.inputManager.serverInputState.mouseDelta.y = 0;
                    window.inputManager.mouseDelta.x = 0;
                    window.inputManager.mouseDelta.y = 0;
                }
            }
        };
        
        console.log("Overrode sendInputUpdate");
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
            this.triggerAction(actionId, {
                active: isActive,
                original: data
            });
        }
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
            
            // Call subscribers
            this.actions[actionId].callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in action callback (${actionId}):`, error);
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
        this.context = context;
        // Update InputManager's server state
        window.inputManager.serverInputState.viewMode = 
            context === 'firstPerson' ? 'first-person' : 
            context === 'thirdPerson' ? 'third-person' : 
            context;
        
        console.log(`Context set to: ${context}`);
    }
}

// Create instance
window.actionManager = new ActionManager();
```

4. Add the script to the HTML file after InputManager.js

### Testing Step 2 ✅
1. ✅ **Network Communication**: Player position is synchronized correctly
2. ✅ **Movement Controls**: All movement functions as expected
3. ✅ **Send Rate**: Input updates are properly throttled
4. ✅ **Action Activation**: Added debug logs confirm actions are triggered correctly
5. ✅ **Input Mirroring**: Inputs update global state variables properly
6. ✅ **Mouse Delta**: Mouse movement for camera control works correctly
7. ✅ **UI Interaction**: UI elements respond to input as expected

## Step 3: Transition Game Components to ActionManager

### Implementation
1. Create a small integration patch for key game functions:

```javascript
// Sample code to be placed at the bottom of ActionManager.js or in a separate file

// ========== GAME INTEGRATION ==========

// Connect toggleCameraView to use ActionManager
(function() {
    // Store the original function
    const originalToggleView = window.toggleCameraView;
    
    // Replace with our enhanced version
    window.toggleCameraView = function() {
        // Get next view mode in sequence
        const modes = ['firstPerson', 'thirdPerson', 'freeCamera', 'rtsView'];
        const currentIndex = modes.indexOf(window.viewMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        const nextMode = modes[nextIndex];
        
        // Set ActionManager context first
        window.actionManager.setContext(nextMode);
        
        // Call original function to keep all existing functionality
        const result = originalToggleView();
        
        return result;
    };
    
    // Add an action listener for the toggle view action
    window.actionManager.onAction('toggle_view', (data) => {
        // Only trigger on key down, not key up
        if (data.active) {
            window.toggleCameraView();
        }
    });
    
    console.log("View toggle function enhanced");
})();

// Connect BuildingMode if available
(function() {
    if (window.BuildingModeManager) {
        window.actionManager.onAction('toggle_building', (data) => {
            if (data.active) {
                // Find the building mode manager instance
                if (window.buildingModeManager && typeof window.buildingModeManager.toggle === 'function') {
                    window.buildingModeManager.toggle();
                }
            }
        });
        
        console.log("Building mode action connected");
    }
})();

// Example of movement refinement - optional and can be expanded later
(function() {
    window.actionManager.onAction('move_forward', (data) => {
        // Additional logic here - context-specific movement refinements
        // For example, in building mode, movement might be slower
        if (window.actionManager.context === 'building') {
            // Modify movement speed or behavior
        }
    });
})();
```

2. Add this integration code either to ActionManager.js or as a separate file

### Testing Step 3
1. **View Toggling**: Verify that pressing V still correctly cycles through view modes
2. **Building Mode**: Verify that B still toggles building mode correctly
3. **Mode-Specific Controls**: Test all control schemes in each view mode:
   - First Person: Movement, looking, jumping
   - Third Person: Orbiting camera, movement relative to camera
   - Free Camera: Free movement in all directions
   - RTS View: Camera panning, unit selection
4. **Building Controls**: Test building placement and rotation
5. **Animations**: Verify player animations still trigger correctly based on movement
6. **Server Sync**: Verify that all player actions still synchronize with the server
7. **UI Feedback**: Check that UI elements update properly with mode changes

## Future Improvements
- Full migration of controls.js functionality to dedicated controller classes
- Context-specific input mappings (different bindings per view mode)
- User-configurable key bindings
- Gamepad support through the InputManager abstraction
- Mobile touch controls integration
