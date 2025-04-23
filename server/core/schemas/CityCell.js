const schema = require('@colyseus/schema');
const Schema = schema.Schema;
const type = schema.type;

class CityCell extends Schema {
    constructor(structureType = "empty", isBuildablePlot = true, structureId = null, ownerId = null, currentHP = 0, maxHP = 0) {
        super();
        this.structureType = structureType;
        this.isBuildablePlot = isBuildablePlot;
        this.structureId = structureId;
        this.ownerId = ownerId;
        this.currentHP = currentHP;
        this.maxHP = maxHP;
    }
}

// Define schema types
// Use 'string' for IDs and type names. 'number' for HP. 'boolean' for flags.
// Use null checks where appropriate on server logic, client will receive default values if null.
type("string")(CityCell.prototype, "structureType"); // e.g., "empty", "concrete_path_buildable", "building", "natural_obstacle"
type("boolean")(CityCell.prototype, "isBuildablePlot"); // Can players/architects build here?
type("string")(CityCell.prototype, "structureId"); // Unique ID of the structure instance in this cell, if any
type("string")(CityCell.prototype, "ownerId"); // Player session ID, "city", "npc", or null
type("number")(CityCell.prototype, "currentHP");
type("number")(CityCell.prototype, "maxHP");


module.exports = { CityCell }; 