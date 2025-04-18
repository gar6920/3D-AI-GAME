const { BaseEntity } = require("./BaseEntity");
const { type } = require("@colyseus/schema");

/**
 * NPC schema for non-player characters, both allies and enemies
 * Extends BaseEntity with NPC-specific properties
 */
class NPCSchema extends BaseEntity {
    constructor() {
        super();
        this.entityType = "npc";       // Type identifier (client already uses this)
        this.faction = "neutral";      // "player", "enemy", "neutral"
        this.health = 100;             // Health points
        this.maxHealth = 100;          // Maximum health points
        this.behavior = "idle";        // Current behavior state
        
        // These properties already exist in BaseEntity, so just set default values
        this.state = "Idle";           // Animation state that client already recognizes
    }
}

// Register schema types
type("string")(NPCSchema.prototype, "faction");
type("number")(NPCSchema.prototype, "health");
type("number")(NPCSchema.prototype, "maxHealth");
type("string")(NPCSchema.prototype, "behavior");

module.exports = { NPCSchema };
