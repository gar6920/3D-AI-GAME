// server/core/schemas/StructureDefinition.js

const { Schema, type } = require("@colyseus/schema");

/**
 * Definition schema for static structures/buildings.
 */
class StructureDefinition extends Schema {
    constructor() {
        super();
        this.id = "";               // Definition ID
        this.structureType = "";    // e.g., 'building', 'decor'
        this.modelPath = "";        // Path to GLB or asset
        this.positionX = 0;
        this.positionY = 0;
        this.positionZ = 0;
        this.rotationY = 0;
        this.scale = 1;
        this.buildable = false;
    }
}

type("string")(StructureDefinition.prototype, "id");
type("string")(StructureDefinition.prototype, "structureType");
type("string")(StructureDefinition.prototype, "modelPath");
type("number")(StructureDefinition.prototype, "positionX");
type("number")(StructureDefinition.prototype, "positionY");
type("number")(StructureDefinition.prototype, "positionZ");
type("number")(StructureDefinition.prototype, "rotationY");
type("number")(StructureDefinition.prototype, "scale");
type("boolean")(StructureDefinition.prototype, "buildable");

module.exports = { StructureDefinition };
