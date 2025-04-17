const { Schema, type } = require("@colyseus/schema");
const { BaseEntity } = require("./BaseEntity");

/**
 * Structure schema for buildings and constructions
 * Extends BaseEntity with building-specific properties
 */
class Structure extends BaseEntity {
    constructor() {
        super();
        this.entityType = "structure";
        this.definitionId = "";       // Specific structure definition ID
        this.health = 100;             // Health points
        this.maxHealth = 100;          // Maximum health points
        this.ownerId = "";             // ID of player who built this (dynamic)
    }
}

// Register schema types
type("number")(Structure.prototype, "health");
type("number")(Structure.prototype, "maxHealth");
type("string")(Structure.prototype, "ownerId");

module.exports = { Structure }; 