const { BaseRoom } = require("../BaseRoom");
const { BaseEntity } = require('./BaseEntity'); // Import BaseEntity

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
            const entity = new BaseEntity();
            entity.id = def.id;
            entity.type = def.type;
            entity.x = def.x;
            entity.y = def.y;
            entity.z = def.z;
            entity.rotationY = def.rotationY;
            entity.state = def.state;
            if (def.behavior) entity.behavior = def.behavior;
            this.state.entities.set(def.id, entity);
            this.spawnedNPCs.push(def.id);
            console.log(`[BaseGameRoom] Spawned NPC: ${def.id} at (${def.x}, ${def.y}, ${def.z})`);
        });
        // Log all entities in state after spawning
        console.log('[BaseGameRoom] Entities after NPC spawn:', Array.from(this.state.entities.keys()));
    }

    /**
     * Update logic for all entities with modular behavior functions.
     * Handles dirty checking and efficient sync.
     * @param {number} deltaTime Time since last update
     */
    implementationUpdate(deltaTime) {
        // Log if robokeeper1 is present in state
        if (this.state.entities.has('robokeeper1')) {
            const robokeeper = this.state.entities.get('robokeeper1');
            if (!robokeeper._lastLogTime || Date.now() - robokeeper._lastLogTime > 2000) {
                console.log(`[BaseGameRoom] robokeeper1 state: x=${robokeeper.x}, y=${robokeeper.y}, z=${robokeeper.z}, state=${robokeeper.state}`);
                robokeeper._lastLogTime = Date.now();
            }
        } else {
            console.warn('[BaseGameRoom] robokeeper1 is NOT present in state.entities!');
        }
        // Call modular behavior for each entity if defined
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
