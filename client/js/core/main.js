// 3D Game Platform - Main Entry Point

// Parse URL parameters for customization
function getUrlParams() {
    const params = {};
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    
    // Get custom player name if provided
    if (urlParams.has('playerName')) {
        params.playerName = urlParams.get('playerName');
    }
    
    // Get custom player color if provided
    if (urlParams.has('playerColor')) {
        // Convert hex string to number
        const colorStr = urlParams.get('playerColor');
        params.playerColor = parseInt(colorStr, 16);
    }
    
    // Get implementation if provided
    if (urlParams.has('implementation')) {
        params.implementation = urlParams.get('implementation');
    } else {
        params.implementation = 'default'; // Default if not specified
    }
    
    return params;
}

// Get URL parameters
const urlParams = getUrlParams();

// Game configuration
const gameConfig = {
    debug: false,                 // Debug mode
    implementation: urlParams.implementation, // Store selected implementation
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
        viewMode: 'firstPerson',   // 'firstPerson', 'thirdPerson', or 'freeRoam'
        // Use custom player name if provided in URL, otherwise generate random name
        playerName: urlParams.playerName || `Player_${Math.floor(Math.random() * 1000)}`,
        playerColor: urlParams.playerColor || 0xCCCCCC, // Default to grey
        // Model path might depend on implementation, default set here
        playerModelPath: 'assets/models/human_man.glb', 
    },
    networkSettings: {
        serverUrl: window.location.hostname.includes('localhost') 
            ? `ws://localhost:3000` // Local development
            : `wss://sea-lion-app-4mc79.ondigitalocean.app/game`, // Production
        // Room name could potentially depend on implementation in the future
        roomName: 'active'       
    }
};

// Store config globally for access by other modules
window.gameConfig = gameConfig;

// Main game initialization
function initGame() {
    console.log(`Initializing 3D Game Platform (Implementation: ${gameConfig.implementation})...`);
    
    // Display player name in loading screen if custom name provided
    if (urlParams.playerName) {
        const loadingStatus = document.getElementById('loading-status');
        loadingStatus.textContent = `Loading game engine for ${urlParams.playerName}...`;
    }
    
    // Load core modules, then implementation modules
    loadCoreModules()
        .then(() => loadImplementationModules(gameConfig.implementation)) 
        .then(() => {
            // Initialize the game engine
            initGameEngine();
        })
        .catch(error => {
            console.error('Error initializing game:', error);
            // Potentially display an error message to the user here
        });
}

// Load core platform modules
function loadCoreModules() {
    console.log('Loading core modules...');
    const corePath = 'js/core/';
    const coreModules = [
        'Entity.js',
        'Player.js',
        'NPC.js',
        'EntityFactory.js',
        'collision.js',
        'player-ui.js',
        'network-core.js',
        'controls.js'
    ];
    
    let loadPromise = Promise.resolve();
    coreModules.forEach(module => {
        loadPromise = loadPromise.then(() => loadScript(corePath + module));
    });
    
    return loadPromise.then(() => {
        console.log('Core modules loaded successfully');
    }).catch(error => {
        console.error('Failed to load core modules:', error);
        throw error; // Re-throw to be caught by initGame
    });
}

// Load implementation-specific modules
function loadImplementationModules(implementationName) {
    console.log(`Loading implementation modules for: ${implementationName}`);
    const basePath = `js/implementations/${implementationName}/`;

    // First load the index.js which contains the implementation manifest
    return loadScript(basePath + 'index.js')
        .then(() => {
            console.log(`Implementation '${implementationName}' manifest loaded`);
            
            // Check if the implementation provided a module list
            if (window.implementationModules && Array.isArray(window.implementationModules)) {
                console.log(`Loading ${window.implementationModules.length} modules for implementation '${implementationName}'`);
                
                // Load each module in the manifest
                let loadPromise = Promise.resolve();
                window.implementationModules.forEach(module => {
                    loadPromise = loadPromise.then(() => loadScript(basePath + module));
                });
                
                return loadPromise;
            } else {
                console.warn(`Implementation '${implementationName}' did not provide a valid module list`);
                return Promise.resolve();
            }
        })
        .catch(error => {
            console.error(`Failed to load implementation manifest for '${implementationName}':`, error);
            console.warn(`Attempting to load legacy modules for '${implementationName}'`);
            
            // Fallback for legacy implementations that don't have an index.js
            let legacyModules = [];
            if (implementationName === 'default') {
                legacyModules = ['DefaultPlayer.js'];
            }

            if (legacyModules.length === 0) {
                console.log(`No legacy modules defined for implementation: ${implementationName}`);
                return Promise.resolve(); // Nothing to load
            }

            let loadPromise = Promise.resolve();
            legacyModules.forEach(module => {
                loadPromise = loadPromise.then(() => loadScript(basePath + module));
            });

            return loadPromise;
        })
        .finally(() => {
            // Clean up the global implementationModules to avoid conflicts
            if (window.implementationModules) {
                delete window.implementationModules;
            }
        });
}

// Initialize the main game engine
function initGameEngine() {
    console.log('Initializing game engine...');
    
    // ** Instantiate InputManager **
    // Ensure the class is defined (loaded via index.html)
    console.log('[Main] Checking window.InputManager before instantiation:', typeof window.InputManager, window.InputManager);
    if (window.InputManager) {
        window.inputManager = new InputManager();
        console.log('[Main] InputManager instantiated.');
    } else {
        console.error('[Main] InputManager class definition not found during initGameEngine!');
        return; // Cannot proceed without InputManager
    }
    
    // Player factory - determines which Player class to use
    window.createPlayerEntity = function(scene, isLocal = true, options = {}) {
        let PlayerClass;
        const impl = window.gameConfig.implementation;

        // Select class based on implementation
        if (impl === 'default' && window.DefaultPlayer) {
            PlayerClass = window.DefaultPlayer;
        } else {
            // Fallback to base Player class if implementation specific class not found
            console.warn(`Implementation player class for '${impl}' not found. Using base Player.`);
            PlayerClass = window.Player; 
        }
        
        console.log(`[createPlayerEntity] Using Player class: ${PlayerClass.name} for implementation: ${impl}`);
        
        const playerConfig = {
            id: options.id || (isLocal ? 'player' : `remote_${Math.random().toString(36).substring(7)}`),
            isLocalPlayer: isLocal,
            color: options.color || (isLocal ? gameConfig.playerSettings.playerColor : 0xAAAAAA),
            scene: scene, // Pass the scene object
            name: options.name || (isLocal ? gameConfig.playerSettings.playerName : 'RemotePlayer'),
            ...options // Pass any other options received (like position from server)
        };

        const player = new PlayerClass(playerConfig);
        
        // Register update callback ONLY for the local player
        if (isLocal && typeof player.update === 'function' && typeof window.registerAnimationCallback === 'function') {
            window.registerAnimationCallback(player.update.bind(player));
            console.log(`[createPlayerEntity] Registered update callback for local player: ${player.id}`);
        }
        
        if (scene && player.mesh) {
            scene.add(player.mesh);
        } else {
            console.warn(`[createPlayerEntity] Player mesh not created or scene not available for player: ${player.id}`);
        }
        
        return player;
    };
    
    // Load the game engine script itself
    loadScript('js/core/game-engine.js')
        .then(() => {
            console.log('Game engine script loaded, starting engine...');
            
            // ** Register InputManager's update callback NOW **
            if (window.inputManager && typeof window.inputManager.registerUpdateCallback === 'function') {
                window.inputManager.registerUpdateCallback();
            } else {
                console.error('[Main] Failed to register InputManager update callback after engine load.');
            }

            // The game engine's initialization logic (e.g., inside its own init function)
            // should now be able to run, potentially calling createPlayerEntity itself.
            
            // Remove the loading screen once the engine script is loaded
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
            
            // Set initial view mode (might be overridden by engine/controls)
            window.viewMode = gameConfig.playerSettings.viewMode;
        })
        .catch(error => {
            console.error('Error loading game engine script:', error);
        });
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
        script.async = false; // Load scripts synchronously in order
        script.onload = () => {
            // console.log(`Script loaded successfully: ${src}`);
            resolve();
        };
        script.onerror = (error) => {
            console.error(`Failed to load script: ${src}`, error);
            reject(new Error(`Failed to load script: ${src}`));
        };
        document.head.appendChild(script);
    });
}

// Start the game when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Main] DOMContentLoaded fired.');

    // ** Instantiate Managers **
    // Classes should be defined now due to synchronous loading in <head>
    if (typeof InputManager !== 'undefined') {
        window.inputManager = new InputManager();
        console.log('[Main] InputManager instantiated.');
    } else {
        console.error('[Main] CRITICAL: InputManager class not found at DOMContentLoaded!');
        return; // Stop if core manager missing
    }

    if (typeof ActionManager !== 'undefined') {
        window.actionManager = new ActionManager(); // Requires inputManager to exist
        console.log('[Main] ActionManager instantiated.');
    } else {
        console.error('[Main] CRITICAL: ActionManager class not found at DOMContentLoaded!');
        // Handle appropriately - maybe return or allow limited functionality
    }

    // ** Notify other scripts that managers are ready **
    console.log('[Main] Dispatching managersReady event.');
    document.dispatchEvent(new CustomEvent('managersReady'));

    // Proceed with the rest of game initialization which might load more scripts
    initGame(); 
});

// After player count is selected, trigger the controller assignment UI
function onPlayerCountSelected(playerCount) {
    console.log(`Player count selected: ${playerCount}`);
    
    // Dispatch event to create the controller assignment UI
    document.dispatchEvent(new CustomEvent('playerCountSelected', {
        detail: { count: playerCount }
    }));
}

// Export this function to be called from the existing player selection UI
window.onPlayerCountSelected = onPlayerCountSelected;