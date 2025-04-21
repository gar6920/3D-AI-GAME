const { BaseRoom } = require("./BaseRoom");
const { BaseEntity } = require('./schemas/BaseEntity'); 
const { Structure } = require('./schemas/Structure'); 
const { StructureDefinition } = require('./schemas/StructureDefinition'); 
const ammoModule = require('ammo.js');

/**
 * BaseGameRoom
 * Core room logic for all implementations.
 * This file should not contain any implementation-specific code.
 * Implementation rooms can extend or use this as a base.
 */
class BaseGameRoom extends BaseRoom {
    // Initialize the default room implementation
    initializeImplementation(options) {
        // Add logging for initialization
        console.log('[BaseGameRoom] initializeImplementation called');
        this._initOptions = options; // Save init options for game reset
        // Try to require npcDefinitions from the implementation if not already present
        let npcDefs;
        try {
            npcDefs = require('../implementations/default/npcs').npcDefinitions;
            console.log(`[BaseGameRoom] Loaded npcDefinitions: ${npcDefs.map(n => n.id).join(', ')}`);
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
            if (def.attackDamage === undefined) {
                console.warn(`[SPAWN] Enemy ${entity.id} has no attackDamage in definition, using fallback: ${entity.attackDamage}`);
            } else {

            }
            if (def.behavior) entity.behavior = def.behavior;

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
        this._staticStructDefs = structDefs.filter(def => def.buildable === false); // Store static ones
        this.spawnedStructures = [];

        // Spawn ONLY static structures (buildable: false)
        structDefs.forEach(def => {
            if (def.buildable === false) {
                console.log(`[BaseGameRoom] Spawning static structure: ${def.id}`);
                const s = new Structure();
                s.id = def.id; // Use definition ID as instance ID for static items
                s.entityType = 'structure';
                s.definitionId = def.id;
                s.modelId = def.modelId || (def.modelPath ? def.modelPath.split('/').pop().replace('.glb', '') : def.id);
                s.x = def.position.x;
                s.y = def.position.y;
                s.z = def.position.z;
                s.rotationY = def.rotationY || 0;
                s.scale = def.scale || 1;
                // Ensure health/maxHealth from definition
                if (def.health !== undefined) s.health = def.health;
                if (def.maxHealth !== undefined) s.maxHealth = def.maxHealth;
                this.state.structures.set(s.id, s);
                this.spawnedStructures.push(s.id);
            }
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

        // initialize ammo.js physics world and collision bodies
        this._initPhysics();
    }

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
        // create static structure bodies
        for (const def of this._staticStructDefs) {
            this._createStructureBody(def);
        }
        // create dynamic NPC bodies
        for (const id of this.spawnedNPCs) {
            const e = this.state.entities.get(id);
            this._createEntityBody(e);
        }
        // create bodies for existing players
        this.state.players.forEach(p => this._createPlayerBody(p));
    }

    // create collision body for a structure (box approximation)
    _createStructureBody(def) {
        const Ammo = this.Ammo;
        // use optional collision halfExtents or fallback to uniform scale
        const size = def.collision?.halfExtents ?? { x: def.scale, y: def.scale, z: def.scale };
        const halfExtents = new Ammo.btVector3(size.x/2, size.y/2, size.z/2);
        const shape = new Ammo.btBoxShape(halfExtents);
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(def.position.x, def.position.y, def.position.z));
        const motion = new Ammo.btDefaultMotionState(transform);
        const info = new Ammo.btRigidBodyConstructionInfo(0, motion, shape, new Ammo.btVector3(0,0,0));
        const body = new Ammo.btRigidBody(info);
        this.physicsWorld.addRigidBody(body);
        this._rigidBodies.set(def.id, body);
    }

    // sphere collider for NPC/entity
    _createEntityBody(entity) {
        const Ammo = this.Ammo;
        const shape = new Ammo.btSphereShape(entity.scale);
        const transform = new Ammo.btTransform(); transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(entity.x, entity.y, entity.z));
        const inertia = new Ammo.btVector3(0,0,0);
        shape.calculateLocalInertia(1, inertia);
        const motion = new Ammo.btDefaultMotionState(transform);
        const info = new Ammo.btRigidBodyConstructionInfo(1, motion, shape, inertia);
        const body = new Ammo.btRigidBody(info);
        // remove dynamic friction and lock rotation
        body.setFriction(0);
        body.setRollingFriction(0);
        body.setAngularFactor(new Ammo.btVector3(0,0,0));
        // disable deactivation so it never sleeps
        body.setActivationState(4);
        this.physicsWorld.addRigidBody(body);
        this._rigidBodies.set(entity.id, body);
    }

    // sphere collider for players
    _createPlayerBody(player) {
        const Ammo = this.Ammo;
        const shape = new Ammo.btSphereShape(player.scale || 1);
        const transform = new Ammo.btTransform(); transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(player.x, player.y, player.z));
        const inertia = new Ammo.btVector3(0,0,0);
        shape.calculateLocalInertia(1, inertia);
        const motion = new Ammo.btDefaultMotionState(transform);
        const info = new Ammo.btRigidBodyConstructionInfo(1, motion, shape, inertia);
        const body = new Ammo.btRigidBody(info);
        // remove dynamic friction and lock rotation
        body.setFriction(0);
        body.setRollingFriction(0);
        body.setAngularFactor(new Ammo.btVector3(0,0,0));
        // disable deactivation so it never sleeps
        body.setActivationState(4);
        this.physicsWorld.addRigidBody(body);
        this._rigidBodies.set(player.id, body);
    }

    // add player physics body on join
    onJoin(client, options) {
        super.onJoin(client, options);
        const player = this.state.players.get(client.sessionId);
        if (player && this.physicsWorld) this._createPlayerBody(player);
    }

    // remove physics body on leave
    onLeave(client) {
        super.onLeave(client);
        const body = this._rigidBodies.get(client.sessionId);
        if (body) {
            this.physicsWorld.removeRigidBody(body);
            this._rigidBodies.delete(client.sessionId);
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
        const cityDef = this._staticStructDefs.find(def => def.id === 'city_building_center');
        if (cityDef) {
            const s = new Structure();
            s.id = cityDef.id;
            s.entityType = 'structure';
            s.definitionId = cityDef.id;
            s.modelId = cityDef.modelId || (cityDef.modelPath ? cityDef.modelPath.split('/').pop().replace('.glb', '') : cityDef.id);
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
