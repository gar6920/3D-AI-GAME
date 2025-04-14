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
        behavior: function(entity, deltaTime) {
            if (!entity.behaviorTimer) entity.behaviorTimer = 0;
            entity.behaviorTimer += deltaTime;
            const cycleTime = 10000;
            const phase = (entity.behaviorTimer % cycleTime) / cycleTime;
            let newState = entity.state;
            if (phase < 0.3) {
                newState = 'Idle';
            } else if (phase < 0.6) {
                newState = 'Walk';
                const time = entity.behaviorTimer / 1000;
                const radius = 3.0;
                entity.x = 5 + Math.sin(time) * radius;
                entity.z = 5 + Math.cos(time) * radius;
                entity.rotationY = Math.atan2(Math.cos(time) * radius, -Math.sin(time) * radius);
            } else if (phase < 0.8) {
                newState = 'Run';
                const time = entity.behaviorTimer / 500;
                const radius = 4.0;
                entity.x = 5 + Math.sin(time) * radius;
                entity.z = 5 + Math.cos(time) * radius;
                entity.rotationY = Math.atan2(Math.cos(time) * radius, -Math.sin(time) * radius);
            } else if (phase < 0.9) {
                newState = 'Die';
            } else {
                newState = 'Fix';
            }
            if (newState !== entity.state) {
                entity.state = newState;
            }
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
