// Modular NPC/entity definitions for Default implementation
// Each NPC/entity can define its id, type, position, rotation, initial state, and behavior function

const npcDefinitions = [
    {
        id: 'robokeeper1',
        type: 'npc',
        x: 5,
        y: 0,
        z: 5,
        rotationY: Math.PI / 2,
        state: 'Idle',
        // Optionally, define a behavior function for server-side animation/state
        behavior: function(entity, deltaTime, roomState) {
            const speed = 1.5; // units per second
            const stopDistance = 1.5; // how close the NPC gets before stopping
            const stopDistanceSq = stopDistance * stopDistance; // Use squared distance for comparison

            let nearestPlayer = null;
            let minDistSq = Infinity;

            // Add logging inside the behavior function
            const hasRoomState = !!roomState;
            const hasPlayers = hasRoomState && !!roomState.players;
            const playerCount = hasPlayers ? roomState.players.size : 0;
            // console.log(`[NPC ${entity.id} Behavior] Update Start. Has roomState: ${hasRoomState}, Has players: ${hasPlayers}, Player count: ${playerCount}`); // Throttled log below

            // Find nearest player
            if (roomState && roomState.players) {
                roomState.players.forEach(player => {
                    const dx = player.x - entity.x;
                    const dz = player.z - entity.z;
                    const distSq = dx * dx + dz * dz;
                    if (distSq < minDistSq) {
                        minDistSq = distSq;
                        nearestPlayer = player;
                    }
                });
            }

            // Throttle detailed logs to avoid spamming
            if (!entity._lastBehaviorLogTime || Date.now() - entity._lastBehaviorLogTime > 2000) { 
                console.log(`[NPC ${entity.id} Behavior] Update Check: Found ${playerCount} players. Nearest player: ${nearestPlayer ? nearestPlayer.id : 'None'}. MinDistSq: ${minDistSq.toFixed(2)}`);
                entity._lastBehaviorLogTime = Date.now();
            }

            let newState = 'Idle'; // Default state
            let updates = null; // Object to hold calculated updates

            if (nearestPlayer && minDistSq > stopDistanceSq) {
                // Move towards nearest player
                const dx = nearestPlayer.x - entity.x;
                const dz = nearestPlayer.z - entity.z;
                const dist = Math.sqrt(minDistSq);

                const nx = dx / dist; // Normalized direction x
                const nz = dz / dist; // Normalized direction z

                // Calculate new position
                const newX = entity.x + nx * speed * deltaTime;
                const newZ = entity.z + nz * speed * deltaTime;

                // Calculate new rotation to face the player
                const newRotationY = Math.atan2(nx, nz);

                newState = 'Walk';

                updates = { x: newX, z: newZ, rotationY: newRotationY, state: newState };

            } else if (nearestPlayer) {
                // Player is close, face them but stay Idle
                const dx = nearestPlayer.x - entity.x;
                const dz = nearestPlayer.z - entity.z;
                const newRotationY = Math.atan2(dx, dz);
                newState = 'Idle';

                // Only update rotation and state if needed
                if (newState !== entity.state || Math.abs(newRotationY - entity.rotationY) > 0.01) {
                    updates = { rotationY: newRotationY, state: newState };
                }

            }

            // Log the determined state before applying
            // console.log(`[NPC ${entity.id} Behavior] Determined State: ${newState}. Current State: ${entity.state}`); // Throttled log below

            // Return the calculated updates (or null if nothing changed and no movement required)
            // Add state update to 'updates' object if only state needs changing
            if (!updates && newState !== entity.state) {
                updates = { state: newState };
            }

            // Log state change if updates contains a new state
            if (updates && updates.state && updates.state !== entity.state) {
                console.log(`[NPC ${entity.id} Behavior] State WILL CHANGE to: ${updates.state}`);
            } else if (!updates && newState === entity.state) {
                // Log periodically even if state doesn't change (throttled)
                if (!entity._lastStateLogTime || Date.now() - entity._lastStateLogTime > 2000) {
                    console.log(`[NPC ${entity.id} Behavior] State remains: ${entity.state}`);
                    entity._lastStateLogTime = Date.now();
                }
            }

            return updates;
        }
    },
    {
        id: 'datacenter1',
        type: 'entity',
        x: 0,
        y: 0,
        z: -5,
        rotationY: 0,
        state: 'Idle',
        behavior: function(entity, deltaTime) {
            // Example: datacenter could pulse or animate
            if (!entity.behaviorTimer) entity.behaviorTimer = 0;
            entity.behaviorTimer += deltaTime;
            // Simple pulse animation
            const pulse = 1 + 0.1 * Math.sin(entity.behaviorTimer / 500);
            entity.pulse = pulse;
        }
    }
    // Add more NPC/entity definitions here for Default implementation
];

module.exports = { npcDefinitions };
