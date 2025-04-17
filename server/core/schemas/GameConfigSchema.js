const { Schema, type } = require("@colyseus/schema");

/**
 * Game configuration schema
 * Replaces the generic object type with a properly typed schema
 */
class GameConfigSchema extends Schema {
    constructor() {
        super();
        this.implementation = "default"; 
        this.mode = "standard";               // Game mode
        this.maxPlayers = 100;                // Maximum number of players
        // Implementation-driven map size
        try {
            const impl = require('../../implementations/default/index');
            this.mapSize = typeof impl.getMapSize === 'function' ? impl.getMapSize() : 40;
        } catch (e) {
            this.mapSize = 40;
        }
    }
}

// Register schema types
type("string")(GameConfigSchema.prototype, "implementation");
type("string")(GameConfigSchema.prototype, "mode");
type("number")(GameConfigSchema.prototype, "maxPlayers");
type("number")(GameConfigSchema.prototype, "mapSize");

module.exports = { GameConfigSchema }; 