// 3D Game Platform - Main Entry Point

// Game configuration
const gameConfig = {
    debug: false,                 // Debug mode
    sceneSettings: {
        groundSize: 100,          // Size of the ground plane
        skyColor: 0x87CEEB,       // Sky color
        groundColor: 0x228B22     // Ground color
    },
    playerSettings: {
        startPosition: {
            x: 0,
            y: 1,
            z: 0
        },
        viewMode: 'firstPerson'   // 'firstPerson', 'thirdPerson', or 'freeRoam'
    },
    networkSettings: {
        serverUrl: window.location.hostname.includes('localhost') 
            ? `ws://${window.location.hostname}:3000` // Local development
            : `wss://${window.location.hostname}`,    // Production
        roomName: 'default'       // Default room name
    }
};

// Store config globally for access by other modules
window.gameConfig = gameConfig;

// Main game initialization
function initGame() {
    console.log('Initializing 3D Game Platform...');
    
    // Load core modules
    loadCoreModules()
        .then(() => {
            console.log("Core modules loaded, now initializing managers...");

            // Initialize and assign managers to window scope
            // Note: Implement these manager classes/objects if they don't fully exist

            // --- Network Interface --- 
            // Basic wrapper for Colyseus client/room (adjust if using a dedicated class)
            // Assuming 'client' and 'room' are globally accessible after network-core.js loads
            window.networkInterface = {
                getClient: () => window.client, // Assuming client is global from network-core
                getRoom: () => window.room,     // Assuming room is global from network-core
                sendMessage: (type, payload) => {
                    if (window.room) {
                        window.room.send(type, payload);
                    }
                },
                initNetworking: window.initNetworking // Assuming initNetworking is global
                // Add other necessary methods like state listeners if needed
            };
            console.log("Network Interface manager assigned:", window.networkInterface);

            // --- Input Manager --- 
            // Basic object exposing relevant state/functions from controls.js
            window.inputManager = new InputManager();
            console.log("Input Manager assigned:", window.inputManager);

            // --- UI Manager --- 
            // Instantiate PlayerUI class from player-ui.js
            if (typeof PlayerUI === 'function') { // Check if class loaded
                window.uiManager = new PlayerUI();
                window.uiManager.init(); // Initialize the UI components
                console.log("UI Manager (PlayerUI) initialized and assigned:", window.uiManager);
            } else {
                console.error("PlayerUI class not found. UI Manager not created.");
                window.uiManager = null; // Set to null if class not found
            }

            // Now initialize the game engine, which will use these managers
            console.log("Managers initialized, proceeding to initialize game engine...");
            initGameEngine();
        })
        .catch(error => {
            console.error('Error initializing game:', error);
        });
}

// Load core platform modules
function loadCoreModules() {
    return new Promise((resolve, reject) => {
        try {
            console.log('Loading core modules...');
            
            // Create core module paths
            const corePath = 'js/core/';
            const coreModules = [
                'Entity.js',
                'Player.js',
                'NPC.js',
                'EntityFactory.js',
                'collision.js',
                'player-ui.js',      // Provides UIManager?
                'network-core.js',   // Provides NetworkInterface?
                'controls.js',       // Provides InputManager? Controls setup?
                'game-engine.js',    // Added game-engine here, AFTER dependencies
                'BuildModeManager.js' // Build mode depends on game-engine
            ];
            
            // Load each module in sequence
            let loadPromise = Promise.resolve();
            
            coreModules.forEach(module => {
                loadPromise = loadPromise.then(() => {
                    return loadScript(corePath + module);
                });
            });
            
            // Resolve when all core modules are loaded
            loadPromise.then(() => {
                console.log('Core modules loaded successfully');
                resolve();
            }).catch(error => {
                reject(error);
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Initialize the main game engine
function initGameEngine() {
    console.log('Initializing game engine...');
    
    // Ensure the global init function from game-engine.js exists and call it
    if (typeof window.init === 'function') {
        window.init(); // This should now run after all core scripts, including game-engine.js, are loaded
        console.log('Game engine initialization function called.');
    } else {
        console.error('Game engine initialization function (window.init) not found after loading core modules.');
    }

    // Initialize default player factory first
    window.createPlayerEntity = function(scene, value = 1) {
        // Create a simple player with a box
        const player = new window.Player({
            id: 'player',
            isLocalPlayer: true,
            color: 0xFFFF00,
            scene: scene // Pass the scene object here
        });
        
        if (scene && player.mesh) {
            scene.add(player.mesh);
        }
        
        return player;
    };

    // Remove the loading screen once everything is loaded
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
    
    // Set isFirstPerson based on viewMode
    window.isFirstPerson = gameConfig.playerSettings.viewMode === 'firstPerson';
    window.viewMode = gameConfig.playerSettings.viewMode;
}

// Listener for when the game engine signals it's fully ready
window.addEventListener('gameEngineReady', initializeBuildMode);

// Function to initialize BuildModeManager (called by event listener)
function initializeBuildMode() {
    console.log("'gameEngineReady' event received. Attempting BuildModeManager initialization...");
    
    // Remove the listener now that it has run once
    window.removeEventListener('gameEngineReady', initializeBuildMode);

    // --- Initialize Build Mode Manager ---
    if (window.BuildModeManager && window.gameEngine) { // Check if class and engine exist
        // At this point, gameEngine should be fully initialized
        const scene = window.gameEngine.scene;
        const camera = window.gameEngine.camera;
        const renderer = window.gameEngine.renderer;
        const rendererDomElement = renderer.domElement;
        const networkInterface = window.gameEngine.networkInterface; 
        const inputManager = window.gameEngine.inputManager; 
        const uiManager = window.gameEngine.uiManager; 

        if (scene && camera && renderer && rendererDomElement && networkInterface && inputManager && uiManager) {
            console.log("Initializing BuildModeManager...");
            const buildModeManager = new window.BuildModeManager(
                scene, 
                camera, 
                rendererDomElement, 
                networkInterface, 
                inputManager, 
                uiManager
            );
            buildModeManager.init();
            window.buildModeManager = buildModeManager; 
            console.log("BuildModeManager initialized successfully.");
        } else {
            console.error("BuildModeManager: Failed to get required dependencies from gameEngine even after ready signal.", {
                sceneExists: !!scene,
                cameraExists: !!camera,
                rendererExists: !!(window.gameEngine && window.gameEngine.renderer),
                rendererDomElementExists: !!rendererDomElement,
                networkInterfaceExists: !!networkInterface,
                inputManagerExists: !!inputManager,
                uiManagerExists: !!uiManager
            });
        }
    } else {
        console.warn("BuildModeManager initialization skipped after ready signal.", {
            BuildModeManagerLoaded: !!window.BuildModeManager,
            gameEngineExists: !!window.gameEngine 
        });
    }
    // --- End Build Mode Manager Init ---
}

// Helper function to load a script asynchronously
function loadScript(src) {
    return new Promise((resolve, reject) => {
        // Check if this script has already been loaded
        if (document.querySelector(`script[src="${src}"]`)) {
            console.log(`Script already loaded: ${src}`);
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = (error) => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
}

// Start the game when the document is ready
document.addEventListener('DOMContentLoaded', initGame); 

// InputManager class definition
function InputManager() {
    this.init();
    
    // Define and expose input management methods directly on the instance
    this.keys = {
        w: false, a: false, s: false, d: false,
        space: false, q: false, e: false, shift: false,
        v: false // Add V key tracking
    };
    this.mouseDelta = { x: 0, y: 0 };
    this.mousePosition = { x: 0, y: 0 };
    this.mouseButtons = { left: false, middle: false, right: false };
    
    // Server-compatible state
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
        domcontentloaded: [] // Add support for DOMContentLoaded
    };
    
    // UI element handlers - store by element ID and event type
    this.uiElementCallbacks = {};
    
    // Bind methods to ensure 'this' context is correct
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);
    this._handleMouseDown = this._handleMouseDown.bind(this);
    this._handleMouseUp = this._handleMouseUp.bind(this);
    this._handleMouseMove = this._handleMouseMove.bind(this);
    this._handleWheel = this._handleWheel.bind(this);
    this._handleUIEvent = this._handleUIEvent.bind(this);
    this._handleDOMContentLoaded = this._handleDOMContentLoaded.bind(this);
    
    this.update = this.update.bind(this);
}

InputManager.prototype.init = function() {
    // Add direct event listeners for core input events
    document.addEventListener('keydown', this._handleKeyDown, false);
    document.addEventListener('keyup', this._handleKeyUp, false);
    document.addEventListener('mousedown', this._handleMouseDown, false);
    document.addEventListener('mouseup', this._handleMouseUp, false);
    document.addEventListener('mousemove', this._handleMouseMove, false);
    document.addEventListener('wheel', this._handleWheel, false);
    
    // Add a global click handler to check for UI element interactions
    document.addEventListener('click', this._handleUIEvent, false);
    
    // Listen for DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', this._handleDOMContentLoaded);
    } else {
        // If already loaded, fire the event asynchronously
        setTimeout(this._handleDOMContentLoaded, 0);
    }
    
    // Register for animation loop updates
    if (window.registerAnimationCallback) {
        window.registerAnimationCallback(this.update);
    }
    
    console.log("InputManager initialized with centralized event handling");
}

// Internal handler for DOMContentLoaded
InputManager.prototype._handleDOMContentLoaded = function() {
    console.log("[InputManager] DOMContentLoaded detected.");
    this.callbacks.domcontentloaded.forEach(callback => {
        try { callback(); } catch (e) { console.error("Error in domcontentloaded callback:", e); }
    });
}

// Register a UI element for managed event handling
InputManager.prototype.registerUIElement = function(elementId, eventType, callback) {
    if (!this.uiElementCallbacks[elementId]) {
        this.uiElementCallbacks[elementId] = {};
    }
    
    this.uiElementCallbacks[elementId][eventType] = callback;
    console.log(`Registered UI element handler: ${elementId} for ${eventType} event`);
    return true;
}

// Remove a UI element handler
InputManager.prototype.unregisterUIElement = function(elementId, eventType) {
    if (this.uiElementCallbacks[elementId] && this.uiElementCallbacks[elementId][eventType]) {
        delete this.uiElementCallbacks[elementId][eventType];
        console.log(`Unregistered UI element handler: ${elementId} for ${eventType} event`);
        return true;
    }
    return false;
}

// Handle UI element events
InputManager.prototype._handleUIEvent = function(event) {
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

// Internal event handlers (prefixed with _)
InputManager.prototype._handleKeyDown = function(event) {
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

InputManager.prototype._handleKeyUp = function(event) {
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

InputManager.prototype._handleMouseDown = function(event) {
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

InputManager.prototype._handleMouseUp = function(event) {
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

InputManager.prototype._handleMouseMove = function(event) {
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

InputManager.prototype._handleWheel = function(event) {
    // Trigger callbacks with normalized wheel delta
    this.callbacks.wheel.forEach(callback => 
        callback({ delta: Math.sign(event.deltaY), event })
    );
}

InputManager.prototype.update = function(delta) {
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

// Public registration methods for callbacks
InputManager.prototype.on = function(eventType, callback) {
    if (this.callbacks[eventType]) {
        this.callbacks[eventType].push(callback);
        return true;
    }
    console.warn(`[InputManager] Unsupported event type for 'on': ${eventType}`);
    return false;
}

InputManager.prototype.off = function(eventType, callback) {
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
InputManager.prototype.dispatchEvent = function(eventType, data = {}) {
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
InputManager.prototype.isKeyPressed = function(key) {
    return this.keys[key] === true;
}

InputManager.prototype.isMouseButtonPressed = function(button) {
    return this.mouseButtons[button] === true;
}

InputManager.prototype.getMousePosition = function() {
    return { ...this.mousePosition };
}

InputManager.prototype.getMouseDelta = function() {
    return { ...this.mouseDelta };
}

// Method for gamepads and other input devices (future expansion)
InputManager.prototype.addInputDevice = function(deviceType, deviceConfig) {
    console.log(`[InputManager] Adding input device: ${deviceType}`);
    // Future implementation
} 