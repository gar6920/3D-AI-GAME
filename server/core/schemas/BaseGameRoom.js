const { BaseRoom } = require("../BaseRoom");
const { BaseEntity } = require('./BaseEntity'); // Import BaseEntity
const { Structure } = require('./Structure'); // Import Structure
const { StructureDefinition } = require('./StructureDefinition'); // Import structure def schema

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
        // Try to require npcDefinitions from the implementation if not already present
        let npcDefs;
        try {
            npcDefs = require('../../implementations/default/npcs').npcDefinitions;
            console.log(`[BaseGameRoom] Loaded npcDefinitions: ${npcDefs.map(n => n.id).join(', ')}`);
        } catch (e) {
            console.warn('[BaseGameRoom] Could not load npcDefinitions:', e);
            npcDefs = [];
        }
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
            const impl = require('../../implementations/default/index');
            if (typeof impl.getStructureDefinitions === 'function') {
                structDefs = impl.getStructureDefinitions();
            } else {
                structDefs = require('../../implementations/default/structures').structureDefinitions;
            }
        } catch (e) {
            console.warn('[BaseGameRoom] Could not load structureDefinitions:', e);
            structDefs = [];
        }
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
    }

    /**
     * Update logic for all entities with modular behavior functions.
     * Handles dirty checking and efficient sync.
     * @param {number} deltaTime Time since last update
     */
    implementationUpdate(deltaTime) {
        this.state.entities.forEach(entity => {
            if (typeof entity.behavior === 'function') {
                const prev = {
                    x: entity.x,
                    z: entity.z,
                    rotationY: entity.rotationY,
                    state: entity.state
                };
                const updates = entity.behavior(entity, deltaTime, this.state);
                // Only apply and sync if a property changed (dirty checking)
                if (updates) {
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
    }

    // ... (other methods remain unchanged)
}

module.exports = { BaseGameRoom }; 
