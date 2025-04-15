// Modular NPC/entity definitions for Default implementation
// Each NPC/entity can define its id, type, position, rotation, initial state, and behavior function

// Reusable Animation Map for Robokeeper
const robokeeperAnimationMap = {
    'Armature.001|mixamo.com|Layer0': 'Idle',
    'Armature.002|mixamo.com|Layer0': 'Die',
    'Armature.003|mixamo.com|Layer0': 'Walk',
};

// Reusable Behavior Function for Robokeeper (simple follow)
function robokeeperBehavior(entity, deltaTime, roomState) {
    const speed = 1.5; // units per second
    const stopDistance = 1.5; // how close the NPC gets before stopping
    const stopDistanceSq = stopDistance * stopDistance; // Use squared distance for comparison

    let nearestPlayer = null;
    let minDistSq = Infinity;

    // Throttle logging for behavior checks
    const now = Date.now();
    const logThrottle = 2000; // ms
    if (!entity._lastBehaviorLogTime) entity._lastBehaviorLogTime = 0;
    const shouldLogBehavior = now - entity._lastBehaviorLogTime > logThrottle;

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

    if (shouldLogBehavior) {
        const playerCount = roomState?.players?.size || 0;
        console.log(`[NPC ${entity.id} Behavior] Update Check: Found ${playerCount} players. Nearest player: ${nearestPlayer ? nearestPlayer.id : 'None'}. MinDistSq: ${minDistSq.toFixed(2)}`);
        entity._lastBehaviorLogTime = now;
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
        const newX = entity.x + nx * speed * deltaTime;
        const newZ = entity.z + nz * speed * deltaTime;
        const newRotationY = Math.atan2(nx, nz);
        newState = 'Walk';
        updates = { x: newX, z: newZ, rotationY: newRotationY, state: newState };

    } else if (nearestPlayer) {
        // Player is close, face them but stay Idle
        const dx = nearestPlayer.x - entity.x;
        const dz = nearestPlayer.z - entity.z;
        const newRotationY = Math.atan2(dx, dz);
        newState = 'Idle';
        if (newState !== entity.state || Math.abs(newRotationY - entity.rotationY) > 0.01) {
            updates = { rotationY: newRotationY, state: newState };
        }
    }

    // Update state if needed and no other updates occurred
    if (!updates && newState !== entity.state) {
        updates = { state: newState };
    }

    // Log state change if it occurs
    if (updates && updates.state && updates.state !== entity.state) {
        console.log(`[NPC ${entity.id} Behavior] State WILL CHANGE to: ${updates.state}`);
    } else if (!updates && newState === entity.state) {
        // Log periodically even if state doesn't change (throttled)
        if (!entity._lastStateLogTime) entity._lastStateLogTime = 0;
        if (now - entity._lastStateLogTime > logThrottle) {
            console.log(`[NPC ${entity.id} Behavior] State remains: ${entity.state}`);
            entity._lastStateLogTime = now;
        }
    }

    return updates;
}

const npcDefinitions = [
    {
        id: 'robokeeper1',      // Original instance
        type: 'npc',
        modelId: 'robokeeper1', // Model file to load
        x: 5, y: 0, z: 5, rotationY: Math.PI / 2,
        state: 'Idle',
        animationMap: robokeeperAnimationMap, // Use reusable map
        behavior: robokeeperBehavior         // Use reusable behavior
    },
    { // --- NEW INSTANCE ---
        id: 'robokeeper_guard2', // New unique instance ID
        type: 'npc',
        modelId: 'robokeeper1', // Reuse the SAME model
        x: -8, y: 0, z: -3, rotationY: 0, // Different starting position/rotation
        state: 'Idle',                  // Start Idle
        animationMap: robokeeperAnimationMap, // Reuse the SAME map
        behavior: robokeeperBehavior         // Reuse the SAME behavior
    },
    { // --- SPINNING HOVER CUBE (Centered) ---
        id: 'hover_cube',       // Unique instance ID, matches model file
        type: 'entity',         // Static entity
        modelId: 'hover_cube',  // Model file to load (expects client/assets/models/hover_cube.glb)
        x: 0, y: 2, z: 0,       // POSITION: Centered horizontally, hovering
        rotationY: 0,
        state: 'Idle',          // Default state
        animationMap: {},       // No animations
        // BEHAVIOR: Add spinning logic
        behavior: function(entity, deltaTime) {
            const rotationSpeed = 0.5; // Radians per second
            let newRotationY = entity.rotationY + rotationSpeed * deltaTime;
            // Keep rotation within 0 to 2*PI range (optional, but good practice)
            newRotationY %= (Math.PI * 2);
            return { rotationY: newRotationY }; // Return the update
        }
    }
    // Datacenter definition explicitly removed.
    // Add more NPC/entity definitions here for Default implementation
];

module.exports = { npcDefinitions };
