const { Schema, MapSchema, type } = require("@colyseus/schema");
const { Player } = require("./Player");
const { GameConfigSchema } = require("./GameConfigSchema");
const { Structure } = require("./Structure");
const { StructureDefinition } = require("./StructureDefinition");
const { CityCell } = require("./CityCell");

/**
 * Game state schema for the entire game
 * Contains collections of all entities in the game
 */
class GameState extends Schema {
    constructor() {
        super();
        // All players in the game
        this.players = new MapSchema();
        
        // All entities in the game - can be implementation-specific
        this.entities = new MapSchema();
        
        // All structures in the game (buildings, walls, etc.)
        this.structures = new MapSchema();
        
        // All structure definitions for building mode
        this.structureDefinitions = new MapSchema();
        
        // Game configuration and state - using schema instead of plain object
        this.gameConfig = new GameConfigSchema();
        
        // Persistent credit pools
        this.cityCredits = 0;
        this.enemyCredits = 0;
        
        // City layout grid: Map where key is "x_z" and value is CityCell state
        this.cityGrid = new MapSchema();
    }
}

// Register schema types
type({ map: Player })(GameState.prototype, "players");
type({ map: Schema })(GameState.prototype, "entities");
type({ map: Structure })(GameState.prototype, "structures");
type({ map: StructureDefinition })(GameState.prototype, "structureDefinitions");
type(GameConfigSchema)(GameState.prototype, "gameConfig");
type("number")(GameState.prototype, "cityCredits");
type("number")(GameState.prototype, "enemyCredits");
type({ map: CityCell })(GameState.prototype, "cityGrid");

module.exports = { GameState }; 