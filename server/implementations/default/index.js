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

const { structureDefinitions } = require('./structures');

function getStructureDefinitions() {
    return structureDefinitions;
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