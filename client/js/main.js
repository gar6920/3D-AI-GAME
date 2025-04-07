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
            window.inputManager = {
                _customKeyListeners: {}, // Store custom key listeners by event.code

                getInputState: () => window.inputState, // Global input state
                isPointerLocked: () => document.pointerLockElement !== null,
                lockPointer: () => document.body.requestPointerLock(),
                unlockPointer: () => document.exitPointerLock(),

                // Function to add a listener for a specific key code
                addKeyListener: function(keyCode, callback) {
                    if (!this._customKeyListeners[keyCode]) {
                        this._customKeyListeners[keyCode] = [];
                    }
                    this._customKeyListeners[keyCode].push(callback);
                    console.log(`InputManager: Added listener for key ${keyCode}`);
                },

                // Function to remove a listener (optional but good practice)
                removeKeyListener: function(keyCode, callback) {
                    if (this._customKeyListeners[keyCode]) {
                        this._customKeyListeners[keyCode] = this._customKeyListeners[keyCode].filter(cb => cb !== callback);
                        if (this._customKeyListeners[keyCode].length === 0) {
                            delete this._customKeyListeners[keyCode];
                        }
                    }
                },

                // Internal handler to process key events, checking custom listeners
                _handleKeyDown: function(event) {
                    let handledByCustom = false;
                    // Check custom listeners first
                    if (this._customKeyListeners[event.code]) {
                        this._customKeyListeners[event.code].forEach(callback => callback(event));
                        handledByCustom = true; // Mark as handled
                        // Optionally, decide if default controls.js handler should also run
                        // For now, custom listener handles it exclusively
                    }
                    
                    // If no custom listener handled it, call the original onKeyDown from controls.js
                    if (!handledByCustom) {
                        // Ensure originalOnKeyDown is captured correctly
                        if (typeof originalOnKeyDown === 'function') {
                            originalOnKeyDown(event);
                        } else {
                            console.warn("Original onKeyDown handler not found for inputManager.");
                        }
                    }
                },
                
                _handleKeyUp: function(event) {
                    // Similar logic could be added for keyup if needed
                    // If no custom keyup listener, call original
                    if (typeof originalOnKeyUp === 'function') {
                        originalOnKeyUp(event);
                    } else {
                        console.warn("Original onKeyUp handler not found for inputManager.");
                    }
                }

                // We don't need setOnKeyDown/setOnKeyUp anymore, we manage internally
                /*
                setOnKeyDown: (handler) => { document.removeEventListener('keydown', onKeyDown); document.addEventListener('keydown', handler); }, // Example override
                setOnKeyUp: (handler) => { document.removeEventListener('keyup', onKeyUp); document.addEventListener('keyup', handler); }     // Example override
                */
            };
            console.log("Input Manager assigned:", window.inputManager);

            // Capture original handlers before overriding
            const originalOnKeyDown = window.onKeyDown; // Assuming onKeyDown is global
            const originalOnKeyUp = window.onKeyUp;     // Assuming onKeyUp is global

            // Replace global listeners with inputManager's internal handlers
            document.removeEventListener('keydown', originalOnKeyDown);
            document.removeEventListener('keyup', originalOnKeyUp);
            document.addEventListener('keydown', window.inputManager._handleKeyDown.bind(window.inputManager));
            document.addEventListener('keyup', window.inputManager._handleKeyUp.bind(window.inputManager));
            console.log("Replaced global key listeners with InputManager handlers.");

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