const { BaseRoom } = require("./BaseRoom");
const { BaseEntity } = require('./schemas/BaseEntity'); 
const { Structure } = require('./schemas/Structure'); 
const { StructureDefinition } = require('./schemas/StructureDefinition'); 
const ammoModule = require('ammo.js');
// Import NodeIO from glTF-Transform (CJS style)
const { NodeIO } = require('@gltf-transform/core');
const path = require('path');
const { CityCell } = require("./schemas/CityCell"); // Import CityCell
const CityGrid = require("./CityGrid");
const axios = require('axios');
const { cityEngineerBehavior } = require('../implementations/default/cityEngineer');
const { cityArchitectBehavior } = require('../implementations/default/cityArchitect');
const { cityBuilderBehavior } = require('../implementations/default/cityBuilder');

/**
 * BaseGameRoom
 * Core room logic for all implementations.
 * This file should not contain any implementation-specific code.
 * Implementation rooms can extend or use this as a base.
 */
class BaseGameRoom extends BaseRoom {
    // Initialize the default room implementation
    initializeImplementation(options) {
        // Initialize credit pools (persist across game restarts)
        this.state.cityCredits = 100;
        this.state.enemyCredits = 100;
        // Add logging for initialization
        console.log('[BaseGameRoom] initializeImplementation called');
        this._initOptions = options; // Save init options for game reset
        // Use a single, shared structureDefinitions array for all static/buildable structure logic
        const { structureDefinitions } = require('../implementations/default/structures');
        this._structureDefs = structureDefinitions;
        // Try to require npcDefinitions from the implementation if not already present
        let npcDefs;
        try {
            npcDefs = require('../implementations/default/npcs').npcDefinitions;
            console.log(`[BaseGameRoom] Loaded NPCs: ${npcDefs.map(n => n.id).join(', ')}`);
        } catch (e) {
            console.warn('[BaseGameRoom] Could not load npcDefinitions:', e);
            npcDefs = [];
        }
        this._npcDefs = npcDefs; // Store for reset
        // Spawn each NPC and add to state
        this.spawnedNPCs = [];
        npcDefs.forEach(def => {
            // console.log(`[${this.roomId}] Spawning NPC/Entity from definition ID: ${def.id}`);
            const entity = new BaseEntity();
            entity.id = def.id;             // Unique instance ID
            entity.entityType = def.type || 'entity';         // 'npc', 'entity', etc.
            entity.modelId = def.modelId || def.id;   // Copy def.modelId to entity.modelId
            entity.x = def.x || 0;
            entity.y = def.y || 0;
            entity.z = def.z || 0;
            entity.rotationY = def.rotationY || 0;
            entity.state = def.state || 'Idle';
            entity.scale = def.scale !== undefined ? def.scale : 1; // Set scale from definition, default 1
            entity.attackDamage = def.attackDamage !== undefined ? def.attackDamage : entity.attackDamage;
            // Removed attackDamage check and log. BaseGameRoom does not care about attackDamage presence.
            // Apply custom speed from definition if provided
            entity.speed = def.speed !== undefined ? def.speed : entity.speed;
            if (def.job === 'cityArchitect') {
                entity.behavior = cityArchitectBehavior.bind(this);
                entity._isCityArchitect = true;
            } else if (def.job === 'cityBuilder') {
                entity.behavior = cityBuilderBehavior.bind(this);
                entity._isCityBuilder = true;
            } else if (def.job === 'cityEngineer') {
                entity.behavior = cityEngineerBehavior.bind(this);
            } else if (def.behavior) {
                entity.behavior = def.behavior;
            }

            // Populate the entity's animationMap from the definition
            if (def.animationMap) {
                for (const [key, value] of Object.entries(def.animationMap)) {
                    entity.animationMap.set(key, value);
                }
                // console.log(`[BaseGameRoom] Populated animationMap for ${def.id} with ${Object.keys(def.animationMap).length} entries.`);
            } else {
                // console.log(`[BaseGameRoom] No animationMap found in definition for ${def.id}`);
            }

            this.state.entities.set(def.id, entity);
            this.spawnedNPCs.push(def.id);
            // console.log(`[${this.roomId}] Entity ${def.id} added to state. Type: ${entity.entityType}, ModelId: ${entity.modelId}, Scale: ${entity.scale}`);
            // console.log(`[BaseGameRoom] Spawned NPC: ${def.id} at (${def.x}, ${def.y}, ${def.z})`);
        });

        // Load and spawn structures
        // Implementation-agnostic structure loading
        let structDefs = [];
        try {
            const impl = require('../implementations/default/index');
            if (typeof impl.getStructureDefinitions === 'function') {
                structDefs = impl.getStructureDefinitions();
            } else {
                structDefs = require('../implementations/default/structures').structureDefinitions;
            }
        } catch (e) {
            console.warn('[BaseGameRoom] Could not load structureDefinitions:', e);
            structDefs = [];
        }
        // Removed: No separate static structure logic. All structures are handled via _structureDefs.
        this.spawnedStructures = [];

        // Spawn all structures from _structureDefs
        this._structureDefs.forEach(def => {
            console.log(`[BaseGameRoom] Spawning initial structure: ${def.id}`);
            const s = new Structure();
            s.id = def.id;
            s.entityType = 'structure';
            s.definitionId = def.id;
            s.modelId = def.modelId || (def.modelPath ? def.modelPath.split('/').pop().replace('.glb', '') : def.id);
            s.x = def.position.x;
            s.y = def.position.y;
            s.z = def.position.z;
            s.rotationY = def.rotationY || 0;
            s.scale = def.scale || 1;
            if (def.health !== undefined) s.health = def.health;
            if (def.maxHealth !== undefined) s.maxHealth = def.maxHealth;
            s.colliderType = def.colliderType || "";
            s.colliderRadius = def.colliderRadius || 0;
            // Properly populate the ArraySchema for colliderHalfExtents
if (def.colliderHalfExtents && s.colliderHalfExtents) {
    s.colliderHalfExtents.length = 0;
    def.colliderHalfExtents.forEach(v => s.colliderHalfExtents.push(v));
}
            if (!s.colliderType) {
                console.warn(`[BaseGameRoom] WARNING: Structure ${s.id} is missing colliderType! colliderType=${s.colliderType}`);
            }
            this.state.structures.set(s.id, s);
            this.spawnedStructures.push(s.id);
        });

        // Sync structure definitions to clients
        structDefs.forEach(def => {
            const defSchema = new StructureDefinition();
            defSchema.id = def.id;
            defSchema.structureType = def.structureType;
            defSchema.modelPath = def.modelPath;
            defSchema.positionX = def.position.x;
            defSchema.positionY = def.position.y;
            defSchema.positionZ = def.position.z;
            defSchema.rotationY = def.rotationY || 0;
            defSchema.scale = def.scale || 1;
            defSchema.buildable = def.buildable;
            this.state.structureDefinitions.set(def.id, defSchema);
        });

        // Log all entities in state after spawning
        // console.log('[BaseGameRoom] Entities after NPC spawn:', Array.from(this.state.entities.keys()));
        // Setup game timer to reset after 1 hour
        this._elapsedTime = 0;
        this._gameDuration = 3600; // seconds

        // Instantiate LLM grid wrapper
        const size = this.state.gameConfig.mapSize;
        this.cityGrid = new CityGrid(size, size, this.state.llmGrid);

        // --- Initialize City Grid ---
        this.initializeCityGrid();

        // initialize ammo.js physics world and collision bodies
        this._initPhysics();
    }

    // --- City Grid Initialization Helper ---
    initializeCityGrid() {
        console.log("[BaseGameRoom] Initializing Sparse City Grid...");
        this.cityGrid.clear(); // Start with an empty LLM grid map

        const mapSize = this.state.gameConfig?.mapSize || 100; // Still needed for context if desired
        const gridSize = 1; // Assuming 1x1 cells
        console.log(`[BaseGameRoom] Map size context: ${mapSize}, Grid Size: ${gridSize}`);

        // Place initial structures into the initially empty grid
        console.log(`[BaseGameRoom] Placing ${this._structureDefs.filter(def => def.buildable === false).length} initial structures into sparse grid...`);
        let cellsAdded = 0;
        this._structureDefs.forEach(def => {
            // Check: Only place ground-level structure types
            const groundStructureTypes = ["building", "path_tile", "wall", "structure"]; 
            if (!groundStructureTypes.includes(def.structureType)) {
                return; 
            }

            const structureX = def.position?.x || 0;
            const structureZ = def.position?.z || 0;
            const halfExtentsX = def.collision?.halfExtents?.x || gridSize / 2;
            const halfExtentsZ = def.collision?.halfExtents?.z || gridSize / 2;

            const startX = Math.floor((structureX - halfExtentsX) / gridSize);
            const endX = Math.floor((structureX + halfExtentsX) / gridSize);
            const startZ = Math.floor((structureZ - halfExtentsZ) / gridSize);
            const endZ = Math.floor((structureZ + halfExtentsZ) / gridSize);

            for (let gx = startX; gx <= endX; gx++) {
                for (let gz = startZ; gz <= endZ; gz++) {
                    this.cityGrid.setCell(gx, gz, {
                        structureType: def.structureType || 'structure',
                        isBuildablePlot: false,
                        structureId: def.id,
                        ownerId: "city",
                        currentHP: def.health !== undefined ? def.health : 0,
                        maxHP: def.maxHealth !== undefined ? def.maxHealth : 0,
                        width: 1,
                        height: 1
                    });
                    cellsAdded++;
                }
            }
        });
        console.log(`[BaseGameRoom] Finished placing initial structures. ${cellsAdded} grid cells added.`);
        console.log(`[BaseGameRoom] Total grid size now: ${this.cityGrid.schemaMap.size} entries.`);
    }

    /**
     * Deterministic road grid planner
     */
    _generateRoadGridPlan(spacing = 5, radius = 50) {
        const tasks = [];
        const seen = new Set();
        // horizontal roads
        for (let y = -radius; y <= radius; y += spacing) {
            for (let x = -radius; x <= radius; x++) {
                const key = `${x}_${y}`;
                if (!seen.has(key)) { seen.add(key); tasks.push({ id: 'concrete_path_buildable', x, y }); }
            }
        }
        // vertical roads
        for (let x = -radius; x <= radius; x += spacing) {
            for (let y = -radius; y <= radius; y++) {
                const key = `${x}_${y}`;
                if (!seen.has(key)) { seen.add(key); tasks.push({ id: 'concrete_path_buildable', x, y }); }
            }
        }
        return tasks;
    }

    /**
     * Place a new structure at world coords
     */
    _placeStructure(defId, x, z) {
        const def = this._structureDefs.find(d => d.id === defId);
        if (!def) {
            // Suppress warning for virtual road cells
            if (defId && defId.endsWith('_path_buildable')) return;
            if (defId === 'concrete_path_buildable') return;
            console.warn(`No buildable def with id ${defId}`);
            return;
        }
        const s = new Structure();
        s.id = `${def.id}_${Date.now()}`;
        s.entityType = 'structure'; s.definitionId = def.id; s.modelId = def.modelId||def.id;
        s.x = x; s.y = def.position?.y||0; s.z = z; s.rotationY = def.rotationY||0; s.scale = def.scale||1;
        // Copy collider data from definition to instance
        s.colliderType = def.colliderType || "";
        s.colliderRadius = def.colliderRadius || 0;
        // Properly populate the ArraySchema for colliderHalfExtents
if (def.colliderHalfExtents && s.colliderHalfExtents) {
    s.colliderHalfExtents.length = 0;
    def.colliderHalfExtents.forEach(v => s.colliderHalfExtents.push(v));
}
        if (!s.colliderType) {
            console.warn(`[BaseGameRoom] WARNING: Placed structure ${s.id} is missing colliderType! colliderType=${s.colliderType}`);
        }
        this.state.structures.set(s.id, s);
        // Mark each cell in the footprint region
        const baseX = Math.floor(x), baseY = Math.floor(z);
        const widthCells = def.scale || 1, heightCells = def.scale || 1;
        for (let ix = 0; ix < widthCells; ix++) {
            for (let iy = 0; iy < heightCells; iy++) {
                this.cityGrid.setCell(baseX + ix, baseY + iy, {
                    structureType: def.structureType,
                    isBuildablePlot: false,
                    structureId: s.id,
                    ownerId: 'city',
                    currentHP: s.health,
                    maxHP: s.maxHealth,
                    width: def.scale,
                    height: def.scale
                });
            }
        }
    }

    // ... (other methods remain unchanged)

    /**
     * Initialize ammo.js physics world and create collision bodies.
     */
    async _initPhysics() {
        // load Ammo module (handles both promise or factory function)
        let Ammo;
        if (typeof ammoModule === 'function') {
            Ammo = await ammoModule();
        } else {
            Ammo = await ammoModule;
        }
        this.Ammo = Ammo;
        // setup collision world
        const config = new Ammo.btDefaultCollisionConfiguration();
        const dispatcher = new Ammo.btCollisionDispatcher(config);
        const broadphase = new Ammo.btDbvtBroadphase();
        const solver = new Ammo.btSequentialImpulseConstraintSolver();
        this.physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, config);
        this.physicsWorld.setGravity(new Ammo.btVector3(0, -9.8, 0));
        this._rigidBodies = new Map();
        // --- Collider utility ---
        const { createColliderForEntity } = require('./colliderFactory');
        const io = new NodeIO();
        const colliderCache = {};
        // Structures will call createColliderForEntity below

        // create a static ground plane at y=0
        const groundShape = new Ammo.btStaticPlaneShape(new Ammo.btVector3(0,1,0), 0);
        const groundTransform = new Ammo.btTransform();
        groundTransform.setIdentity();
        groundTransform.setOrigin(new Ammo.btVector3(0,0,0));
        const groundMotionState = new Ammo.btDefaultMotionState(groundTransform);
        const groundInfo = new Ammo.btRigidBodyConstructionInfo(0, groundMotionState, groundShape, new Ammo.btVector3(0,0,0));
        const groundBody = new Ammo.btRigidBody(groundInfo);
        groundBody.setFriction(0);
        this.physicsWorld.addRigidBody(groundBody);
        this._rigidBodies.set('ground', groundBody);
        // create structure bodies for all structure definitions (best practice: await each collider, update def.colliderHalfExtents)
        await Promise.all(this._structureDefs.map(async (def) => {
            try {
                const shape = await createColliderForEntity(def, Ammo, io, colliderCache);
                // Defensive: if colliderHalfExtents was not set, copy from shape if available
                if (
                    def.colliderType === 'box' &&
                    (!def.colliderHalfExtents || def.colliderHalfExtents.length !== 3) &&
                    shape && shape._computedHalfExtents
                ) {
                    def.colliderHalfExtents = [...shape._computedHalfExtents];
                }
                // Create and register the rigid body as before
                const transform = new Ammo.btTransform();
                transform.setIdentity();
                const px = def.position?.x ?? def.x ?? 0;
                const py = def.position?.y ?? def.y ?? 0;
                const pz = def.position?.z ?? def.z ?? 0;
                transform.setOrigin(new Ammo.btVector3(px, py, pz));
                const motion = new Ammo.btDefaultMotionState(transform);
                const info = new Ammo.btRigidBodyConstructionInfo(0, motion, shape, new Ammo.btVector3(0,0,0));
                const body = new Ammo.btRigidBody(info);
                
                // <<< NEW: Apply local scaling if defined >>>
                const scale = def.scale;
                if (scale && scale !== 1) {
                    const ammoScale = new Ammo.btVector3(scale, scale, scale);
                    body.getCollisionShape().setLocalScaling(ammoScale);
                    // Note: For static bodies (mass=0), inertia update isn't typically needed
                    console.log(`[BaseGameRoom][PhysicsInit] Applied scale ${scale} to static body ${def.id}`);
                }
                // <<< END NEW >>>

                this.physicsWorld.addRigidBody(body);
                this._rigidBodies.set(def.id, body);
            } catch (e) {
                console.error(`[BaseGameRoom] Collider creation failed for ${def.id}: ${e}`);
            }
        }));
        // create dynamic NPC bodies
        for (const id of this.spawnedNPCs) {
            const e = this.state.entities.get(id);
            this._createEntityBody(e);
        }
        // create bodies for existing players
        // TODO: Implement _createPlayerBody if/when player physics is needed
        // this.state.players.forEach(p => this._createPlayerBody(p));

        // --- PATCH: Copy collider data from definitions to structure instances after colliders are generated ---
        for (const [id, s] of this.state.structures.entries()) {
            const def = this._structureDefs.find(d => d.id === s.definitionId);
            if (!def) continue;
            s.colliderType = def.colliderType || "";
            s.colliderRadius = def.colliderRadius || 0;
            // Properly populate the ArraySchema for colliderHalfExtents
if (def.colliderHalfExtents && s.colliderHalfExtents) {
    s.colliderHalfExtents.length = 0;
    def.colliderHalfExtents.forEach(v => s.colliderHalfExtents.push(v));
}
            if (!s.colliderType) {
                console.warn(`[BaseGameRoom] WARNING: Structure ${s.id} is still missing colliderType after patch! colliderType=${s.colliderType}`);
            }
        }
    }

    // create collision body for a structure (box approximation), scale-aware and oriented
    _createStructureBody(def) {
        const Ammo = this.Ammo;
        let shape;
        if (def.collision?.sphere?.radius) {
            shape = new Ammo.btSphereShape(def.collision.sphere.radius * (def.scale || 1));
        } else {
            // Determine base half extents: from explicit collision or defaults
            const base = def.collision?.halfExtents
                ?? ((def.width !== undefined && def.height !== undefined && def.depth !== undefined)
                    ? { x: def.width, y: def.height, z: def.depth }
                    : { x: 1, y: 1, z: 1 });
            // Apply scale factor
            const size = { x: base.x * def.scale, y: base.y * def.scale, z: base.z * def.scale };
            const halfExtents = new Ammo.btVector3(size.x/2, size.y/2, size.z/2);
            shape = new Ammo.btBoxShape(halfExtents);
        }
        // Store collider info for clients
        if (def.collision?.sphere?.radius) {
            def.colliderType = "sphere";
            def.colliderRadius = def.collision.sphere.radius * (def.scale || 1);
            def.colliderHalfExtents = [];
        } else {
            def.colliderType = "box";
            def.colliderRadius = 0;
            const size = def.collision?.halfExtents ?? {x:1,y:1,z:1};
            def.colliderHalfExtents = [size.x, size.y, size.z];
        }

        // Setup transform with rotation and position
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        const angle = def.rotationY ?? 0;
        const quat = new Ammo.btQuaternion(0, Math.sin(angle/2), 0, Math.cos(angle/2));
        transform.setRotation(quat);
        const px = def.position?.x ?? def.x ?? 0;
        const py = def.position?.y ?? def.y ?? 0;
        const pz = def.position?.z ?? def.z ?? 0;
        transform.setOrigin(new Ammo.btVector3(px, py, pz));
        const motion = new Ammo.btDefaultMotionState(transform);
        const info = new Ammo.btRigidBodyConstructionInfo(0, motion, shape, new Ammo.btVector3(0,0,0));

        const body = new Ammo.btRigidBody(info);
        this.physicsWorld.addRigidBody(body);
        this._rigidBodies.set(def.id, body);
    }

    async _createEntityBody(entity) {
        const Ammo = this.Ammo;
        const { createColliderForEntity } = require('./colliderFactory');
        const io = new (require('@gltf-transform/core').NodeIO)();
        const colliderCache = this._colliderCache || (this._colliderCache = {});
        // Default to sphere collider for NPCs if not set
        if (!entity.colliderType) entity.colliderType = 'sphere';
        try {
            const shape = await createColliderForEntity(entity, Ammo, io, colliderCache);
            const transform = new Ammo.btTransform(); transform.setIdentity();
            transform.setOrigin(new Ammo.btVector3(entity.x, entity.y, entity.z));
            // Determine mass: static blocks and sharks get mass=0 (no gravity), others dynamic
            const isStatic = entity.entityType === 'static' || entity.entityType === 'structure' || entity.isStatic;
            const mass = isStatic ? 0 : 1;
            const inertia = new Ammo.btVector3(0,0,0);
            if (mass > 0) shape.calculateLocalInertia(mass, inertia);
            const motion = new Ammo.btDefaultMotionState(transform);
            const info = new Ammo.btRigidBodyConstructionInfo(mass, motion, shape, inertia);
            const body = new Ammo.btRigidBody(info);
            
            // <<< NEW: Apply local scaling if defined >>>
            const scale = entity.scale;
            if (scale && scale !== 1) {
                const ammoScale = new Ammo.btVector3(scale, scale, scale);
                body.getCollisionShape().setLocalScaling(ammoScale);
                // Update inertia for dynamic bodies if mass > 0
                if (mass > 0) {
                    const localInertia = new Ammo.btVector3(0, 0, 0);
                    body.getCollisionShape().calculateLocalInertia(mass, localInertia);
                    body.setMassProps(mass, localInertia);
                    body.updateInertiaTensor();
                }
                 console.log(`[BaseGameRoom][CreateEntityBody] Applied scale ${scale} to body ${entity.id}`);
            }
            // <<< END NEW >>>

            // remove dynamic friction and lock rotation
            body.setFriction(0);
            body.setRollingFriction(0);
            body.setAngularFactor(new Ammo.btVector3(0,0,0));
            // disable deactivation so it never sleeps
            body.setActivationState(4);
            this.physicsWorld.addRigidBody(body);
            this._rigidBodies.set(entity.id, body);
            // Populate collider details for clients
            entity.colliderType = entity.colliderType || 'sphere';
            // Only set colliderRadius for spheres
            if (entity.colliderType === 'sphere') {
                entity.colliderRadius = entity.scale;
            }
            // Do NOT clear colliderHalfExtents here; preserve for client debug mesh
            // if (entity.colliderHalfExtents && entity.colliderHalfExtents.length) {
            //     entity.colliderHalfExtents.splice(0, entity.colliderHalfExtents.length);
            // }
        } catch (e) {
            console.error(`[BaseGameRoom] Collider creation failed for entity ${entity.id}: ${e}`);
        }
    }

    /**
     * Update logic for all entities with modular behavior functions.
     * Handles dirty checking and efficient sync.
     * @param {number} deltaTime Time since last update
     */
    implementationUpdate(deltaTime) {
        // Early game-over check: trigger delayed restart when city center is destroyed
        const city = this.state.structures.get('city_building_center');
        if (city && city.health <= 0 && !this._restartDelayTimer) {
            console.log('[BaseGameRoom] City destroyed, starting 10 second restart delay');
            this._restartDelayTimer = 10.0; // seconds
            // Remove all enemy NPCs immediately
            const toRemove = [];
            this.state.entities.forEach((entity, id) => {
                if (entity.behavior && entity.behavior.name === 'basicEnemyBehavior') {
                    toRemove.push(id);
                }
            });
            toRemove.forEach(id => this.state.entities.delete(id));
            // Remove city center structure and its definition
            this.state.structures.delete('city_building_center');
            this.state.structureDefinitions.delete('city_building_center');
            return;
        }
        // Handle delayed restart
        if (this._restartDelayTimer) {
            this._restartDelayTimer -= deltaTime;
            if (this._restartDelayTimer <= 0) {
                console.log('[BaseGameRoom] Restart delay finished, respawning city center and enemies');
                this._restartDelayTimer = null;
                this.respawnCityAndEnemies();
            }
            return;
        }
        // Timer-based reset after duration
        this._elapsedTime += deltaTime;
        if (this._elapsedTime >= this._gameDuration) {
            console.log('[BaseGameRoom] 1 hour elapsed, restarting cycle');
            this._elapsedTime = 0;
            this.resetGame();
            return;
        }

        // --- Structure Health Check and Removal ---
        const destroyedStructureIds = [];
        this.state.structures.forEach((structure, id) => {
            // Check if health exists and is zero or less
            if (structure.health !== undefined && structure.health <= 0) {
                console.log(`[BaseGameRoom] Structure ${id} detected as destroyed (health: ${structure.health})`);
                destroyedStructureIds.push(id);

                // Clear grid cells occupied by this structure
                if (typeof this.clearCityGridCell === 'function' && typeof this.getGridKey === 'function') {
                    try {
                        const gridSize = 1; // Match grid settings
                        const halfExtentsX = (structure.width / 2) || (gridSize / 2);
                        const halfExtentsZ = (structure.depth / 2) || (gridSize / 2);
                        const startX = Math.floor((structure.x - halfExtentsX) / gridSize);
                        const endX = Math.floor((structure.x + halfExtentsX) / gridSize);
                        const startZ = Math.floor((structure.z - halfExtentsZ) / gridSize);
                        const endZ = Math.floor((structure.z + halfExtentsZ) / gridSize);

                        for (let gx = startX; gx <= endX; gx++) {
                            for (let gz = startZ; gz <= endZ; gz++) {
                                this.clearCityGridCell(worldX, worldZ);
                            }
                        }
                        console.log(`[BaseGameRoom] Cleared city grid cells for destroyed structure ${id}`);
                    } catch (gridError) {
                        console.error(`[BaseGameRoom] Error clearing city grid for destroyed structure ${id}:`, gridError);
                    }
                } else {
                    console.warn("[BaseGameRoom] CityGrid helper methods not found. Skipping grid clear for destroyed structure.");
                }

                // Remove physics body
                if (this.physicsWorld && this._rigidBodies.has(id)) {
                    const body = this._rigidBodies.get(id);
                    this.physicsWorld.removeRigidBody(body);
                    this._rigidBodies.delete(id);
                    console.log(`[BaseGameRoom] Removed physics body for destroyed structure ${id}`);
                }
            }
        });

        // Remove destroyed structures from state AFTER iteration
        destroyedStructureIds.forEach(id => {
            this.state.structures.delete(id);
            console.log(`[BaseGameRoom] Removed destroyed structure ${id} from state.`);
        });
        // --- End Structure Health Check ---

        this.state.entities.forEach((entity, id) => {
            // Universal entity death logic
            if (entity.health !== undefined && entity.health <= 0) {
                if (entity.state !== 'Dying') {
                    entity.state = 'Dying';
                    entity._deathTimer = 1.5; // seconds for dying animation
                } else if (entity._deathTimer !== undefined) {
                    entity._deathTimer -= deltaTime;
                    if (entity._deathTimer <= 0) {
                        this.state.entities.delete(id);
                        return; // Skip further updates for this entity
                    }
                }
                return; // Don't process behavior if dying
            }
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
                    let dirty = false;
                    if (updates.x !== undefined && updates.x !== prev.x) { entity.x = updates.x; dirty = true; }
                    if (updates.y !== undefined && updates.y !== prev.y) { entity.y = updates.y; dirty = true; }
                    if (updates.z !== undefined && updates.z !== prev.z) { entity.z = updates.z; dirty = true; }
                    if (updates.rotationY !== undefined && updates.rotationY !== prev.rotationY) { entity.rotationY = updates.rotationY; dirty = true; }
                    if (updates.state !== undefined && updates.state !== prev.state) { entity.state = updates.state; dirty = true; }
                    // Optionally, only broadcast or log if dirty
                    // if (dirty) console.log(`[NPC ${entity.id}] State changed, syncing to clients.`);
                }
            }
        });

        // step physics simulation and sync positions
        if (this.physicsWorld) {
            // alias Ammo from initialized module
            const Ammo = this.Ammo;
            this.physicsWorld.stepSimulation(deltaTime, 10);
            // reuse single transform to prevent Ammo.js memory growth
            if (!this._tmpTransform) {
                this._tmpTransform = new Ammo.btTransform();
            }
            const tmpTransform = this._tmpTransform;
            this._rigidBodies.forEach((body, id) => {
                const ms = body.getMotionState(); if (!ms) return;
                ms.getWorldTransform(tmpTransform);
                const t = tmpTransform;
                const o = t.getOrigin();
                if (this.state.entities.has(id)) {
                    const e = this.state.entities.get(id);
                    e.x = o.x(); e.y = o.y(); e.z = o.z();
                } else if (this.state.structures.has(id)) {
                    const s = this.state.structures.get(id);
                    s.x = o.x(); s.y = o.y(); s.z = o.z();
                } else if (this.state.players.has(id)) {
                    const p = this.state.players.get(id);
                    p.x = o.x(); p.y = o.y(); p.z = o.z();
                }
            });
        }
    }

    // ... (other methods remain unchanged)

    /**
     * Reset the game by clearing state and reinitializing
     */
    resetGame() {
        console.log('[BaseGameRoom] City destroyed, restarting cycle');
        // For compatibility: immediately remove enemies and city, then respawn (used for timer-based reset)
        const toRemove = [];
        this.state.entities.forEach((entity, id) => {
            if (entity.behavior && entity.behavior.name === 'basicEnemyBehavior') {
                toRemove.push(id);
            }
        });
        toRemove.forEach(id => this.state.entities.delete(id));
        this.state.structures.delete('city_building_center');
        this.state.structureDefinitions.delete('city_building_center');
        this.respawnCityAndEnemies();
    }
    respawnCityAndEnemies() {
        // Respawn city center
        const cityDef = this._structureDefs.find(def => def.id === 'city_building_center');
        if (cityDef) {
            const s = new Structure();
            s.id = cityDef.id;
            s.entityType = 'structure'; s.definitionId = cityDef.id; s.modelId = cityDef.modelId||cityDef.id;
            s.x = cityDef.position.x;
            s.y = cityDef.position.y;
            s.z = cityDef.position.z;
            s.rotationY = cityDef.rotationY || 0;
            s.scale = cityDef.scale || 1;
            s.health = cityDef.health !== undefined ? cityDef.health : s.health;
            s.maxHealth = cityDef.maxHealth !== undefined ? cityDef.maxHealth : s.maxHealth;
            this.state.structures.set(s.id, s);

            const defSchema = new StructureDefinition();
            defSchema.id = cityDef.id;
            defSchema.structureType = cityDef.structureType;
            defSchema.modelPath = cityDef.modelPath;
            defSchema.positionX = cityDef.position.x;
            defSchema.positionY = cityDef.position.y;
            defSchema.positionZ = cityDef.position.z;
            defSchema.rotationY = cityDef.rotationY || 0;
            defSchema.scale = cityDef.scale || 1;
            defSchema.buildable = cityDef.buildable;
            this.state.structureDefinitions.set(defSchema.id, defSchema);
        }
        // Respawn enemies
        const enemyDefs = this._npcDefs.filter(def => def.behavior && def.behavior.name === 'basicEnemyBehavior');
        enemyDefs.forEach(def => {
            const e = new BaseEntity();
            e.id = def.id;
            e.entityType = def.type || 'npc';
            e.definitionId = def.id;
            e.modelId = def.modelId || def.id;
            e.x = def.x || 0;
            e.y = def.y || 0;
            e.z = def.z || 0;
            e.rotationY = def.rotationY || 0;
            e.scale = def.scale !== undefined ? def.scale : 1;
            e.health = def.health !== undefined ? def.health : e.health;
            e.maxHealth = def.maxHealth !== undefined ? def.maxHealth : e.maxHealth;
            e.speed = def.speed !== undefined ? def.speed : e.speed;
            e.attackDamage = def.attackDamage !== undefined ? def.attackDamage : e.attackDamage;
            if (def.attackDamage === undefined) {
                console.warn(`[SPAWN] Enemy ${e.id} has no attackDamage in definition, using fallback: ${e.attackDamage}`);
            } else {

            }
            if (def.behavior) e.behavior = def.behavior;
            if (def.animationMap) {
                for (const [k, v] of Object.entries(def.animationMap)) {
                    e.animationMap.set(k, v);
                }
            }
            this.state.entities.set(e.id, e);
        });
    }
}

module.exports = { BaseGameRoom }; 
