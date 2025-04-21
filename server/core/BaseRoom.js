const { Room } = require("colyseus");
const { GameState } = require("./schemas/GameState");
const { Player, MoveTarget } = require("./schemas/Player");
const { BaseEntity } = require("./schemas/BaseEntity");
const { Structure } = require("./schemas/Structure");

/**
 * Base room class for all game implementations
 * Provides common functionality for all game rooms
 */
class BaseRoom extends Room {
    /**
     * Called when room is created
     * @param {Object} options Room creation options
     */
    onCreate(options) {
        console.log("BaseRoom created!", options);
        
        // Initialize room state with a new GameState
        this.setState(new GameState());
        
        // Set maximum number of clients
        this.maxClients = 100;
        
        // Set frequency of patches to send
        this.setPatchRate(1000 / 30); // 30 fps
        
        // Set simulation interval for server-side logic
        this.setSimulationInterval(() => this.update());
        
        // Initialize spawn system
        this.initializeSpawnSystem();
        
        // Initialize implementation - to be implemented by subclasses
        this.initializeImplementation(options);
        
        // Listen for input updates
        this.onMessage("updateInput", (client, message) => {
            this.handleInputUpdate(client, message);
        });
        
        // Listen for entity interaction messages
        this.onMessage("entityInteraction", (client, message) => {
            this.handleEntityInteraction(client, message);
        });
        
        // Listen for RTS move commands
        this.onMessage("moveCommand", (client, message) => {
            this.handleMoveCommand(client, message);
        });
        
        // Listen for structure placement
        this.onMessage("placeStructure", (client, message) => {
            this.handlePlaceStructure(client, message);
        });
        
        // Listen for structure demolish
        this.onMessage("demolishStructure", (client, message) => {
            this.handleDemolishStructure(client, message);
        });
    }
    
    /**
     * Initialize entity spawn system
     * Provides base functionality for spawning entities periodically
     */
    initializeSpawnSystem() {
        // Base spawn system properties
        this.spawnTimer = 0;
        this.spawnInterval = 10; // Default 10 seconds
        this.maxEntities = 20;   // Default maximum entities
        this.spawnEnabled = false; // Disabled by default
    }
    
    /**
     * Initialize implementation-specific functionality
     * To be overridden by subclasses
     * @param {Object} options Room creation options
     */
    initializeImplementation(options) {
        // Base implementation does nothing
        console.log("Base implementation initialized");
    }
    
    /**
     * Handle input update message from client
     * @param {Client} client The client that sent the message
     * @param {Object} message The message sent by the client
     */
    handleInputUpdate(client, message) {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;
        
        // Update individual keys instead of replacing the entire keys object
        if (message.keys) {
            player.input.keys.w = !!message.keys.w;
            player.input.keys.a = !!message.keys.a;
            player.input.keys.s = !!message.keys.s;
            player.input.keys.d = !!message.keys.d;
            player.input.keys.space = !!message.keys.space;
            player.input.keys.q = !!message.keys.q;
            player.input.keys.e = !!message.keys.e;
            player.input.keys.shift = !!message.keys.shift;
        }
        
        // Fix mouseDelta assignment - update properties instead of replacing the object
        if (message.mouseDelta) {
            player.input.mouseDelta.x = message.mouseDelta.x || 0;
            player.input.mouseDelta.y = message.mouseDelta.y || 0;
        } else {
            player.input.mouseDelta.x = 0;
            player.input.mouseDelta.y = 0;
        }
        
        player.input.viewMode = message.viewMode || "third-person";
        player.input.thirdPersonCameraAngle = message.thirdPersonCameraAngle || 0;
        
        // Apply direct client rotation if provided (for immediate, responsive feel)
        if (message.clientRotation) {
            player.rotationY = message.clientRotation.rotationY;
            if (typeof message.clientRotation.pitch === 'number') {
                player.pitch = message.clientRotation.pitch;
            }
        }
    }
    
    /**
     * Handle entity interaction message from client
     * Base implementation for entity interactions like collecting or triggering entities
     * @param {Client} client The client that sent the message
     * @param {Object} message The message containing entityId and interaction type
     */
    handleEntityInteraction(client, message) {
        const player = this.state.players.get(client.sessionId);
        const entity = this.state.entities.get(message.entityId);
        
        if (!player || !entity) return;
        
        // Call implementation-specific entity interaction handler
        this.onEntityInteraction(player, entity, message.interactionType);
    }
    
    /**
     * Handle move command from RTS view
     * Sets target destination for player movement
     * @param {Client} client The client that sent the message
     * @param {Object} message The message containing x and z coordinates
     */
    handleMoveCommand(client, message) {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;
        
        // Store target destination
        player.moveTarget.x = message.x;
        player.moveTarget.z = message.z;
        
        // Set a flag indicating the player is being controlled by RTS commands
        player.isRTSControlled = true;
        
        console.log(`RTS move command: Player ${client.sessionId} moving to (${message.x}, ${message.z})`);
    }
    
    /**
     * Implementation-specific entity interaction handler
     * To be overridden by subclasses
     * @param {Player} player The player that interacted
     * @param {BaseEntity} entity The entity that was interacted with
     * @param {string} interactionType The type of interaction
     */
    onEntityInteraction(player, entity, interactionType) {
        // Base implementation does nothing
        console.log(`Player ${player.id} interacted with entity ${entity.id} (${interactionType})`);
    }
    
    /**
     * Update game state - called once per simulation interval
     * Base implementation handles player movement and physics
     */
    update() {
        // step physics world and sync positions using reusable transform
        if (this.physicsWorld && this._rigidBodies) {
            const deltaTime = this.clock.deltaTime / 1000;
            this.physicsWorld.stepSimulation(deltaTime, 10);
            const Ammo = this.Ammo;
            // reuse single transform to avoid Emscripten memory leak
            if (!this._tmpTransform) {
                this._tmpTransform = new Ammo.btTransform();
            }
            const transform = this._tmpTransform;
            for (const [id, body] of this._rigidBodies) {
                if (id === 'ground') continue;
                const ms = body.getMotionState();
                if (ms) {
                    ms.getWorldTransform(transform);
                    const origin = transform.getOrigin();
                    const x = origin.x(), y = origin.y(), z = origin.z();
                    if (this.state.entities.has(id)) {
                        const e = this.state.entities.get(id);
                        e.x = x; e.y = y; e.z = z;
                    }
                }
            }
        }
        
        // Calculate delta time (using this.clock for accuracy)
        const deltaTime = this.clock.deltaTime / 1000; // Convert ms to seconds
        
        // Process player inputs and update positions
        this.state.players.forEach((player, sessionId) => {
            // Skip if no input data
            if (!player.input) return;
            
            // Handle player movement based on input state
            this.updatePlayerFromInput(sessionId, player, player.input, deltaTime);
        });
        
        // Handle entity spawning if enabled
        if (this.spawnEnabled) {
            this.updateEntitySpawning(deltaTime);
        }
        
        // --- BEGIN Server-Authoritative NPC Update --- 
        // REMOVED: Generic NPC update logic. This should be handled by implementationUpdate.
        // --- END Server-Authoritative NPC Update ---
        
        // Call implementation-specific update
        this.implementationUpdate(deltaTime);
    }
    
    /**
     * Update entity spawning system
     * @param {number} deltaTime Time since last update
     */
    updateEntitySpawning(deltaTime) {
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
            // Count current spawned entities
            let entityCount = 0;
            this.state.entities.forEach(entity => {
                if (entity.isSpawned) {
                    entityCount++;
                }
            });
            
            // Spawn entity if below maximum
            if (entityCount < this.maxEntities) {
                this.spawnEntity();
            }
            
            this.spawnTimer = 0;
            this.spawnInterval = this.getSpawnInterval();
        }
    }
    
    /**
     * Get spawn interval - can be overridden for random intervals
     * @returns {number} Spawn interval in seconds
     */
    getSpawnInterval() {
        return this.spawnInterval; // Default implementation returns fixed interval
    }
    
    /**
     * Spawn a new entity - to be implemented by subclasses
     */
    spawnEntity() {
        // Base implementation does nothing - to be overridden
        console.log("spawnEntity called but not implemented");
    }
    
    /**
     * Create and add entity to the game state
     * @param {string} id Entity ID
     * @param {BaseEntity} entity Entity instance
     * @param {Object} position Position {x, y, z}
     * @param {Object} rotation Rotation {x, y, z}
     * @returns {BaseEntity} The created entity
     */
    createEntity(id, entity, position, rotation) {
        // Set entity properties
        entity.id = id;
        
        // Set position
        if (position) {
            entity.x = position.x || 0;
            entity.y = position.y || 0;
            entity.z = position.z || 0;
        }
        
        // Set rotation if provided
        if (rotation) {
            entity.rotationX = rotation.x || 0;
            entity.rotationY = rotation.y || 0; 
            entity.rotationZ = rotation.z || 0;
        }
        
        // Add to state
        this.state.entities.set(id, entity);
        console.log(`Created entity ${id} at (${entity.x}, ${entity.y}, ${entity.z})`);
        
        return entity;
    }
    
    /**
     * Delete an entity from the game state
     * @param {string} id Entity ID
     * @returns {boolean} Whether entity was found and deleted
     */
    deleteEntity(id) {
        if (this.state.entities.has(id)) {
            this.state.entities.delete(id);
            console.log(`Deleted entity ${id}`);
            return true;
        }
        return false;
    }
    
    /**
     * Implementation-specific update logic
     * To be overridden by subclasses
     * @param {number} deltaTime Time since last update
     */
    implementationUpdate(deltaTime) {
        // Base implementation does nothing
        this.state.entities.forEach((entity, id) => {
            // Universal entity death logic
            // ...
            if (typeof entity.behavior === 'function') {
                const prev = {
                    x: entity.x,
                    y: entity.y,
                    z: entity.z,
                    rotationY: entity.rotationY,
                    state: entity.state
                };
                const updates = entity.behavior(entity, deltaTime, this.state);
                if (updates) {
                    // apply physics velocity for NPC movement
                    const body = this._rigidBodies.get(id);
                    if (body && updates.x !== undefined && updates.z !== undefined) {
                        const vx = (updates.x - prev.x) / deltaTime;
                        const vz = (updates.z - prev.z) / deltaTime;
                        const vel = body.getLinearVelocity();
                        vel.setX(vx);
                        vel.setZ(vz);
                        body.setLinearVelocity(vel);
                    }
                    // Only apply and sync if a property changed (dirty checking)
                    let dirty = false;
                    if (updates.x !== undefined && updates.x !== prev.x) { entity.x = updates.x; dirty = true; }
                    if (updates.y !== undefined && updates.y !== prev.y) { entity.y = updates.y; dirty = true; }
                    if (updates.z !== undefined && updates.z !== prev.z) { entity.z = updates.z; dirty = true; }
                    if (updates.rotationY !== undefined && updates.rotationY !== prev.rotationY) { entity.rotationY = updates.rotationY; dirty = true; }
                    if (updates.state !== undefined && updates.state !== prev.state) { entity.state = updates.state; dirty = true; }
                }
            }
        });
    }
    
    /**
     * Update player from input state
     * @param {string} playerSessionId Session ID of the player
     * @param {Player} player Player object
     * @param {InputState} input Input state
     * @param {number} delta Time since last update
     */
    updatePlayerFromInput(playerSessionId, player, input, delta) {
        // If physics is enabled, apply velocity to the player's rigid body
        if (this.physicsWorld && this._rigidBodies && this._rigidBodies.has(playerSessionId)) {
            const body = this._rigidBodies.get(playerSessionId);
            
            // compute local input vector
            const inputX = (input.keys.d ? 1 : 0) - (input.keys.a ? 1 : 0);
            const inputZ = (input.keys.w ? 1 : 0) - (input.keys.s ? 1 : 0);
            if (inputX !== 0 || inputZ !== 0) {
                // rotate to world space based on player yaw
                const yaw = player.rotationY;
                const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
                let worldX = inputX * cosY - inputZ * sinY;
                let worldZ = -(inputX * sinY + inputZ * cosY); // Invert world Z mapping
                // normalize direction
                const len = Math.hypot(worldX, worldZ);
                worldX /= len; worldZ /= len;
                // apply horizontal velocity
                const vel = body.getLinearVelocity();
                vel.setX(worldX * 5);
                vel.setZ(worldZ * 5);
                body.setLinearVelocity(vel);
                // no server-side rotation; client controls view
            }
            
            // handle jump using physics
            if (input.keys.space) {
                const velY = body.getLinearVelocity();
                velY.setY(0.2);
                body.setLinearVelocity(velY);
            }
            // ensure body stays awake
            body.activate();
        }
        
        // Check if player is being controlled via RTS commands
        if (player.isRTSControlled && player.moveTarget) {
            // Calculate direction to target
            const dx = player.moveTarget.x - player.x;
            const dz = player.moveTarget.z - player.z;
            
            // Calculate distance to target
            const distanceSquared = dx * dx + dz * dz;
            
            // If we're close enough to the target, stop moving
            if (distanceSquared < 0.1) {
                player.isRTSControlled = false;
                return;
            }
            
            // Calculate normalized direction vector
            const distance = Math.sqrt(distanceSquared);
            const normalizedDx = dx / distance;
            const normalizedDz = dz / distance;
            
            // Move towards target at a fixed speed
            const speed = 0.2;
            player.x += normalizedDx * speed;
            player.z += normalizedDz * speed;
            
            // Calculate rotation to face movement direction
            player.rotationY = Math.atan2(normalizedDx, normalizedDz);
            
            // <<< ADDED: Ensure Idle animation during RTS control >>>
            player.currentAnimation = 'Idle.002';
            return;
        }
        
        // <<< ADDED: Check for non-player movement view modes >>>
        const isCameraMode = input.viewMode === 'freeCamera' || input.viewMode === 'rtsView';
        if (isCameraMode) {
            // Force idle animation and skip movement updates in camera modes
            player.currentAnimation = 'Idle.002';
            // Apply gravity only, no input-based movement or rotation
            player.velocityY -= 0.01; // gravity
            player.y += player.velocityY;
            if (player.y < 1) {
                player.y = 1;
                player.velocityY = 0;
            }
            return; // Skip the rest of the input processing
        }
        // <<< END ADDED >>>
        
        // Standard input-based movement (from keyboard controls)
        // Increase speed to make movement more noticeable
        const speed = 0.2;
        
        // Calculate movement based on the current player rotation or camera angle
        let dx = 0, dz = 0;
        
        // Determine which angle to use based on view mode
        const moveAngle = input.viewMode === "third-person" 
            ? input.thirdPersonCameraAngle // For third-person, move relative to camera angle
            : player.rotationY;            // For first-person, move relative to player facing
        
        // Check each movement key and apply appropriate movement
        if (input.keys && typeof input.keys === 'object') {
            // Remove verbose key logging
            
            if (input.keys.w) {
                // Forward movement: Move in the direction the player/camera is facing
                dx -= Math.sin(moveAngle) * speed;
                dz -= Math.cos(moveAngle) * speed;
            }
            
            if (input.keys.s) {
                // Backward movement: Move in the opposite direction
                dx += Math.sin(moveAngle) * speed;
                dz += Math.cos(moveAngle) * speed;
            }
            
            if (input.keys.a) {
                // Strafe left: Move perpendicular to the facing direction
                dx -= Math.sin(moveAngle + Math.PI/2) * speed;
                dz -= Math.cos(moveAngle + Math.PI/2) * speed;
            }
            
            if (input.keys.d) {
                // Strafe right: Move perpendicular to the facing direction
                dx += Math.sin(moveAngle + Math.PI/2) * speed;
                dz += Math.cos(moveAngle + Math.PI/2) * speed;
            }
            
            // Handle Q and E for rotating the player ONLY if no direct rotation is provided
            // This prevents Q/E from fighting with mouse rotation or clientRotation
            if (!input.clientRotation) {
                const rotationSpeed = 0.1;  // Increased rotation speed
                
                if (input.keys.q) {
                    // Rotate player left (counter-clockwise)
                    player.rotationY += rotationSpeed;
                    // Normalize rotation
                    player.rotationY = player.rotationY % (Math.PI * 2);
                    if (player.rotationY < 0) player.rotationY += Math.PI * 2;
                }
                
                if (input.keys.e) {
                    // Rotate player right (clockwise)
                    player.rotationY -= rotationSpeed;
                    // Normalize rotation
                    player.rotationY = player.rotationY % (Math.PI * 2);
                    if (player.rotationY < 0) player.rotationY += Math.PI * 2;
                }
            }
            
            // Apply diagonal movement speed correction for all movement
            if ((input.keys.w || input.keys.s) && 
                (input.keys.a || input.keys.d)) {
                // Normalize diagonal movement speed
                const magnitude = Math.sqrt(dx * dx + dz * dz);
                if (magnitude > 0) {
                    dx = (dx / magnitude) * speed;
                    dz = (dz / magnitude) * speed;
                }
            }
        }
        
        // Update player position
        player.x += dx;
        player.z += dz;
        
        // Handle physics - gravity
        player.velocityY -= 0.01; // gravity
        player.y += player.velocityY;
        if (player.y < 1) {
            player.y = 1;
            player.velocityY = 0;
        }
        
        // Handle jumps
        if (input.keys && input.keys.space && player.y <= 1) {
            player.velocityY = 0.2; // Jump velocity
        }

        // <<< NEW: Update currentAnimation based on input >>>
        let desiredAnimation = 'Idle.002';
        const moving = input.keys.w || input.keys.a || input.keys.s || input.keys.d;
        const jumping = input.keys.space && player.y <= 1; // Only jumping if on ground and space pressed
        const falling = player.velocityY < -0.1; // Add a check for falling
        // <<< MODIFIED: Invert running logic >>>
        const running = !input.keys.shift; // Run by default, walk if shift is pressed

        if (jumping) {
            desiredAnimation = 'Jumping.006';
        } else if (falling) {
            // Optional: Add a falling animation if you have one
            // desiredAnimation = 'Falling.001'; 
            desiredAnimation = 'Jumping.006'; // Use jumping as fallback for falling
        } else if (moving) {
            if (input.keys.a && !input.keys.d) {
                desiredAnimation = 'Left_Strafe.006';
            } else if (input.keys.d && !input.keys.a) {
                desiredAnimation = 'Right_Strafe.006';
            } else if (running) {
                 desiredAnimation = 'Running.006';
            } else {
                desiredAnimation = 'Walking.006';
            }
        } else {
            desiredAnimation = 'Idle.002';
        }
        player.currentAnimation = desiredAnimation;
        // <<< END NEW >>>
        
        // CLIENT ROTATION TAKES PRIORITY - Apply direct rotation values if provided
        if (input.clientRotation && typeof input.clientRotation.rotationY === 'number') {
            // Use client's reported rotation directly
            player.rotationY = input.clientRotation.rotationY;
            if (typeof input.clientRotation.pitch === 'number') {
                player.pitch = input.clientRotation.pitch;
            }
        }
        
        // Handle mouse movement (rotation) for players not sending direct rotation
        if (input.mouseDelta && (input.mouseDelta.x !== 0 || input.mouseDelta.y !== 0)) {
            // Apply mouse X movement to player rotation (horizontal looking)
            player.rotationY += input.mouseDelta.x * 0.002;
            
            // Normalize rotation to keep it within 0 to 2π range
            player.rotationY = player.rotationY % (Math.PI * 2);
            if (player.rotationY < 0) player.rotationY += Math.PI * 2;
            
            // Apply mouse Y movement to pitch (vertical looking, with limits)
            player.pitch += input.mouseDelta.y * 0.002;
            
            // Clamp pitch to prevent over-rotation
            player.pitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, player.pitch));
        }
    }
    
    /**
     * Called when a client joins the room
     * @param {Client} client The client that joined
     * @param {Object} options Join options
     */
    onJoin(client, options) {
        console.log(`Client joined: ${client.sessionId}`);
        
        // Create a new player instance
        const player = new Player();
        
        // Spawn player just outside the city building
        const city = this.state.structures.get('city_building_center');
        if (city) {
            // spawn at 3× building scale away
            const spawnRadius = city.scale * 3;
            const angle = Math.random() * Math.PI * 2;
            player.x = city.x + Math.cos(angle) * spawnRadius;
            player.y = city.y + 1;
            player.z = city.z + Math.sin(angle) * spawnRadius;
        } else {
            // fallback out to far map edge
            const mapSize = this.state.gameConfig.mapSize;
            player.x = mapSize;
            player.y = 1;
            player.z = mapSize;
        }
        
        // Set session ID as player ID
        player.id = client.sessionId;
        
        // Allow subclasses to modify player setup
        this.setupPlayer(player, client, options);
        
        // Add player to the game state
        this.state.players.set(client.sessionId, player);
    }
    
    /**
     * Player setup - to be implemented by subclasses
     * @param {Player} player The player object
     * @param {Client} client The client that joined
     * @param {Object} options Join options
     * @returns {Player} The modified player object
     */
    setupPlayer(player, client, options) {
        // Base implementation just returns the player
        return player;
    }
    
    /**
     * Called when a client leaves the room
     * @param {Client} client The client that left
     * @param {boolean} consented Whether the client consented to leaving
     */
    onLeave(client, consented) {
        console.log(`Client left: ${client.sessionId}`);
        
        // Remove player from the game state
        this.state.players.delete(client.sessionId);
    }
    
    /**
     * Generate a random position within the map
     * @param {number} minHeight Minimum height (y-coordinate)
     * @returns {Object} Position object {x, y, z}
     */
    generateRandomPosition(minHeight = 0) {
        const mapSize = this.state.gameConfig.mapSize;
        return {
            x: (Math.random() * mapSize) - (mapSize / 2),
            y: minHeight,
            z: (Math.random() * mapSize) - (mapSize / 2)
        };
    }
    
    /**
     * Handle structure placement message from client
     * @param {Client} client The client that sent the message
     * @param {Object} message The message containing structure details
     */
    handlePlaceStructure(client, message) {
        console.log(`Handling structure placement from ${client.sessionId}:`, message);
        
        // Validate player
        const player = this.state.players.get(client.sessionId);
        if (!player) { 
            console.warn(`[handlePlaceStructure] Player not found: ${client.sessionId}`);
            return; 
        }
        
        // Extract data - including new fields modelId, scale, rotationY
        const { 
            structureType, 
            modelId,             // NEW: Model ID from client
            scale = 1,           // NEW: Scale from client (default to 1)
            x, 
            y = 0,             // Default Y to 0 if not provided
            z, 
            rotationY = 0      // NEW: Use rotationY (default to 0)
        } = message;
        
        // Validate essential data
        if (!structureType || !modelId || typeof x !== 'number' || typeof z !== 'number' || typeof scale !== 'number' || typeof rotationY !== 'number') {
            console.warn("[handlePlaceStructure] Invalid or incomplete structure data:", message);
            client.send("structurePlaced", { success: false, error: "Invalid data" }); // Send error back
            return;
        }
        
        // Optional: Check if placement is valid (collision detection, etc.)
        // Pass necessary data to the validation function
        if (!this.isStructurePlacementValid(structureType, x, y, z, rotationY, modelId, scale)) {
            console.log("[handlePlaceStructure] Structure placement invalid (e.g., collision).");
             client.send("structurePlaced", { success: false, error: "Invalid placement" }); // Send error back
            return;
        }
        
        // Optional: Add resource checking logic here
        // if (!this.playerHasResources(player, structureType)) { ... return; }

        // Create a new structure entry with unique ID
        const id = "structure_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
        const structure = new Structure();
        structure.id = id;
        structure.ownerId = client.sessionId;
        structure.structureType = structureType;
        structure.modelId = modelId; // Assign modelId
        structure.scale = scale;     // Assign scale
        structure.x = x;
        structure.y = y; // Use the provided y (or default 0)
        structure.z = z;
        structure.rotationY = rotationY; // Assign rotationY
        
        // Set dimensions and health based on structure type (server authority)
        this.setStructureDefaults(structure);
        
        // Add to state - this automatically broadcasts to all clients
        this.state.structures.set(id, structure);
        
        console.log(`[handlePlaceStructure] Structure ${id} (${structureType}) placed by ${client.sessionId} at (${x}, ${y}, ${z})`);
        
        // Send confirmation to the client who placed it
        client.send("structurePlaced", { 
            success: true, 
            id: id,
            structureData: { // Send back the final server-side data
                id: structure.id,
                ownerId: structure.ownerId,
                structureType: structure.structureType,
                modelId: structure.modelId,
                scale: structure.scale,
                x: structure.x,
                y: structure.y,
                z: structure.z,
                rotationY: structure.rotationY,
                width: structure.width, // Include dimensions set by server
                height: structure.height,
                depth: structure.depth,
                health: structure.health,
                maxHealth: structure.maxHealth
            }
        });
    }
    
    /**
     * Handle structure demolition message from client
     * @param {Client} client The client that sent the message
     * @param {Object} message The message containing structure id
     */
    handleDemolishStructure(client, message) {
        const { structureId } = message;
        const structure = this.state.structures.get(structureId);
        
        // Only allow owner to demolish their structures
        if (structure && structure.ownerId === client.sessionId) {
            this.state.structures.delete(structureId);
            console.log(`Structure ${structureId} demolished by ${client.sessionId}`);
        }
    }
    
    /**
     * Check if a structure placement is valid
     * @param {string} structureType Type of structure
     * @param {number} x X position
     * @param {number} y Y position
     * @param {number} z Z position
     * @param {number} rotationY Rotation around Y axis in radians
     * @param {string} modelId Model ID (optional, for potential future use in validation)
     * @param {number} scale Scale (optional, for potential future use in validation)
     * @returns {boolean} Whether placement is valid
     */
    isStructurePlacementValid(structureType, x, y, z, rotationY, modelId, scale) {
        // Get dimensions based on type - Use a temporary structure to get defaults
        const tempStructure = new Structure();
        tempStructure.structureType = structureType;
        this.setStructureDefaults(tempStructure); // Use the helper to get dimensions
        let width = tempStructure.width;
        let depth = tempStructure.depth;
        
        // --- Simplified Bounding Box Calculation (Assumes Y-axis rotation only) ---
        // For accurate collision with rotated objects, more complex OBB (Oriented Bounding Box)
        // intersection tests would be needed. This is a simpler AABB (Axis-Aligned Bounding Box)
        // overlap check based on the structure's *dimensions*, not its visual model's rotation.
        // This might allow clipping if models are rotated significantly within their bounds.
        // Consider the structure's width/depth to be aligned with its local X/Z axes before rotation.
        
        // Check for collisions with other structures
        let isValid = true;
        
        // Create bounding box for new structure
        // Note: This simplified check uses axis-aligned bounds based on structure dimensions.
        // It does NOT account for the actual rotation (`rotationY`) for collision.
        // For rotation-aware collision, OBB vs OBB tests are required.
        const halfWidth = width / 2; 
        const halfDepth = depth / 2; 
        const newMin = { x: x - halfWidth, z: z - halfDepth };
        const newMax = { x: x + halfWidth, z: z + halfDepth };
        
        // Check against all other structures
        this.state.structures.forEach((structure) => {
            // Skip if already invalid
            if (!isValid) return;
            
            const otherHalfWidth = structure.width / 2;
            const otherHalfDepth = structure.depth / 2;
            
            const otherMin = {
                x: structure.x - otherHalfWidth,
                z: structure.z - otherHalfDepth
            };
            const otherMax = {
                x: structure.x + otherHalfWidth,
                z: structure.z + otherHalfDepth
            };
            
            // Check if bounding boxes overlap
            if (newMin.x <= otherMax.x && newMax.x >= otherMin.x &&
                newMin.z <= otherMax.z && newMax.z >= otherMin.z) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    /**
     * Set dimensions for a structure
     * @param {Structure} structure The structure to set dimensions for
     */
    setStructureDefaults(structure) { // Renamed to reflect setting more than just dimensions
        switch (structure.structureType) {
            case "building":
                structure.width = 4;
                structure.height = 3;
                structure.depth = 4;
                structure.health = 500; // Example health
                structure.maxHealth = 500;
                break;
            case "wall":
                structure.width = 4;
                structure.height = 2;
                structure.depth = 0.5;
                structure.health = 200; // Example health
                structure.maxHealth = 200;
                break;
            case "city_building_center":
                console.log(`City building center spawned with health ${structure.health} and maxHealth ${structure.maxHealth}`);
                structure.width = 10;
                structure.height = 5;
                structure.depth = 10;
                if (structure.health === undefined || structure.health === null) structure.health = 1000;
                if (structure.maxHealth === undefined || structure.maxHealth === null) structure.maxHealth = 1000;
                break;
            default:
                console.warn(`[setStructureDefaults] Unknown structure type: ${structure.structureType}. Using defaults.`);
                structure.width = 1;
                structure.height = 1;
                structure.depth = 1;
                if (structure.health === undefined || structure.health === null) structure.health = 100;
                if (structure.maxHealth === undefined || structure.maxHealth === null) structure.maxHealth = 100;
        }
    }

    // --- NPC Specific Logic --- 

    _initializeNpcState(npcEntity) {
        // Initialize internal server-side state for an NPC
        // Prefix with _ to denote they are not part of the synchronized schema (except 'state')
        npcEntity._currentState = 'Idle'; // Start Idle
        npcEntity.state = 'Idle'; // Update synchronized state
        npcEntity._stateTimer = 0;
        npcEntity._minStateTime = 5; // Seconds
        npcEntity._maxStateTime = 15; // Seconds
        npcEntity._nextStateChangeTime = this._getRandomBetween(npcEntity._minStateTime, npcEntity._maxStateTime);
        npcEntity._targetPosition = null; // { x: number, z: number }
        npcEntity._moveSpeed = 1.5; // Units per second
        npcEntity._turnSpeed = Math.PI; // Radians per second
        npcEntity._wanderRadius = 10; // Max distance from origin (0,0)
        npcEntity._possibleStates = ['Walk', 'Idle', 'Work']; // Cycle through these
        console.log(`Initialized server state for NPC: ${npcEntity.id}`);
    }

    _updateNpc(npcEntity, deltaTime) {
        // Initialize state if it hasn't been done yet
        if (npcEntity._currentState === undefined) {
            this._initializeNpcState(npcEntity);
        }

        // Update state timer
        npcEntity._stateTimer += deltaTime;

        // Check if it's time to change state
        if (npcEntity._stateTimer >= npcEntity._nextStateChangeTime) {
            npcEntity._stateTimer = 0;
            npcEntity._nextStateChangeTime = this._getRandomBetween(npcEntity._minStateTime, npcEntity._maxStateTime);

            // Cycle to next state
            const currentIndex = npcEntity._possibleStates.indexOf(npcEntity._currentState);
            const nextIndex = (currentIndex + 1) % npcEntity._possibleStates.length;
            const nextState = npcEntity._possibleStates[nextIndex];

            if (nextState !== npcEntity._currentState) {
                npcEntity._currentState = nextState;
                npcEntity.state = nextState; // Update synchronized state for clients
                // console.log(`NPC ${npcEntity.id} changed server state to: ${nextState}`);
                
                // If changing away from walking, clear target
                if (npcEntity._currentState !== 'Walk') {
                    npcEntity._targetPosition = null;
                }
            }
        }

        // Perform actions based on current state
        if (npcEntity._currentState === 'Walk') {
            this._updateNpcMovement(npcEntity, deltaTime);
        }
    }

    _updateNpcMovement(npcEntity, deltaTime) {
        // If no target, pick a new one within wander radius
        if (!npcEntity._targetPosition) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * npcEntity._wanderRadius;
            npcEntity._targetPosition = {
                x: Math.cos(angle) * radius,
                z: Math.sin(angle) * radius
            };
            // console.log(`NPC ${npcEntity.id} server target:`, npcEntity._targetPosition);
        }

        // Calculate direction and distance to target (on XZ plane)
        const dx = npcEntity._targetPosition.x - npcEntity.x;
        const dz = npcEntity._targetPosition.z - npcEntity.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // Check if reached target
        if (distance < 0.5) {
            npcEntity._targetPosition = null; // Clear target to pick a new one next walk cycle
            // Optionally, could force state change here, but timer logic handles it
        } else {
            // Normalize direction vector
            const dirX = dx / distance;
            const dirZ = dz / distance;

            // Move the entity
            const moveDistance = npcEntity._moveSpeed * deltaTime;
            npcEntity.x += dirX * moveDistance;
            npcEntity.z += dirZ * moveDistance;

            // Calculate target rotation and smoothly turn
            const targetRotationY = Math.atan2(dirX, dirZ);
            // Simple linear interpolation for rotation (can be improved with shortest angle)
            let diff = targetRotationY - npcEntity.rotationY;
            // Normalize angle difference to [-PI, PI]
            while (diff < -Math.PI) diff += 2 * Math.PI;
            while (diff > Math.PI) diff -= 2 * Math.PI;

            const turnStep = npcEntity._turnSpeed * deltaTime;
            if (Math.abs(diff) < turnStep) {
                npcEntity.rotationY = targetRotationY;
            } else {
                npcEntity.rotationY += Math.sign(diff) * turnStep;
            }
            // Normalize final rotationY to [-PI, PI]
            while (npcEntity.rotationY < -Math.PI) npcEntity.rotationY += 2 * Math.PI;
            while (npcEntity.rotationY > Math.PI) npcEntity.rotationY -= 2 * Math.PI;
        }
    }

    _getRandomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }
}

module.exports = { BaseRoom }; 