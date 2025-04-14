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
        
        // --- Add the Robokeeper NPC --- 
        const npcId = 'robokeeper1';
        const npc = new BaseEntity();
        npc.id = npcId;
        npc.type = 'npc'; // Crucial for server-side logic in BaseRoom update
        npc.x = 5; // Example starting position
        npc.y = 0;
        npc.z = 5;
        npc.rotationY = Math.PI / 2; // Example rotation (facing +X)
        npc.state = 'Idle'; // Initial state for the server

        // Add the NPC to the room's entity state
        this.state.entities.set(npcId, npc);
        console.log(`[DefaultRoom] Created NPC: ${npcId} at (${npc.x}, ${npc.y}, ${npc.z})`);
        
        // Note: BaseRoom's update loop will call _initializeNpcState for this entity later
        
        // Everything else is handled by BaseRoom
    }
    
    /**
     * Default implementation update logic is not needed
     * BaseRoom handles all necessary functionality
     * @param {number} deltaTime Time since last update
     */
    implementationUpdate(deltaTime) {
        // Update NPC behavior for robokeeper1
        const npcId = 'robokeeper1';
        const npc = this.state.entities.get(npcId);
        if (npc && npc.type === 'npc') {
            // Simple state machine for NPC behavior
            if (!npc.behaviorTimer) {
                npc.behaviorTimer = 0;
            }
            npc.behaviorTimer += deltaTime;
            const cycleTime = 10000; // 10 seconds per full cycle
            const phase = (npc.behaviorTimer % cycleTime) / cycleTime;
            let newState = npc.state;
            // Change state based on time phase
            if (phase < 0.3) {
                newState = 'Idle';
            } else if (phase < 0.6) {
                newState = 'Walk';
                // Move during walking phase
                const time = npc.behaviorTimer / 1000; // Slow time factor
                const radius = 3.0;
                npc.x = 5 + Math.sin(time) * radius;
                npc.z = 5 + Math.cos(time) * radius;
                npc.rotationY = Math.atan2(Math.cos(time) * radius, -Math.sin(time) * radius);
            } else if (phase < 0.8) {
                newState = 'Run';
                // Faster movement during running
                const time = npc.behaviorTimer / 500; // Faster time factor
                const radius = 4.0;
                npc.x = 5 + Math.sin(time) * radius;
                npc.z = 5 + Math.cos(time) * radius;
                npc.rotationY = Math.atan2(Math.cos(time) * radius, -Math.sin(time) * radius);
            } else if (phase < 0.9) {
                newState = 'Die';
            } else {
                newState = 'Fix';
            }
            // Update state if changed
            if (newState !== npc.state) {
                npc.state = newState;
                console.log(`[DefaultRoom] Updated NPC ${npcId} state to ${newState}`);
            }
        }
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