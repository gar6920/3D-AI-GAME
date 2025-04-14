/**
 * Default Implementation
 * Exports the necessary components for the default game setup.
 */

const { DefaultRoom } = require("../../core/schemas/DefaultRoom");

// Default implementation information
const implementation = {
    name: "Default Implementation",
    roomType: "default"
};

module.exports = {
    implementation,
    DefaultRoom
};