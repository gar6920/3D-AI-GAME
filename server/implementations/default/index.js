/**
 * Default Implementation
 * Exports the necessary components for the default game setup.
 */

const { BaseGameRoom } = require("../../core/schemas/BaseGameRoom");

// Default implementation information
const implementation = {
    name: "Default Implementation",
    roomType: "default"
};

const { structureDefinitions } = require('./structures');

function getStructureDefinitions() {
    return structureDefinitions;
}

module.exports = {
    implementation,
    BaseGameRoom,
    getStructureDefinitions
};