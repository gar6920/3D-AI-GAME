const { BaseEntity } = require("./BaseEntity");
const { Schema, type } = require("@colyseus/schema");

/**
 * BuildingEntity schema for buildings/structures placed in the world
 * Inherits from BaseEntity and adds structure/building-specific fields if needed
 */
class BuildingEntity extends BaseEntity {
    constructor() {
        super();
        this.structureType = "building";
        // You can add more fields specific to buildings here if needed
    }
}
type("string")(BuildingEntity.prototype, "structureType");

module.exports = { BuildingEntity };
