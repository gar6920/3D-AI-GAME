// Handles connection to the server and basic network setup

// Network configuration
const environment = window.location.hostname.includes('localhost') ? 'dev' : 'prod';
const endpoint = environment === 'dev' ? (window.location.port === '8080' ? 'ws://localhost:8080' : 'ws://localhost:3000') : 'wss://sea-lion-app-4mc79.ondigitalocean.app/game';
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
    if (!clientInstance || clientInstance._colliderAdded || !clientInstance.modelLoaded || !clientInstance.mesh) {
        // console.log(`[TryAddCollider ${entityFromServer.id}] Skipping: Instance: ${!!clientInstance}, Added: ${clientInstance?._colliderAdded}, Loaded: ${clientInstance?.modelLoaded}, Mesh: ${!!clientInstance?.mesh}`);
        return; // Exit if no client instance, collider already added, model not loaded, or no mesh group
    }
    
    // Use data from the server entity object
    const colliderData = {
        colliderType: entityFromServer.colliderType,
        colliderRadius: entityFromServer.colliderRadius,
        colliderHalfExtents: entityFromServer.colliderHalfExtents ? Array.from(entityFromServer.colliderHalfExtents) : undefined
    };
    
    console.log(`[TryAddCollider ${entityFromServer.id}] Attempting to add collider. Data:`, colliderData, `Client Instance:`, clientInstance);
    
    if (typeof window.addSelectionColliderFromEntity === 'function') {
        // Pass the clientInstance for context, but the SERVER data for collider props
        // We need to temporarily add the server data to the client instance for the helper
        const originalData = {
            colliderType: clientInstance.colliderType,
            colliderRadius: clientInstance.colliderRadius,
            colliderHalfExtents: clientInstance.colliderHalfExtents
        };
        
        clientInstance.colliderType = colliderData.colliderType;
        clientInstance.colliderRadius = colliderData.colliderRadius;
        clientInstance.colliderHalfExtents = colliderData.colliderHalfExtents;
        
        try {
            window.addSelectionColliderFromEntity(clientInstance, clientInstance.mesh); 
            clientInstance._colliderAdded = true; // Set flag after successful addition
            console.log(`[TryAddCollider ${entityFromServer.id}] Collider added successfully.`);
        } catch (error) {
             console.error(`[TryAddCollider ${entityFromServer.id}] Error calling addSelectionColliderFromEntity:`, error);
        } finally {
             // Restore original data on client instance (if any)
             clientInstance.colliderType = originalData.colliderType;
             clientInstance.colliderRadius = originalData.colliderRadius;
             clientInstance.colliderHalfExtents = originalData.colliderHalfExtents;
        }
    } else {
        console.error(`[TryAddCollider ${entityFromServer.id}] window.addSelectionColliderFromEntity function NOT FOUND!`);
    }
}
// <<< END HELPER >>>

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
        room.state.players.forEach((playerData, sessionId) => {
            if (sessionId === room.sessionId) { // Local player
                if (window.playerEntity) {
                    tryAddCollider(playerData, window.playerEntity);
                }
            } else { // Remote player
                 if (window.otherPlayers && window.otherPlayers[sessionId]) {
                    tryAddCollider(playerData, window.otherPlayers[sessionId]);
                 }
            }
        });
        // <<<
        
        // Listen for player added events
        room.state.players.onAdd = (player, sessionId) => {
            // Skip invalid sessionIds or local player
            if (!sessionId || sessionId === room.sessionId) return;
            
            console.log(`Player added: ${sessionId}`, player);
            
            // Ensure the player object has a sessionId field
            const playerWithId = {...player, sessionId: sessionId};
            
            // Create remote player object
            const remotePlayerInstance = createRemotePlayerObject(playerWithId);
            
            // <<< TRY ADD COLLIDER for new remote player >>>
            if (remotePlayerInstance) {
                // Need to wait slightly for model to potentially load
                setTimeout(() => tryAddCollider(player, remotePlayerInstance), 500); 
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
        room.onStateChange.once((state) => {
             if (window.playerEntity) {
                const localPlayerData = state.players.get(room.sessionId);
                if (localPlayerData) {
                    // Delay slightly to increase chance model is loaded
                    setTimeout(() => tryAddCollider(localPlayerData, window.playerEntity), 500);
                }
             }
             // Also try for existing NPCs
             state.entities.forEach((entityData, entityId) => {
                 if (entityData.entityType === 'npc') {
                     const npcInstance = NPC.npcs.get(entityId);
                     if (npcInstance) {
                         setTimeout(() => tryAddCollider(entityData, npcInstance), 500);
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
    
    // Ensure visuals namespaces exist
    window.visuals = window.visuals || {};
    window.visuals.players = window.visuals.players || {};
    window.visuals.operators = window.visuals.operators || {};
    window.visuals.staticEntities = window.visuals.staticEntities || {};
    
    console.log(`[NetworkCore Setup] Initial entities count: ${room.state.entities.size}`);
    console.log('[NetworkCore Setup] About to loop through initial entities...');
    
    // Initial entities check
    room.state.entities.forEach((entity, entityId) => {
        // console.log(`[NetworkCore Setup Initial Entity] Received entityId: ${entityId}, entityType: ${entity.entityType}`);
        
        if (entity.entityType === 'player' && entityId !== room.sessionId) {
            // Handle existing players (visuals might be created by GameEngine on join)
            console.log(`[NetworkCore] Handling initial non-local player: ${entityId}`);
        } else if (entity.entityType === 'operator') {
            if (typeof window.createOperatorVisual === 'function') {
                window.createOperatorVisual(entity, entityId);
            }
        } else if (entity.entityType === 'staticValueEntity') {
            if (typeof window.createStaticEntityVisual === 'function') {
                window.createStaticEntityVisual(entity, entityId);
            }
        } else if (entity.entityType === 'tree') {
            if (window.entityHandlers?.tree?.create) {
                window.entityHandlers.tree.create(entity, entityId);
            }
        } else if (entity.entityType === 'npc') {
            // Handle NPC entities
            // console.log(`Attempting to create visual for NPC: ${entityId}`);
            if (typeof window.createNpcVisual === 'function') {
                window.createNpcVisual(entity, entityId);
                // <<< TRY ADD COLLIDER for new NPC >>>
                const npcInstance = NPC.npcs.get(entityId);
                if (npcInstance) {
                    // Delay slightly for model loading
                    setTimeout(() => tryAddCollider(entity, npcInstance), 500);
                }
                // <<<
            } else {
                console.warn(`window.createNpcVisual function not found for NPC ${entityId}`);
            }
            // --- ADD ONCHANGE HANDLER FOR NPCs (LERP LOGIC) ---
            if (typeof entity.onChange === 'function') {
                entity.onChange = (changes) => {
                    const npcInstance = window.NPC?.npcs?.get(entityId);
                    if (npcInstance && npcInstance.mesh) {
                        // Lerp position for smooth movement
                        const lerpFactor = 0.3;
                        npcInstance.mesh.position.x = THREE.MathUtils.lerp(
                            npcInstance.mesh.position.x, entity.x, lerpFactor
                        );
                        npcInstance.mesh.position.y = THREE.MathUtils.lerp(
                            npcInstance.mesh.position.y, entity.y, lerpFactor
                        );
                        npcInstance.mesh.position.z = THREE.MathUtils.lerp(
                            npcInstance.mesh.position.z, entity.z, lerpFactor
                        );
                        npcInstance.mesh.rotation.y = entity.rotationY;
                        // Optionally update animation/state
                        if (entity.state !== undefined && npcInstance.state !== entity.state) {
                            npcInstance.playAnimation(entity.state);
                        }
                    }
                };
            }
        } else if (entity.entityType === 'entity') {
            console.log(`[setupRoomListeners initialLoop] ENTERED 'entity' block for: ${entityId}`);
            if (!window.visuals.staticEntities[entityId]) {
                console.log(`[setupRoomListeners initialLoop] Visual DOES NOT exist for ${entityId}. Attempting loadAndAddStaticEntity...`);
                loadAndAddStaticEntity(entity, entityId);
                console.log(`[setupRoomListeners initialLoop] AFTER calling loadAndAddStaticEntity for ${entityId}.`);
            } else {
                console.warn(`[setupRoomListeners initialLoop] Visual ALREADY EXISTS for entity ${entityId}. Skipping load.`);
            }
            console.log(`[setupRoomListeners initialLoop] EXITED 'entity' block for: ${entityId}`);
        }
    });
    
    room.state.entities.onAdd = (entity, entityId) => {
        console.log(`[NetworkCore onAdd] Received entityId: ${entityId}, entityType: ${entity.entityType}`);
        console.log(`[NetworkCore onAdd ${entityId}] Collider Data: type=${entity.colliderType}, radius=${entity.colliderRadius}, extents=${entity.colliderHalfExtents?.toArray()}`);
        console.log(`[NetworkCore] Entity added: ID=${entityId}, entityType=${entity.entityType}`);

        // Skip adding visual for the local player, handled by GameEngine
        if (entity.entityType === 'player' && entityId === room.sessionId) {
            return;
        }

        // Handle different entity types
        if (entity.entityType === 'operator') {
            if (typeof window.createOperatorVisual === 'function') {
                window.createOperatorVisual(entity, entityId);
            }
        } else if (entity.entityType === 'staticValueEntity') {
            if (typeof window.createStaticEntityVisual === 'function') {
                window.createStaticEntityVisual(entity, entityId);
            }
        } else if (entity.entityType === 'tree') {
            if (window.entityHandlers?.tree?.create) {
                window.entityHandlers.tree.create(entity, entityId);
            }
        } else if (entity.entityType === 'npc') {
            // Handle NPC entities
            // console.log(`Attempting to create visual for NPC: ${entityId}`);
            if (typeof window.createNpcVisual === 'function') {
                window.createNpcVisual(entity, entityId);
                // <<< TRY ADD COLLIDER for new NPC >>>
                const npcInstance = NPC.npcs.get(entityId);
                if (npcInstance) {
                    // Delay slightly for model loading
                    setTimeout(() => tryAddCollider(entity, npcInstance), 500);
                }
                // <<<
            } else {
                console.warn(`window.createNpcVisual function not found for NPC ${entityId}`);
            }
            // --- ADD ONCHANGE HANDLER FOR NPCs (LERP LOGIC) ---
            if (typeof entity.onChange === 'function') {
                entity.onChange = (changes) => {
                    const npcInstance = window.NPC?.npcs?.get(entityId);
                    if (npcInstance && npcInstance.mesh) {
                        // Lerp position for smooth movement
                        const lerpFactor = 0.3;
                        npcInstance.mesh.position.x = THREE.MathUtils.lerp(
                            npcInstance.mesh.position.x, entity.x, lerpFactor
                        );
                        npcInstance.mesh.position.y = THREE.MathUtils.lerp(
                            npcInstance.mesh.position.y, entity.y, lerpFactor
                        );
                        npcInstance.mesh.position.z = THREE.MathUtils.lerp(
                            npcInstance.mesh.position.z, entity.z, lerpFactor
                        );
                        npcInstance.mesh.rotation.y = entity.rotationY;
                        // Optionally update animation/state
                        if (entity.state !== undefined && npcInstance.state !== entity.state) {
                            npcInstance.playAnimation(entity.state);
                        }
                    }
                };
            }
        } else if (entity.entityType === 'entity') {
            console.log(`[NetworkCore onAdd] Creating visual for generic entity: ${entityId}`);
            // Directly call the refined loading function
            loadAndAddStaticEntity(entity, entityId);
        } else {
            console.log(`[NetworkCore onAdd] Unknown entity type: ${entity.entityType}`);
        }
    };
    
    // Listen for entity changes (for existing NPCs)
    if (typeof room.state.entities.onChange === 'function') {
        room.state.entities.onChange = (entity, entityId) => {
            if (Math.random() < 0.01) {
                console.log(`[NetworkCore onChange ${entityId}] Collider Data: type=${entity.colliderType}, radius=${entity.colliderRadius}, extents=${entity.colliderHalfExtents?.toArray()}`);
            }
            if (entity.entityType === 'npc') {
                const npcInstance = window.NPC?.npcs?.get(entityId);
                if (npcInstance && npcInstance.mesh) {
                    const lerpFactor = 0.3;
                    npcInstance.mesh.position.x = THREE.MathUtils.lerp(
                        npcInstance.mesh.position.x, entity.x, lerpFactor
                    );
                    npcInstance.mesh.position.y = THREE.MathUtils.lerp(
                        npcInstance.mesh.position.y, entity.y, lerpFactor
                    );
                    console.log(`[NPC ${entityId}] network-core.js lerp: mesh y now ${npcInstance.mesh.position.y}, entity.y=${entity.y}`);
                    npcInstance.mesh.position.z = THREE.MathUtils.lerp(
                        npcInstance.mesh.position.z, entity.z, lerpFactor
                    );
                    npcInstance.mesh.rotation.y = entity.rotationY;
                    if (entity.state !== undefined && npcInstance.state !== entity.state) {
                        npcInstance.playAnimation(entity.state);
                    }
                }
            } else if (entity.entityType === 'entity') {
                const mesh = window.visuals.staticEntities[entityId];
                if (mesh) {
                    // Directly update mesh properties
                    mesh.position.set(entity.x ?? mesh.position.x, entity.y ?? mesh.position.y, entity.z ?? mesh.position.z);
                    mesh.rotation.y = entity.rotationY ?? mesh.rotation.y;
                    const scale = entity.scale ?? 1;
                    mesh.scale.set(scale, scale, scale);
                } else {
                    console.warn(`[NetworkCore onChange] Visual for entity ${entityId} not found.`);
                }
            }
        };
    }
    
    // Listen for entity removed events
    if (typeof room.state.entities.onRemove === 'function') {
        room.state.entities.onRemove = (entity, entityId) => {
            console.log(`Entity removed: ${entityId}, entityType: ${entity.entityType}`);
            
            // Handle different entity types for removal
            if (entity.entityType === 'operator') {
                if (typeof window.removeOperatorVisual === 'function') {
                    window.removeOperatorVisual(entityId);
                }
            } else if (entity.entityType === 'staticValueEntity') {
                if (typeof window.removeStaticEntityVisual === 'function') {
                    window.removeStaticEntityVisual(entityId);
                }
            } else if (entity.entityType === 'tree') {
                if (window.entityHandlers?.tree?.remove) {
                    window.entityHandlers.tree.remove(entityId);
                }
            } else if (entity.entityType === 'npc') {
                // Handle NPC entity removal
                // console.log(`Attempting to remove visual for NPC: ${entityId}`);
                if (typeof window.removeNpcVisual === 'function') {
                    window.removeNpcVisual(entityId);
                } else {
                    console.warn(`window.removeNpcVisual function not found for NPC ${entityId}`);
                }
            } else if (entity.entityType === 'entity') {
                const mesh = window.visuals.staticEntities[entityId];
                if (mesh) {
                    console.log(`[NetworkCore onRemove] Removing visual for entity: ${entityId}`);
                    if (mesh.parent) {
                        mesh.parent.remove(mesh);
                    }
                    // Dispose geometry/material
                    mesh.traverse(child => {
                        if (child.isMesh) {
                            child.geometry.dispose();
                            if (child.material.isMaterial) {
                                child.material.dispose();
                            } else if (Array.isArray(child.material)) {
                                child.material.forEach(material => material.dispose());
                            }
                        }
                    });
                    delete window.visuals.staticEntities[entityId];
                } else {
                    console.warn(`[NetworkCore onRemove] Visual for entity ${entityId} not found.`);
                }
            }
        };
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
function loadAndAddStaticEntity(entity, entityId) {
    console.log(`[loadAndAddStaticEntity ENTRY] Using EntityFactory for entityId: ${entityId}, entityType: ${entity.entityType}`);
    if (!window.entityFactory || !window.scene) {
        console.error(`[loadAndAddStaticEntity] EntityFactory or Scene not available for ${entityId}.`);
        return;
    }
    // Ensure id is set
    const params = { ...entity, id: entityId };
    const entityInstance = window.entityFactory.createEntity('entity', params);
    if (entityInstance && entityInstance.mesh) {
        window.scene.add(entityInstance.mesh);
        window.visuals.staticEntities[entityId] = entityInstance.mesh;
        console.log(`[loadAndAddStaticEntity] ${entityId} added to scene and visuals using EntityFactory.`);
    } else {
        console.error(`[loadAndAddStaticEntity] Failed to create or add mesh for ${entityId}.`);
    }
}

console.log('network-core.js loaded');
