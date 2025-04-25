/**
 * Default Implementation
 * Exports the necessary components for the default game setup.
 */

const { BaseGameRoom } = require("../../core/BaseGameRoom");

// Default implementation information
const implementation = {
    name: "Default Implementation",
    roomType: "default"
};

const staticDefs = require('./structures').structureDefinitions;

function getStructureDefinitions() {
    // Start with static definitions
    const defs = [...staticDefs];
    // Generate wall segments around map perimeter
    const mapSize = getMapSize();
    const radius = mapSize / 4;
    const segmentLength = parseFloat(process.env.CITY_WALL_SEGMENT_LENGTH) || 5;
    const totalHealth = parseFloat(process.env.CITY_WALL_HEALTH) || 2000;
    const totalMaxHealth = totalHealth;
    // Use chord-angle so segments meet edge-to-edge
    const chordAngle = 2 * Math.asin(segmentLength / (2 * radius));
    const count = Math.max(1, Math.floor((2 * Math.PI) / chordAngle));
    const step = (2 * Math.PI) / count;
    for (let i = 0; i < count; i++) {
        const mid = i * step + step / 2;
        defs.push({
            id: `city_wall_segment_${i}`,
            structureType: 'wall',
            modelId: 'city_wall_segment',
            modelPath: 'assets/models/city_wall_segment.glb',
            position: { x: Math.sin(mid) * radius, y: 0, z: Math.cos(mid) * radius },
            rotationY: mid + Math.PI/2,
            scale: 1,
            buildable: false,
            health: totalHealth / count,
            maxHealth: totalMaxHealth / count
        });
    }
    return defs;
}

// Return map size for this implementation (10x larger than default)
function getMapSize() {
    return 1000;
}

module.exports = {
    implementation,
    ImplementationRoom: BaseGameRoom,
    getStructureDefinitions,
    getMapSize
};