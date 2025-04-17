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

module.exports = {
    implementation,
    BaseGameRoom
};