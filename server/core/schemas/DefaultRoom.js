const { BaseRoom } = require("../BaseRoom");
const { BaseEntity } = require('./BaseEntity'); // Import BaseEntity

/**
 * Default Room
 * Basic implementation with box players
 */
class DefaultRoom extends BaseRoom {
    /**
     * Initialize the default room implementation
     * @param {Object} options Room creation options
     */
    initializeImplementation(options) {
        console.log("Default room implementation initialized");
        
        // Update game config
        this.state.gameConfig.implementation = "default";
        
        // --- Load modular NPC/entity definitions from implementation ---
        let npcDefs = [];
        try {
            npcDefs = require('../../implementations/default/npcs').npcDefinitions;
        } catch (e) {
            console.error('Failed to load NPC definitions for implementation:', e);
        }
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
            this.state.entities.set(entity.id, entity);
            console.log(`[DefaultRoom] Created entity: ${entity.id} type=${entity.type} at (${entity.x}, ${entity.y}, ${entity.z})`);
        });
        
        // Everything else is handled by BaseRoom
    }
    
    /**
     * Default implementation update logic is not needed
     * BaseRoom handles all necessary functionality
     * @param {number} deltaTime Time since last update
     */
    implementationUpdate(deltaTime) {
        // Call modular behavior for each entity if defined
        this.state.entities.forEach(entity => {
            if (typeof entity.behavior === 'function') {
                entity.behavior(entity, deltaTime);
            }
        });
    }
    
    /**
     * Default player setup - just basic box
     * @param {Player} player The player object
     * @param {Client} client The client that joined
     * @param {Object} options Join options
     * @returns {Player} The player object
     */
    setupPlayer(player, client, options) {
        // Set player name
        player.name = options.name || client.sessionId;
        
        // Set a default color
        player.color = "#" + Math.floor(Math.random()*16777215).toString(16);
        
        return player;
    }
}

module.exports = { DefaultRoom }; 