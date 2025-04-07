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
        
        // Add a global click handler to check for UI element interactions
        document.addEventListener('click', this.handleUIEvent, false);
        
        // Register for animation loop updates
        if (window.registerAnimationCallback) {
            window.registerAnimationCallback(this.update);
        }
        
        console.log("InputManager initialized with centralized event handling");
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
    
    // Method for gamepads and other input devices (future expansion)
    addInputDevice(deviceType, deviceConfig) {
        console.log(`[InputManager] Adding input device: ${deviceType}`);
        // Future implementation
    }
}

// Create instance
window.inputManager = new InputManager(); 