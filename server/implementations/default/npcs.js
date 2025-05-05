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
        // console.log(`[NPC ${entity.id} Behavior] Update Check: Found ${playerCount} players. Nearest player: ${nearestPlayer ? nearestPlayer.id : 'None'}. MinDistSq: ${minDistSq.toFixed(2)}`);
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
        // console.log(`[NPC ${entity.id} Behavior] State WILL CHANGE to: ${updates.state}`);
    } else if (!updates && newState === entity.state) {
        // Log periodically even if state doesn't change (throttled)
        if (!entity._lastStateLogTime) entity._lastStateLogTime = 0;
        if (now - entity._lastStateLogTime > logThrottle) {
            // console.log(`[NPC ${entity.id} Behavior] State remains: ${entity.state}`);
            entity._lastStateLogTime = now;
        }
    }

    return updates;
}

// Shark behavior: move randomly within a 3D bounding box (no player tracking)
function sharkBehavior(entity, deltaTime, roomState) {
    const speed = 6.0;
    // Define map bounds (can be adjusted)
    const bounds = {
        minX: -40, maxX: 40,
        minY: 10, maxY: 40,
        minZ: -40, maxZ: 40
    };
    // Pick or keep a random target
    if (!entity._randomTarget) {
        entity._randomTarget = {
            x: Math.random() * (bounds.maxX - bounds.minX) + bounds.minX,
            y: Math.random() * (bounds.maxY - bounds.minY) + bounds.minY,
            z: Math.random() * (bounds.maxZ - bounds.minZ) + bounds.minZ
        };
    }
    // Compute distance to target
    const dx = entity._randomTarget.x - entity.x;
    const dy = (entity._randomTarget.y || 0) - (entity.y || 0);
    const dz = entity._randomTarget.z - entity.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    // If close to target, pick a new one
    if (distSq < 1.0) {
        entity._randomTarget = {
            x: Math.random() * (bounds.maxX - bounds.minX) + bounds.minX,
            y: Math.random() * (bounds.maxY - bounds.minY) + bounds.minY,
            z: Math.random() * (bounds.maxZ - bounds.minZ) + bounds.minZ
        };
        return { state: 'Idle' };
    }
    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const ny = dy / dist;
    const nz = dz / dist;
    const newX = entity.x + nx * speed * deltaTime;
    const newY = (entity.y || 0) + ny * speed * deltaTime;
    const newZ = entity.z + nz * speed * deltaTime;
    const newRotationY = Math.atan2(nx, nz);
    return { x: newX, y: newY, z: newZ, rotationY: newRotationY, state: 'Walk' };
}

// Basic ground enemy behavior: chase & attack city center
function basicEnemyBehavior(entity, deltaTime, roomState) {
    const target = roomState.structures.get('city_building_center');
    if (!target) return null;
    const dx = target.x - entity.x;
    const dz = target.z - entity.z;
    const distSq = dx*dx + dz*dz;
    const attackRange = 2;
    if (distSq <= attackRange*attackRange) {
        if (!entity._attackCooldown) entity._attackCooldown = 0;
        entity._attackCooldown -= deltaTime;
        if (entity._attackCooldown <= 0) {
            target.health -= entity.attackDamage;
            entity._attackCooldown = 1;

        }
        return { state: 'Attack' };
    }
    const dist = Math.sqrt(distSq) || 1;
    const nx = dx / dist;
    const nz = dz / dist;
    const newX = entity.x + nx * entity.speed * deltaTime;
    const newZ = entity.z + nz * entity.speed * deltaTime;
    const newRotationY = Math.atan2(nx, nz);
    return { x: newX, z: newZ, rotationY: newRotationY, state: 'Walk' };
}

// NPC definitions array
const npcDefinitions = [
    // 10 basic ground enemy NPCs coming from all sides
    ...Array.from({length: 10}, (_, i) => {
        // Random angle and distance from center
        const angle = Math.random() * Math.PI * 2;
        const distance = 60 + Math.random() * 20; // 60-80 units from center
        const x = Math.round(Math.cos(angle) * distance);
        const z = Math.round(Math.sin(angle) * distance);
        return {
            id: `ground_enemy${i+1}`,
            type: 'npc',
            modelId: 'robokeeper1',
            x: x, y: 0, z: z, rotationY: angle,
            scale: 1,
            health: 100,
            maxHealth: 100,
            speed: 2,
            attackDamage: 1,
            state: 'Walk',
            animationMap: robokeeperAnimationMap,
            behavior: basicEnemyBehavior
        };
    }),
    {
        id: 'robokeeper1',      // Original instance
        type: 'npc',
        modelId: 'robokeeper1', // Model file to load
        x: 5, y: 0, z: 5, rotationY: Math.PI / 2,
        scale: 0.8, // 
        state: 'Walk',
        animationMap: robokeeperAnimationMap, // Use reusable map
        job: 'cityArchitect'                 // Generates plan
    },
    { // --- NEW INSTANCE ---
        id: 'robokeeper_guard2', // New unique instance ID
        type: 'npc',
        modelId: 'robokeeper1', // Reuse the SAME model
        x: -8, y: 0, z: -3, rotationY: 0, // Different starting position/rotation
        scale: 0.8, // 
        state: 'Walk',                  // Start Walk
        animationMap: robokeeperAnimationMap, // Reuse the SAME map
        job: 'cityBuilder',                  // Executes plan
        speed: 100,                          // Fast builder
    },
    /* // Test NPC - Commented out
    {
        id: 'test_keeper', // New ID
        type: 'npc', // Changed type
        modelId: 'robokeeper1', // Use existing model
        x: 0, y: 2, z: 0, rotationY: 0, // Same position as hover_cube
        scale: 0.8, // Same scale as other robokeepers
        state: 'Idle', // Initial state
        behavior: null, // No specific behavior for this test
        animationMap: { // Copy from robokeeper1
            'CharacterArmature|Idle': 'Idle',
            'CharacterArmature|Walk': 'Walk',
            'CharacterArmature|Run': 'Run'
        }
    }
    */
    // --- 50 Cubes in the Sky ---
    ...Array.from({length: 50}, (_, i) => ({
        id: `hover_cube_${i}`,
        type: 'entity',
        modelId: 'hover_cube',
        x: (i % 10) * 4 - 18, // Spread in grid, center at 0
        y: 20 + Math.floor(i / 10) * 2, // 5 rows, 2 units apart vertically
        z: Math.floor(i / 10) * 8 - 16, // 5 rows, 8 units apart in z
        rotationY: 0,
        scale: 1.5,
        state: null,
        behavior: null,
        animationMap: null
    })),
    // --- 5 Robot Shark NPCs in the Sky ---
    // --- Shark Behavior: Fast, 3D movement ---
    ...Array.from({length: 5}, (_, i) => ({
        id: `robot_shark1_${i}`,
        type: 'npc',
        modelId: 'robot_shark1',
        x: i * 8 - 16, // Spread out horizontally
        y: 30,
        z: 20,
        rotationY: 0,
        scale: 2.0,
        state: null,
        behavior: sharkBehavior, // Custom shark behavior
        animationMap: null // No animations
    })),
    /* // Original hover_cube definition - Commented out as it's defined as buildable in structures.js
    {
        id: 'hover_cube',
        type: 'entity',
        modelId: 'hover_cube',
        x: 0, y: 2, z: 0, rotationY: 0,
        scale: 1,
        state: null,
        behavior: null,
        animationMap: null
    }
    */
];

module.exports = { npcDefinitions };
