// Handles connection to the server and basic network setup

// Network configuration
const environment = window.location.hostname.includes('localhost') ? 'dev' : 'prod';
const endpoint = environment === 'dev' ? 'ws://localhost:8080' : 'wss://sea-lion-app-4mc79.ondigitalocean.app/game';
console.log(`Connecting to ${endpoint} in ${environment} mode`);
let client = null;
let room = null;

// Helper function to generate random colors
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Import CSS2D renderer for player names if not already defined
let CSS2DObject;
let CSS2DRenderer;
try {
    // First check if THREE.CSS2D is available (Three.js r137+)
    if (THREE.CSS2D) {
        console.log("Using THREE.CSS2D namespace");
        CSS2DObject = THREE.CSS2D.CSS2DObject;
        CSS2DRenderer = THREE.CSS2D.CSS2DRenderer;
    } 
    // For older Three.js versions
    else if (THREE.CSS2DObject && THREE.CSS2DRenderer) {
        console.log("Using THREE.CSS2DObject directly");
        CSS2DObject = THREE.CSS2DObject;
        CSS2DRenderer = THREE.CSS2DRenderer;
    } 
    else {
        throw new Error("CSS2D modules not found in THREE");
    }
} catch (error) {
    console.warn("CSS2DObject not available, player name labels will not be shown:", error.message);
    
    // Create dummy versions that do nothing to prevent errors
    CSS2DObject = class DummyCSS2DObject {
        constructor(element) {
            this.element = element;
            this.position = new THREE.Vector3();
            this.rotation = new THREE.Euler();
            this.scale = new THREE.Vector3(1, 1, 1);
            this.visible = true;
        }
    };
    
    CSS2DRenderer = class DummyCSS2DRenderer {
        constructor() {
            this.domElement = document.createElement('div');
        }
        setSize() {}
        render() {}
    };
}

// Global tracking of all visuals
const visuals = {
    players: {},
    operators: {},
    staticEntities: {},
    trees: {},
    rocks: {}
};

// Visual tracking containers
const visualTracking = {
    players: {},
    operators: {},
    staticEntities: {},
};

// Function to get color based on entity value
function getColorForValue(value) {
    // Default colors for values 1-10
    const colors = [
        '#FF0000', // 1 - Red
        '#FF7F00', // 2 - Orange
        '#FFFF00', // 3 - Yellow
        '#00FF00', // 4 - Green
        '#0000FF', // 5 - Blue
        '#4B0082', // 6 - Indigo
        '#8B00FF', // 7 - Violet
        '#964B00', // 8 - Brown
        '#808080', // 9 - Gray
        '#800080'  // 10 - Purple
    ];
    
    // Use value as index (adjusted for zero-based array)
    if (value >= 1 && value <= colors.length) {
        return colors[value - 1];
    }
    
    // Fall back to random color for higher values
    return getRandomColor();
}

// Setup automatic reconnection
function setupReconnection(room, client) {
    if (!room) return;
    
    // Handle WebSocket connection error
    room.onError((error) => {
        console.error("Connection error:", error);
        showErrorMessage("Connection error. Trying to reconnect...");
        addReconnectButton();
    });
    
    // Handle WebSocket disconnection
    room.onLeave((code) => {
        console.log(`Client left the room with code: ${code}`);
        showErrorMessage("Connection lost. Trying to reconnect...");
        
        // Attempt to reconnect automatically
        setTimeout(() => {
            console.log("Attempting to reconnect...");
            
            // Call initNetworking again
            initNetworking()
                .then(() => {
                    console.log("Reconnected successfully!");
                    showInfoMessage("Reconnected successfully!");
                    
                    // Remove reconnect button if it exists
                    const reconnectBtn = document.getElementById('reconnect-button');
                    if (reconnectBtn) {
                        reconnectBtn.remove();
                    }
                })
                .catch((e) => {
                    console.error("Failed to reconnect:", e);
                    showErrorMessage("Failed to reconnect. Please try again later.");
                });
        }, 2000);
    });
}

// Show error message
function showErrorMessage(message) {
    // Check if error message container exists
    let errorContainer = document.getElementById('error-message');
    
    // Create error container if it doesn't exist
    if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.id = 'error-message';
        errorContainer.style.position = 'fixed';
        errorContainer.style.top = '10px';
        errorContainer.style.left = '50%';
        errorContainer.style.transform = 'translateX(-50%)';
        errorContainer.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
        errorContainer.style.color = 'white';
        errorContainer.style.padding = '10px';
        errorContainer.style.borderRadius = '5px';
        errorContainer.style.zIndex = '1000';
        errorContainer.style.transition = 'opacity 0.5s';
        document.body.appendChild(errorContainer);
    }
    
    // Set message
    errorContainer.textContent = message;
    errorContainer.style.opacity = '1';
    
    // Hide message after 5 seconds
    setTimeout(() => {
        errorContainer.style.opacity = '0';
    }, 5000);
}

// Show info message
function showInfoMessage(message) {
    // Check if info message container exists
    let infoContainer = document.getElementById('info-message');
    
    // Create info container if it doesn't exist
    if (!infoContainer) {
        infoContainer = document.createElement('div');
        infoContainer.id = 'info-message';
        infoContainer.style.position = 'fixed';
        infoContainer.style.top = '10px';
        infoContainer.style.left = '50%';
        infoContainer.style.transform = 'translateX(-50%)';
        infoContainer.style.backgroundColor = 'rgba(0, 128, 0, 0.8)';
        infoContainer.style.color = 'white';
        infoContainer.style.padding = '10px';
        infoContainer.style.borderRadius = '5px';
        infoContainer.style.zIndex = '1000';
        infoContainer.style.transition = 'opacity 0.5s';
        document.body.appendChild(infoContainer);
    }
    
    // Set message
    infoContainer.textContent = message;
    infoContainer.style.opacity = '1';
    
    // Hide message after 3 seconds
    setTimeout(() => {
        infoContainer.style.opacity = '0';
    }, 3000);
}

// Add reconnect button
function addReconnectButton() {
    // Check if reconnect button already exists
    if (document.getElementById('reconnect-button')) {
        return;
    }
    
    // Create button
    const reconnectBtn = document.createElement('button');
    reconnectBtn.id = 'reconnect-button';
    reconnectBtn.textContent = 'Reconnect to Server';
    reconnectBtn.style.position = 'fixed';
    reconnectBtn.style.top = '50%';
    reconnectBtn.style.left = '50%';
    reconnectBtn.style.transform = 'translate(-50%, -50%)';
    reconnectBtn.style.padding = '10px 20px';
    reconnectBtn.style.backgroundColor = '#4CAF50';
    reconnectBtn.style.color = 'white';
    reconnectBtn.style.border = 'none';
    reconnectBtn.style.borderRadius = '5px';
    reconnectBtn.style.cursor = 'pointer';
    reconnectBtn.style.zIndex = '1000';
    reconnectBtn.style.fontSize = '16px';
    
    // Add hover effect
    reconnectBtn.onmouseover = function() {
        this.style.backgroundColor = '#45a049';
    };
    
    reconnectBtn.onmouseout = function() {
        this.style.backgroundColor = '#4CAF50';
    };
    
    // Add click handler
    reconnectBtn.onclick = function() {
        console.log("Reconnect button clicked");
        this.textContent = 'Connecting...';
        this.disabled = true;
        
        // Try to reconnect
        initNetworking()
            .then(() => {
                console.log("Reconnected successfully!");
                this.remove();
            })
            .catch((e) => {
                console.error("Failed to reconnect:", e);
                this.textContent = 'Reconnect to Server';
                this.disabled = false;
                showErrorMessage("Failed to reconnect. Please try again.");
            });
    };
    
    // Add to body
    document.body.appendChild(reconnectBtn);
}

// Function to initialize networking for multiplayer
async function initNetworking() {
    console.log("[InitNetworking] Starting...");
    // Ensure THREE is loaded
    if (typeof THREE === 'undefined') {
        console.error("THREE is not defined. Make sure Three.js is loaded before network-core.js");
        return Promise.reject("THREE library not found.");
    }

    client = new Colyseus.Client(endpoint);
    console.log(`[InitNetworking] Colyseus client created, endpoint: ${endpoint}`);

    try {
        console.log('[InitNetworking] Attempting to join room: default...');
        // Join the default room
        room = await client.joinOrCreate('default', { /* options */ });
        console.log(`[InitNetworking] Successfully joined room: ${room.name}, Session ID: ${room.sessionId}`);
        window.currentRoom = room; // Make room globally accessible if needed

        // Wait for the first state patch before setting up listeners that depend on it
        room.onStateChange.once((state) => {
            console.log('[InitNetworking] First state received, setting up listeners...');
            // Initialize game state listeners AFTER the first state is confirmed
            setupRoomPlayerListeners(room); // Setup player specific listeners
            setupRoomListeners(room); // Setup general entity listeners
            setupMessageHandlers(room); // Setup custom message handlers
            console.log('[InitNetworking] Room listeners setup complete.');

            // Update HUD when local player credits change
            if (room.state.players.onChange) {
                const orig = room.state.players.onChange;
                room.state.players.onChange = (player, sessionId) => {
                    if (sessionId === room.sessionId) {
                        window.playerUI.updateHUD({ playerCredits: player.credits });
                    }
                    orig(player, sessionId);
                };
            }
            // Initialize HUD with all credit values
            if (window.playerUI && window.playerUI.updateHUD) {
                const local = room.state.players.get(room.sessionId);
                window.playerUI.updateHUD({
                    playerCredits: local.credits,
                    cityCredits: room.state.cityCredits,
                    enemyCredits: room.state.enemyCredits
                });
            }
            // Subscribe to city/enemy credit pool changes
            room.state.onChange = (changes) => {
                changes.forEach(change => {
                    if (change.field === 'cityCredits') {
                        window.playerUI.updateHUD({ cityCredits: room.state.cityCredits });
                    } else if (change.field === 'enemyCredits') {
                        window.playerUI.updateHUD({ enemyCredits: room.state.enemyCredits });
                    }
                });
            };

            // Any other setup that depends on initial state can go here
            // For example, initializing UI elements based on state
        });

        // Setup reconnection logic (can be done immediately)
        setupReconnection(room, client);

        // Resolve the promise when successfully joined
        // (Removed resolve from here, should be handled by the caller if needed)

    } catch (e) {
        console.error("JOIN ERROR", e);
        showErrorMessage("Failed to connect to the server. Please try again later.");
        addReconnectButton(); // Add a button to manually reconnect
        return Promise.reject(e); // Reject the promise on error
    }
    console.log("[InitNetworking] Completed successfully.");
    return room; // Return the room object on success
}

// <<< HELPER FUNCTION to add collider >>>
function tryAddCollider(entityFromServer, clientInstance) {
    const entityId = entityFromServer?.id || 'unknown';
    const modelId = clientInstance?.modelId || 'unknown'; 
    // <<< Determine actual entity type based on clientInstance >>>
    const actualEntityType = clientInstance?.type || 
                           (clientInstance?._isPlayer ? 'player' : 'entity'); // Default to entity if unknown
    const isStructureOfInterest = actualEntityType === 'entity' && modelId !== 'hover_cube'; 

    if (!clientInstance || clientInstance._colliderAdded || !clientInstance.modelLoaded || !clientInstance.mesh) {
        // <<< NEW: Detailed logging for NPCs >>>
        if (actualEntityType === 'npc') {
            console.warn(`[ColliderDebug] [TryAddCollider NPC ${entityId}] Skipping collider. Reason: ${!clientInstance ? 'Missing clientInstance' : ''}${clientInstance?._colliderAdded ? ' Collider already added' : ''}${!clientInstance?.modelLoaded ? ' Model not loaded' : ''}${!clientInstance?.mesh ? ' Missing mesh' : ''}`);
            if (clientInstance) {
                console.log(`[ColliderDebug] [TryAddCollider NPC ${entityId}] Instance details:`, { id: clientInstance.id, type: clientInstance.type, modelId: clientInstance.modelId, _colliderAdded: clientInstance._colliderAdded, modelLoaded: clientInstance.modelLoaded, meshExists: !!clientInstance.mesh });
            }
        }
        // <<< END NEW >>>
        return; 
    }
    
    // <<< Extract collider data DIRECTLY from server object >>>
    const colliderData = {
        type: entityFromServer.colliderType,
        radius: entityFromServer.colliderRadius,
        // Ensure halfExtents is an array or undefined
        halfExtents: entityFromServer.colliderHalfExtents ? Array.from(entityFromServer.colliderHalfExtents) : undefined
    };
    
    // <<< Conditional validation logs >>>
    if (!colliderData.type) {
        if (isStructureOfInterest) console.warn(`[ColliderDebug] [TryAddCollider ${entityId}] Missing colliderType in server data. Skipping collider creation.`);
        return;
    }
    if (colliderData.type === 'box' && (!colliderData.halfExtents || colliderData.halfExtents.length !== 3)) {
         if (isStructureOfInterest) console.warn(`[ColliderDebug] [TryAddCollider ${entityId}] Invalid or missing halfExtents for box type... Skipping.`);
        return;
    }
    if (colliderData.type === 'sphere' && (colliderData.radius === undefined || colliderData.radius === null)) {
         if (isStructureOfInterest) console.warn(`[ColliderDebug] [TryAddCollider ${entityId}] Invalid or missing radius for sphere type... Skipping.`);
        return;
    }
    
    if (isStructureOfInterest) console.log(`[ColliderDebug] [TryAddCollider ${entityId}] Attempting to add collider. Server Data:`, colliderData, `Client Instance:`, clientInstance.id);
    
    if (typeof window.addSelectionColliderFromEntity === 'function') {
        try {
            // Pass the clientInstance which already has the correct type info
            const scale = clientInstance.scale || 1; // Get scale from client instance, default 1
            window.addSelectionColliderFromEntity(colliderData, clientInstance, clientInstance.mesh, scale);
            clientInstance._colliderAdded = true; 
            if (isStructureOfInterest) console.log(`[ColliderDebug] [TryAddCollider ${entityId}] Collider added successfully.`);
        } catch (error) {
             console.error(`[ColliderDebug] [TryAddCollider ${entityId}] Error calling addSelectionColliderFromEntity:`, error);
        } 
    } else {
        console.error(`[ColliderDebug] [TryAddCollider ${entityId}] window.addSelectionColliderFromEntity function NOT FOUND!`);
    }
}
// <<< END HELPER >>>

// <<< NEW HELPER FUNCTION to clean up orphaned colliders >>>
function cleanupOrphanedColliders() {
    if (!window.scene) return;
    
    console.log('[CleanupColliders] Checking for orphaned colliders in scene...');
    let orphanedCount = 0;
    
    // Find all collider meshes in the scene that don't have a parent with userData.entity
    const orphanedColliders = [];
    window.scene.traverse(obj => {
        if (obj.userData && obj.userData.isCollider === true) {
            // <<< CHANGE: Revised orphan check logic >>>
            const entity = obj.userData.entity; 
            let isOrphaned = true; // Assume orphaned unless found in active lists

            if (entity && entity.id) {
                // Check if entity exists in any known active collection
                const entityId = entity.id;
                const entityType = entity.type || (entity._isPlayer ? 'player' : 'entity');

                if (entityId === window.playerEntity?.id) {
                    isOrphaned = false; // Found local player
                } else if (window.otherPlayers && window.otherPlayers[entityId]) {
                    isOrphaned = false; // Found remote player
                } else if (window.NPC?.npcs?.has(entityId)) {
                    isOrphaned = false; // Found NPC
                } else if (window.visuals?.staticEntities?.[entityId]) {
                    // Check initial static entities (might overlap with structures map)
                    isOrphaned = false; 
                } else if (window.buildingModeManager?.worldStructuresMap?.has(entityId)){
                     // Check dynamically added structures
                     isOrphaned = false;
                }
                // Add checks for other entity types if necessary
            }
            
            // If the entity wasn\'t found in any active list, mark collider for removal
            if (isOrphaned) {
                console.log(`[CleanupColliders] Marking collider (UUID: ${obj.uuid}) as orphaned. Associated entity ID: ${entity?.id || 'N/A'}`);
            // <<< END CHANGE >>>
                orphanedColliders.push(obj);
            }
        }
    });
    
    // Remove orphaned colliders
    if (orphanedColliders.length > 0) {
        console.log(`[CleanupColliders] Found ${orphanedColliders.length} orphaned colliders to remove`);
        orphanedColliders.forEach(collider => {
            if (collider.parent) {
                collider.parent.remove(collider);
                console.log(`[CleanupColliders] Removed orphaned collider (UUID: ${collider.uuid})`);
                orphanedCount++;
                
                // Clean up resources
                if (collider.geometry) collider.geometry.dispose();
                if (collider.material) {
                    if (Array.isArray(collider.material)) {
                        collider.material.forEach(mat => mat.dispose());
                    } else {
                        collider.material.dispose();
                    }
                }
            }
        });
    } else {
        console.log('[CleanupColliders] No orphaned colliders found');
    }
    
    return orphanedCount;
}
// <<< END NEW HELPER >>>

// Setup message handlers
function setupMessageHandlers() {
    if (!room) return;
    
    // Listen for custom messages from the server
    room.onMessage("player-collision", (message) => {
        console.log("Collision message received:", message);
        
        // Update player value if needed
        if (window.player && window.player.value !== undefined && message.newValue) {
            window.player.value = message.newValue;
            
            // Update HUD
            if (window.updateHUD) {
                window.updateHUD();
            }
        }
    });
    
    room.onMessage("server-event", (message) => {
        console.log("Server event received:", message);
        // Process server events if needed
    });

    // Add dummy handler for structurePlaced to prevent warnings (rely on state sync)
    room.onMessage("structurePlaced", (message) => {
        // console.log("Ignoring direct structurePlaced message:", message);
    });
}

// Send player collision message
function sendPlayerCollision(targetId) {
    if (!room) return;
    
    room.send("player-collision", { targetId: targetId });
}

// Player joined callback
function onPlayerJoin(player) {
    console.log(`Player joined! ID: ${player.sessionId}`);
    
    // If it's our own join, update the interface
    if (player.sessionId === room.sessionId) {
        console.log("This is us joining!");
        
        // Set initial player values on the server
        player.name = window.playerName || "Player";
        player.color = window.playerColor || "#3366cc";
        
        // Show multiplayer notification
        showInfoMessage("Connected to multiplayer server!");
    } else {
        console.log(`Other player joined: ${player.name || "Unnamed player"}`);
        
        // Create a new entity for this player
        createRemotePlayerObject(player);
    }
    
    // Update the player list in the UI
    updatePlayerListUI();
}

// Create 3D object for remote player
function createRemotePlayerObject(player) {
    // Validate that the player object and sessionId exist
    if (!player || !player.sessionId) {
        console.error("Invalid player data received - missing sessionId:", player);
        return null;
    }
    
    if (!window.scene) {
        console.error("Scene not available to create remote player object");
        return null;
    }
    
    console.log("Creating remote player:", player);
    
    try {
        // Create a player object for the remote player
        // Use DefaultPlayer if available, otherwise fallback to base Player
        const PlayerClass = window.DefaultPlayer || window.Player;
        const remotePlayer = new PlayerClass({
            id: player.sessionId,  // Use the sessionId as the id
            isLocalPlayer: false,
            color: player.color || 0x3366CC,
            value: player.value || 1,
            x: player.x || 0,
            y: player.y || 0, 
            z: player.z || 0,
            rotationY: player.rotationY || 0,
            scene: window.scene 
        });
        
        // Store in global collections - use otherPlayers as the single source of truth
        window.otherPlayers = window.otherPlayers || {};
        window.otherPlayers[player.sessionId] = remotePlayer;
        
        // Also store in visuals collection
        window.visuals = window.visuals || {};
        window.visuals.players = window.visuals.players || {};
        window.visuals.players[player.sessionId] = remotePlayer;
        
        console.log(`Created remote player object for ${player.sessionId}`);
        return remotePlayer;
    } catch (error) {
        console.error("Failed to create remote player:", error);
        return null;
    }
}

// Player left callback
function onPlayerLeave(player) {
    // Validate player data
    if (!player || !player.sessionId) {
        console.error("Invalid player in onPlayerLeave:", player);
        return;
    }
    
    console.log(`Player left: ${player.sessionId}`);
    
    try {
        // Remove player from the scene - check multiple collections
        // Check otherPlayers collection
        if (window.otherPlayers && window.otherPlayers[player.sessionId]) {
            console.log(`Removing player from otherPlayers: ${player.sessionId}`);
            
            // Remove mesh from scene
            if (window.scene && window.otherPlayers[player.sessionId].mesh) {
                window.scene.remove(window.otherPlayers[player.sessionId].mesh);
            }
            
            // Delete player object
            delete window.otherPlayers[player.sessionId];
        }
        
        // Also check visuals.players collection
        if (window.visuals && window.visuals.players && window.visuals.players[player.sessionId]) {
            console.log(`Removing player from visuals: ${player.sessionId}`);
            
            // Remove mesh from scene if not already removed
            if (window.scene && window.visuals.players[player.sessionId].mesh) {
                window.scene.remove(window.visuals.players[player.sessionId].mesh);
            }
            
            // Delete from visuals
            delete window.visuals.players[player.sessionId];
        }
        
        // Update the player list in the UI
        if (window.playerUI && typeof window.playerUI.updatePlayerListUI === 'function') {
            window.playerUI.updatePlayerListUI();
        } else {
            updatePlayerListUI();
        }
    } catch (error) {
        console.error("Error removing player:", error);
    }
}

// Update player list UI
window.updatePlayerListUI = function() {
    const playerListElement = document.getElementById('player-list');
    if (!playerListElement) return;
    
    // Clear current list
    playerListElement.innerHTML = '';
    
    // Ensure room and state are available
    if (!window.room || !window.room.state) {
        playerListElement.innerHTML = '<li>Not connected to server</li>';
        return;
    }
    
    // Add each player to the list
    window.room.state.players.forEach((player, key) => {
        const playerElement = document.createElement('li');
        
        // Highlight current player
        if (key === window.room.sessionId) {
            playerElement.classList.add('current-player');
        }
        
        // Show player info
        playerElement.innerHTML = `
            <span class="player-name">${player.name || 'Unnamed'}</span>
            <span class="player-value">${player.value || 1}</span>
        `;
        
        // Add to list
        playerListElement.appendChild(playerElement);
    });
};

// Update remote players in the scene - this runs in the animation loop
window.updateRemotePlayers = function(deltaTime) { // Added deltaTime parameter
    if (!window.room || !window.room.state || !window.scene) {
        return;
    }
    
    // Debug log periodically to confirm this is running
    if (Math.random() < 0.001) {
        console.log("updateRemotePlayers running, player count:", window.room.state.players.size);
    }
    
    // First, collect all valid sessionIds from the server
    const serverPlayerIds = new Set();
    window.room.state.players.forEach((player, sessionId) => {
        if (sessionId && sessionId !== window.room.sessionId) {
            serverPlayerIds.add(sessionId);
        }
    });
    
    // Now process each player from the server
    window.room.state.players.forEach((player, sessionId) => {
        // Skip local player and invalid sessionIds
        if (!sessionId || sessionId === window.room.sessionId) return;
        
        // Create remote player object if it doesn't exist
        if (!window.otherPlayers || !window.otherPlayers[sessionId]) {
            console.log(`Creating missing remote player: ${sessionId}`);
            // Ensure we pass the sessionId in the player object
            const playerWithId = {
                ...player,
                sessionId: sessionId  // Explicitly set the sessionId
            };
            createRemotePlayerObject(playerWithId);
            return;
        }
        
        // Update remote player position and rotation using otherPlayers collection
        const remotePlayer = window.otherPlayers[sessionId];
        if (remotePlayer && remotePlayer.mesh) {
            // Update position with smooth lerping
            const lerpFactor = 0.3; // Smoothing factor for remote player movement
            
            remotePlayer.mesh.position.x = THREE.MathUtils.lerp(
                remotePlayer.mesh.position.x, 
                player.x, 
                lerpFactor
            );
            
            remotePlayer.mesh.position.y = THREE.MathUtils.lerp(
                remotePlayer.mesh.position.y, 
                player.y, 
                lerpFactor
            );
            
            remotePlayer.mesh.position.z = THREE.MathUtils.lerp(
                remotePlayer.mesh.position.z, 
                player.z, 
                lerpFactor
            );
            
            // Update rotation
            remotePlayer.rotationY = player.rotationY;
            
            // Explicitly call the player's update method with deltaTime
            if (typeof remotePlayer.update === 'function') {
                remotePlayer.update(deltaTime);
            } else {
                // Fallback for older structure or entities without an update method
                // Update mesh rotation directly if no update method exists
                if (remotePlayer.mesh) {
                    remotePlayer.mesh.rotation.y = player.rotationY;
                }
            }

            // Update animation based on server state
            if (typeof remotePlayer.playAnimation === 'function' && player.currentAnimation && remotePlayer.animationsLoaded) {
                // Only play if the animation name is different from the currently active one
                if (remotePlayer.activeAction?.getClip().name !== player.currentAnimation) {
                     if (remotePlayer.animations.has(player.currentAnimation)) {
                        remotePlayer.playAnimation(player.currentAnimation);
                    } else {
                        // Optional: Log a warning if the animation is missing
                        // console.warn(`[updateRemotePlayers] Remote player ${sessionId} missing animation: ${player.currentAnimation}`);
                        
                        // <<< Log available animations on first failure >>>
                        if (!remotePlayer.loggedMissingIdle) { 
                            console.warn(`[Player ${sessionId}] Fallback animation 'Idle.002' not found. Available animations:`, Array.from(remotePlayer.animations.keys()));
                            remotePlayer.loggedMissingIdle = true; // Log only once per player
                        }
                        // <<< END LOG >>>

                        remotePlayer.playAnimation('Idle.002'); // Fallback to idle
                    }
                }
            }

            if (remotePlayer.value !== player.value) {
                try {
                    // Remove old mesh
                    if (remotePlayer.mesh.parent) {
                        remotePlayer.mesh.parent.remove(remotePlayer.mesh);
                    }
                    
                    // Create new entity with updated value
                    const newPlayerEntity = new PlayerEntity(player.value);
                    newPlayerEntity.id = sessionId;
                    newPlayerEntity.mesh.position.copy(remotePlayer.mesh.position);
                    newPlayerEntity.mesh.rotation.y = remotePlayer.mesh.rotation.y;
                    
                    // Add to scene
                    window.scene.add(newPlayerEntity.mesh);
                    
                    // Update reference in otherPlayers collection
                    window.otherPlayers[sessionId] = newPlayerEntity;
                    // Also update in visuals collection
                    if (window.visuals && window.visuals.players) {
                        window.visuals.players[sessionId] = newPlayerEntity;
                    }
                } catch (error) {
                    console.error("Error updating player value:", error);
                }
            }
        }
    });
    
    // Check for players in otherPlayers that no longer exist in the server state
    if (window.otherPlayers) {
        for (const sessionId in window.otherPlayers) {
            // Validate sessionId to avoid issues with undefined
            if (!sessionId || sessionId === "undefined") {
                console.error("Invalid sessionId in otherPlayers:", sessionId);
                delete window.otherPlayers[sessionId];
                continue;
            }
            
            // Check if this player still exists on the server
            if (!serverPlayerIds.has(sessionId)) {
                console.log(`Removing stale player: ${sessionId}`);
                onPlayerLeave({ sessionId: sessionId });
            }
        }
    }
};

// Setup room-level listeners specifically for Players
function setupRoomPlayerListeners(room) {
    if (!room || !room.state) {
        console.warn('[setupRoomPlayerListeners] Room or state not available yet.');
        return;
    }

    console.log('[setupRoomPlayerListeners] Setting up player listeners...');
    console.log('[setupRoomPlayerListeners] Current state structure:', Object.keys(room.state));
    console.log('[setupRoomPlayerListeners] Players collection exists:', !!room.state.players);
    
    if (room.state.players) {
        console.log('[setupRoomPlayerListeners] Current player count:', room.state.players.size);
        
        // <<< ADDED: Clean up orphaned colliders before processing players >>>
        // cleanupOrphanedColliders(); // <<< TEMPORARILY DISABLED >>>
        // <<< END ADDED >>>
        
        // Process existing players
        console.log('[setupRoomPlayerListeners] Processing existing players');
        room.state.players.forEach((player, sessionId) => {
            // Skip players without valid sessionId or local player
            if (!sessionId || sessionId === room.sessionId) return;
            
            console.log(`Setting up existing player: ${sessionId}`, player);
            
            // Create remote player for other players
            createRemotePlayerObject({...player, sessionId: sessionId});
        });
        
        // Update UI immediately to show all players
        if (window.playerUI && typeof window.playerUI.updatePlayerListUI === 'function') {
            window.playerUI.updatePlayerListUI();
        } else {
            updatePlayerListUI();
        }
        
        // <<< TRY ADD COLLIDER for existing players >>>
        room.state.players.forEach(async (playerData, sessionId) => { // Make async
            if (sessionId === room.sessionId) { // Local player
                if (window.playerEntity) {
                    try {
                         if (window.playerEntity.readyPromise instanceof Promise) {
                            await window.playerEntity.readyPromise;
                             console.log(`[ColliderDebug] Local player ${sessionId} readyPromise resolved.`);
                         } else {
                            console.warn(`[ColliderDebug] Local player ${sessionId} missing readyPromise, attempting collider add directly.`);
                         }
                        tryAddCollider(playerData, window.playerEntity);
                    } catch (err) {
                        console.error(`[ColliderDebug] Error adding collider for local player ${sessionId} after readyPromise:`, err);
                    }
                }
            } else { // Remote player
                 const remotePlayerInstance = window.otherPlayers && window.otherPlayers[sessionId];
                 if (remotePlayerInstance) {
                     try {
                         if (remotePlayerInstance.readyPromise instanceof Promise) {
                             await remotePlayerInstance.readyPromise;
                             console.log(`[ColliderDebug] Remote player ${sessionId} readyPromise resolved.`);
                         } else {
                             console.warn(`[ColliderDebug] Remote player ${sessionId} missing readyPromise, attempting collider add directly.`);
                         }
                        tryAddCollider(playerData, remotePlayerInstance);
                     } catch (err) {
                        console.error(`[ColliderDebug] Error adding collider for remote player ${sessionId} after readyPromise:`, err);
                     }
                 }
            }
        });
        // <<<
        
        // Listen for player added events
        room.state.players.onAdd = async (player, sessionId) => { // Make async
            // Skip invalid sessionIds or local player
            if (!sessionId || sessionId === room.sessionId) return;
            
            console.log(`Player added: ${sessionId}`, player);
            
            // Ensure the player object has a sessionId field
            const playerWithId = {...player, sessionId: sessionId};
            
            // Create remote player object
            const remotePlayerInstance = createRemotePlayerObject(playerWithId);
            
            // <<< TRY ADD COLLIDER for new remote player >>>
            if (remotePlayerInstance) {
                try {
                     if (remotePlayerInstance.readyPromise instanceof Promise) {
                         await remotePlayerInstance.readyPromise;
                         console.log(`[ColliderDebug] New remote player ${sessionId} readyPromise resolved.`);
                     } else {
                        console.warn(`[ColliderDebug] New remote player ${sessionId} missing readyPromise, attempting collider add directly.`);
                     }
                    tryAddCollider(player, remotePlayerInstance);
                } catch (err) {
                    console.error(`[ColliderDebug] Error adding collider for new remote player ${sessionId} after readyPromise:`, err);
                }
            }
            // <<<
            
            // Update UI
            if (window.playerUI && typeof window.playerUI.updatePlayerListUI === 'function') {
                window.playerUI.updatePlayerListUI();
            } else {
                updatePlayerListUI();
            }
        };
        
        // <<< TRY ADD COLLIDER for local player on first state change (after playerEntity exists) >>>
        room.onStateChange.once(async (state) => { // Make async
             if (window.playerEntity) {
                const localPlayerData = state.players.get(room.sessionId);
                if (localPlayerData) {
                    try {
                         if (window.playerEntity.readyPromise instanceof Promise) {
                             await window.playerEntity.readyPromise;
                             console.log(`[ColliderDebug] Local player ${room.sessionId} (onStateChange) readyPromise resolved.`);
                         } else {
                            console.warn(`[ColliderDebug] Local player ${room.sessionId} (onStateChange) missing readyPromise, attempting collider add directly.`);
                         }
                        tryAddCollider(localPlayerData, window.playerEntity);
                    } catch (err) {
                        console.error(`[ColliderDebug] Error adding collider for local player ${room.sessionId} (onStateChange):`, err);
                    }
                }
             }
             // Also try for existing NPCs (handle potential race condition if NPC added between initial processing and here)
             state.entities.forEach(async (entityData, entityId) => { // Make async
                 if (entityData.entityType === 'npc') {
                     const npcInstance = NPC.npcs.get(entityId);
                     if (npcInstance && !npcInstance._colliderAdded) { // Check if collider wasn't added already
                         try {
                             if (npcInstance.readyPromise instanceof Promise) {
                                 await npcInstance.readyPromise;
                                 console.log(`[ColliderDebug] NPC ${entityId} (onStateChange) readyPromise resolved.`);
                             } else {
                                console.warn(`[ColliderDebug] NPC ${entityId} (onStateChange) missing readyPromise, attempting collider add directly.`);
                             }
                             tryAddCollider(entityData, npcInstance);
                         } catch (err) {
                             console.error(`[ColliderDebug] Error adding collider for NPC ${entityId} (onStateChange):`, err);
                         }
                     }
                 }
             });
        });
        // <<<
        
        // Listen for player removed events
        room.state.players.onRemove = (player, sessionId) => {
            // Skip invalid sessionIds or local player
            if (!sessionId || sessionId === room.sessionId) return;
            
            console.log(`Player removed: ${sessionId}`);
            
            // Remove player
            onPlayerLeave({ sessionId: sessionId });
            
            // Update UI
            if (window.playerUI && typeof window.playerUI.updatePlayerListUI === 'function') {
                window.playerUI.updatePlayerListUI();
            } else {
                updatePlayerListUI();
            }
        };
        
        // Listen for player changes
        room.state.players.onChange = (player, sessionId) => {
            // Skip invalid sessionIds or local player
            if (!sessionId || sessionId === room.sessionId) return;
            
            // For debugging
            if (Math.random() < 0.01) {
                console.log(`Player changed: ${sessionId}, pos: (${player.x.toFixed(2)}, ${player.y.toFixed(2)}, ${player.z.toFixed(2)})`);
            }
            
            // Update remote player - using otherPlayers consistently
            if (window.otherPlayers && window.otherPlayers[sessionId]) {
                // Update position with lerping for smooth movement
                const remotePlayer = window.otherPlayers[sessionId];
                const lerpFactor = 0.3; // Adjust for smoother/faster movement
                
                if (remotePlayer && remotePlayer.mesh) {
                    // Update position with lerping
                    remotePlayer.mesh.position.x = THREE.MathUtils.lerp(
                        remotePlayer.mesh.position.x,
                        player.x,
                        lerpFactor
                    );
                    
                    remotePlayer.mesh.position.y = THREE.MathUtils.lerp(
                        remotePlayer.mesh.position.y,
                        player.y,
                        lerpFactor
                    );
                    
                    remotePlayer.mesh.position.z = THREE.MathUtils.lerp(
                        remotePlayer.mesh.position.z,
                        player.z,
                        lerpFactor
                    );
                    
                    // Update rotation (no lerping for simplicity)
                    remotePlayer.mesh.rotation.y = player.rotationY;
                    
                    // Update player info in UI periodically
                    if (Math.random() < 0.01) { // Only update UI occasionally to save performance
                        if (window.playerUI && typeof window.playerUI.updatePlayerListUI === 'function') {
                            window.playerUI.updatePlayerListUI();
                        } else {
                            updatePlayerListUI();
                        }
                    }
                }
            } else {
                // If player exists in server state but not in otherPlayers, create it
                console.log(`Creating missing player from onChange: ${sessionId}`);
                createRemotePlayerObject({...player, sessionId: sessionId});
            }
        };
    } else {
        console.error('[setupRoomPlayerListeners] state.players not found!');
    }
    
    console.log('[setupRoomPlayerListeners] Room player listeners setup complete');
}

// Setup entity listeners for the room
async function setupRoomListeners(room) {
    console.log('[setupRoomListeners] Entered function');
    console.log('[setupRoomListeners] Received Room object:', room);
    
    // Ensure room and state are valid
    if (!room || !room.state) {
        console.error("[setupRoomListeners] Room or state is invalid. Cannot set up listeners.");
        return;
    }
    
    // --- ADD LOG TO INSPECT STATE --- 
    console.log('[ColliderDebug] INSPECTING room.state.entities:');
    try {
        const entityDataForLog = {};
        if (room.state.entities && typeof room.state.entities.forEach === 'function') {
             room.state.entities.forEach((entity, entityId) => {
                entityDataForLog[entityId] = {
                     entityType: entity.entityType,
                     modelId: entity.modelId,
                     // Add any other relevant fields for debugging
                 };
            });
             console.log('[ColliderDebug] Current entities in room.state.entities:', JSON.stringify(entityDataForLog, null, 2));
         } else {
            console.warn('[ColliderDebug] room.state.entities is missing or not iterable.');
         }
    } catch (e) {
        console.error('[ColliderDebug] Error inspecting room.state.entities:', e);
    }
     // --- END INSPECTION LOG ---

    // Ensure visuals namespaces exist
    window.visuals = window.visuals || {};
    window.visuals.players = window.visuals.players || {};
    window.visuals.operators = window.visuals.operators || {};
    window.visuals.staticEntities = window.visuals.staticEntities || {};
    
    console.log(`[NetworkCore Setup] Initial entities count: ${room.state.entities.size}`);
    console.log('[NetworkCore Setup] About to loop through initial entities...');
    
    // --- Process Initial Entities (NPCs, hover_cubes, etc.) ---
    console.log("[ColliderDebug] Processing initial room.state.entities...");
    if (room.state.entities && typeof room.state.entities.forEach === 'function') {
        room.state.entities.forEach((entity, entityId) => {
            const entityType = entity.entityType;
            const modelId = entity.modelId;
            // Only log processing step for non-cubes
            if (modelId !== 'hover_cube') {
                console.log(`[ColliderDebug] [Initial Entities Check] Processing entity: ${entityId}, Type: ${entityType}, ModelID: ${modelId}`);
            }

            // <<< Keep existing logic for non-structure entity types >>>
            if (entityType === 'player' && entityId !== room.sessionId) {
                 console.log(`[NetworkCore] Handling initial non-local player: ${entityId}`);
            } else if (entityType === 'npc') {
                 if (typeof window.createNpcVisual === 'function') {
                     window.createNpcVisual(entity, entityId);
                     setTimeout(() => {
                         const npcInstance = NPC.npcs.get(entityId);
                         if (npcInstance && npcInstance.mesh && !npcInstance._colliderAdded) {
                             tryAddCollider(entity, npcInstance);
                         }
                     }, 500);
                 } else {
                     console.warn(`window.createNpcVisual function not found for NPC ${entityId}`);
                 }
             } else if (entityType === 'entity' && modelId === 'hover_cube') {
                 // Explicitly handle hover_cubes separately if needed, or rely on generic entity block
                 console.log(`[ColliderDebug] [Initial Entities Check] Matched type 'entity' (hover_cube) for ${entityId}. Preparing to call loadAndAddStaticEntity.`);
                 if (!window.visuals.staticEntities[entityId]) {
                    loadAndAddStaticEntity(entity, entityId);
                 }
            } // Add other non-structure types like 'operator', 'tree' if necessary

        });
    } else {
         console.warn('[ColliderDebug] room.state.entities not found or not iterable during initial processing.');
    }

    // --- Process Initial Structures --- 
    console.log("[ColliderDebug] Processing initial room.state.structures...");
    if (room.state.structures && typeof room.state.structures.forEach === 'function') {
        room.state.structures.forEach((structure, structureId) => {
            // Assuming structures have modelId and entityType='entity' or similar
            const modelId = structure.modelId;
            console.log(`[ColliderDebug] [Initial Structures Check] Processing structure: ${structureId}, ModelID: ${modelId}`);
            // Call loadAndAddStaticEntity for structures
            if (!window.visuals.staticEntities[structureId]) {
                 console.log(`[ColliderDebug] [Initial Structures Check] Matched structure ${structureId}. Preparing to call loadAndAddStaticEntity.`);
                 // Pass the structure data (which should conform to what Entity expects)
                 // Ensure the entityType is correctly passed if not explicitly on the structure object
                 const entityData = { ...structure, entityType: 'entity' }; // Assuming structure is type 'entity'
                 loadAndAddStaticEntity(entityData, structureId);
            } else {
                 console.warn(`[ColliderDebug] [Initial Structures Check] Visual ALREADY EXISTS for structure ${structureId}. Skipping load.`);
            }
        });
    } else {
        console.warn('[ColliderDebug] room.state.structures not found or not iterable during initial processing.');
    }

    // --- Setup Listeners --- 

    // Listener for room.state.entities (NPCs, hover_cubes, etc.)
    if (room.state.entities && typeof room.state.entities.onAdd === 'function') {
        room.state.entities.onAdd = (entity, entityId) => {
            const entityType = entity.entityType;
            const modelId = entity.modelId;
             if (modelId !== 'hover_cube') {
                 console.log(`[ColliderDebug] [entities.onAdd] Processing: ${entityId}, Type: ${entityType}, ModelID: ${modelId}`);
             }
            if (entityType === 'player' && entityId === room.sessionId) return;

             if (entityType === 'npc') {
                 // ... (same NPC creation logic as above) ...
                 if (typeof window.createNpcVisual === 'function') {
                     window.createNpcVisual(entity, entityId);
                     setTimeout(() => {
                         const npcInstance = NPC.npcs.get(entityId);
                         if (npcInstance && npcInstance.mesh && !npcInstance._colliderAdded) {
                             tryAddCollider(entity, npcInstance);
                         }
                     }, 500);
                 } else {
                     console.warn(`window.createNpcVisual function not found for NPC ${entityId}`);
                 }
             } else if (entityType === 'entity' && modelId === 'hover_cube') {
                 if (modelId !== 'hover_cube') { // Avoid redundant logging for cubes
                    console.log(`[ColliderDebug] [entities.onAdd] Matched type 'entity' (hover_cube) for ${entityId}. Preparing call.`);
                 }
                 loadAndAddStaticEntity(entity, entityId);
             } // Add other non-structure types
        };
        // Add onChange/onRemove for entities if needed
        room.state.entities.onRemove = (entity, entityId) => {
             // ... (add removal logic for NPCs, hover_cubes if necessary) ...
             console.log(`[ColliderDebug] Entity removed from entities collection: ${entityId}, Type: ${entity.entityType}`);
             if (entity.entityType === 'npc') {
                if (typeof window.removeNpcVisual === 'function') window.removeNpcVisual(entityId);
             } else if (window.visuals.staticEntities[entityId]) {
                 const mesh = window.visuals.staticEntities[entityId].mesh; // Get mesh from stored instance
                 if (mesh && mesh.parent) mesh.parent.remove(mesh);
                 // Dispose geometry/material if needed
                 delete window.visuals.staticEntities[entityId];
             }
        };
    } else {
         console.warn('[ColliderDebug] room.state.entities does not support onAdd listener.');
    }

    // Listener for room.state.structures 
    if (room.state.structures && typeof room.state.structures.onAdd === 'function') {
         console.log("[ColliderDebug] Setting up listener for room.state.structures.onAdd");
        room.state.structures.onAdd = (structure, structureId) => {
            const modelId = structure.modelId;
            console.log(`[ColliderDebug] [structures.onAdd] Processing structure: ${structureId}, ModelID: ${modelId}`);
             if (!window.visuals.staticEntities[structureId]) {
                 console.log(`[ColliderDebug] [structures.onAdd] Matched structure ${structureId}. Preparing call.`);
                  const entityData = { ...structure, entityType: 'entity' }; // Assume structure is type 'entity'
                 loadAndAddStaticEntity(entityData, structureId);
             } else {
                  console.warn(`[ColliderDebug] [structures.onAdd] Visual ALREADY EXISTS for structure ${structureId}. Skipping load.`);
             }
        };
         // Add onChange/onRemove for structures if needed
         room.state.structures.onRemove = (structure, structureId) => {
             console.log(`[ColliderDebug] Structure removed from structures collection: ${structureId}`);
              if (window.visuals.staticEntities[structureId]) {
                 const mesh = window.visuals.staticEntities[structureId].mesh; // Get mesh from stored instance
                 if (mesh && mesh.parent) mesh.parent.remove(mesh);
                 // Dispose geometry/material if needed
                 delete window.visuals.staticEntities[structureId];
             }
         };
         room.state.structures.onChange = (structure, structureId) => {
             const modelId = structure.modelId;
             // Minimal log for structure changes to avoid spam
             if (Math.random() < 0.05) { // Log only 5% of changes
                 console.log(`[ColliderDebug] [structures.onChange] Structure changed: ${structureId}, ModelID: ${modelId}`);
             }
             // Update visual properties if needed (position, rotation, scale)
             const instance = window.visuals.staticEntities[structureId];
             if (instance && instance.mesh) {
                 instance.mesh.position.set(structure.x, structure.y, structure.z);
                 instance.mesh.rotation.y = structure.rotationY;
                 if (structure.scale) instance.mesh.scale.setScalar(structure.scale);
                 // Update other relevant properties from the structure state
             }
         };

    } else {
        console.warn('[ColliderDebug] room.state.structures not found or does not support onAdd listener.');
    }

    // --- Initialize Structure Listeners --- 
    if (window.buildingModeManager && typeof window.buildingModeManager.initializeStructureListeners === 'function') {
        // console.log("[setupRoomListeners] Initializing structure listeners via BuildingModeManager...");
        // Check if structures map exists before initializing
        if (room.state.structures) {
            window.buildingModeManager.initializeStructureListeners(room);
        } else {
            console.warn("[setupRoomListeners] room.state.structures not found when trying to initialize listeners.");
            // Optional: Retry later or listen for state changes to add structures map?
            // For now, we'll assume it should exist in the initial state if structures are used.
        }
    } else {
        console.warn("[setupRoomListeners] BuildingModeManager or initializeStructureListeners function not found.");
    }
    // --- End Structure Listeners ---

    console.log("[setupRoomListeners] Entity listeners setup complete.");
}

// Clean up network resources when leaving
window.cleanupNetworking = function() {
    console.log("Cleaning up network resources");
    
    // Clear the player update interval if it exists
    if (window.playerUpdateInterval) {
        clearInterval(window.playerUpdateInterval);
        window.playerUpdateInterval = null;
    }
    
    // Unregister updateRemotePlayers if it was registered with the animation loop
    if (typeof window.unregisterAnimationCallback === 'function' && 
        typeof window.updateRemotePlayers === 'function') {
        window.unregisterAnimationCallback(window.updateRemotePlayers);
    }
    
    // Clean up other players
    if (window.otherPlayers) {
        for (const sessionId in window.otherPlayers) {
            if (sessionId) {  // Skip undefined keys
                try {
                    if (window.scene && window.otherPlayers[sessionId] && window.otherPlayers[sessionId].mesh) {
                        window.scene.remove(window.otherPlayers[sessionId].mesh);
                    }
                } catch (error) {
                    console.error(`Error removing player ${sessionId} from scene:`, error);
                }
            }
        }
        window.otherPlayers = {};
    }
    
    // Clean up visuals
    if (window.visuals && window.visuals.players) {
        window.visuals.players = {};
    }
    
    // Leave the room if connected
    if (window.room) {
        try {
            window.room.leave();
        } catch (error) {
            console.error("Error leaving room:", error);
        }
        window.room = null;
    }
    
    // Reset client
    client = null;
    room = null;
    
    console.log("Network resources cleaned up successfully");
};

// Make functions available globally
window.initNetworking = initNetworking;
window.setupMessageHandlers = setupMessageHandlers;
window.sendPlayerCollision = sendPlayerCollision;
window.onPlayerJoin = onPlayerJoin;
window.createRemotePlayerObject = createRemotePlayerObject;
window.setupRoomListeners = setupRoomListeners;
window.cleanupNetworking = cleanupNetworking;

// --- Helper Function for Static Entity Loading ---
async function loadAndAddStaticEntity(entity, entityId) {
    const modelId = entity?.modelId || 'unknown'; // Get modelId for logging
    const isStructureOfInterest = modelId !== 'hover_cube'; // Log details for non-cubes

    if (isStructureOfInterest) console.log(`[ColliderDebug] [loadAndAddStaticEntity ENTRY] Using EntityFactory for entityId: ${entityId}, modelId: ${modelId}`);
    if (!window.entityFactory || !window.scene) {
        console.error(`[ColliderDebug] [loadAndAddStaticEntity] EntityFactory or Scene not available for ${entityId}.`);
        return;
    }
    const params = { ...entity, id: entityId };
    let entityInstance = null; 

    try {
        entityInstance = window.entityFactory.createEntity('entity', params);
        entityInstance.modelId = modelId; // Ensure modelId is on the instance for tryAddCollider

        if (entityInstance && entityInstance.readyPromise instanceof Promise) { 
             if (isStructureOfInterest) console.log(`[ColliderDebug] [loadAndAddStaticEntity] Waiting for readyPromise for ${entityId}...`);
             await entityInstance.readyPromise; 
             if (isStructureOfInterest) console.log(`[ColliderDebug] [loadAndAddStaticEntity] Entity ${entityId} readyPromise resolved.`);

             window.visuals.staticEntities[entityId] = entityInstance;
             if (isStructureOfInterest) console.log(`[ColliderDebug] [loadAndAddStaticEntity] ${entityId} added to visuals.`);

             tryAddCollider(entity, entityInstance);
             // No log here, tryAddCollider logs success conditionally

        } else if (entityInstance && entityInstance.mesh) {
             // Log fallback warning only for non-cubes
             if (isStructureOfInterest) console.warn(`[ColliderDebug] [loadAndAddStaticEntity] Entity ${entityId} created, but no valid readyPromise found. Using fallback setTimeout.`);
             if (!entityInstance.mesh.parent) {
                 if (isStructureOfInterest) console.warn(`[ColliderDebug] [loadAndAddStaticEntity] Mesh for ${entityId} has no parent, adding to scene.`);
                 window.scene.add(entityInstance.mesh);
             }
            window.visuals.staticEntities[entityId] = entityInstance;
            // Log fallback addition only for non-cubes
            if (isStructureOfInterest) console.log(`[ColliderDebug] [loadAndAddStaticEntity] ${entityId} added to scene/visuals (fallback).`);
            // Log unreliable timeout warning only for non-cubes
            if (isStructureOfInterest) console.warn(`[ColliderDebug] [loadAndAddStaticEntity] Using potentially unreliable setTimeout for collider on ${entityId}. Consider implementing readyPromise properly.`);
            setTimeout(() => {
                tryAddCollider(entity, entityInstance);
            }, 1000); 
        } else {
            // Always log creation failure
            console.error(`[ColliderDebug] [loadAndAddStaticEntity] Failed to create entity instance or mesh for ${entityId}, or readyPromise not found/resolved.`);
        }
    } catch (error) {
         // Always log errors
        console.error(`[ColliderDebug] [loadAndAddStaticEntity] Error during entity creation or collider addition for ${entityId}:`, error);
        // Optional: Clean up partially created entity visual if an error occurred
        if (entityInstance && entityInstance.mesh && entityInstance.mesh.parent) {
            console.log(`[ColliderDebug] [loadAndAddStaticEntity] Cleaning up mesh for ${entityId} due to error.`);
            entityInstance.mesh.parent.remove(entityInstance.mesh);
            // Consider disposing geometry/material here as well
             entityInstance.mesh.traverse(child => {
                 if (child.isMesh) {
                     child.geometry?.dispose();
                     if (child.material) {
                         if (Array.isArray(child.material)) {
                             child.material.forEach(m => m.dispose());
                         } else {
                             child.material.dispose();
                         }
                     }
                 }
             });
        }
        // Remove from visuals if it was added before the error
        if (window.visuals?.staticEntities?.[entityId]) {
             delete window.visuals.staticEntities[entityId];
        }
    }
}

console.log('network-core.js loaded');
