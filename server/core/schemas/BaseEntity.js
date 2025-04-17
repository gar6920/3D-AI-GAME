const { Schema, type, MapSchema } = require("@colyseus/schema");

/**
 * Base entity schema for all game entities
 * This class provides common properties and methods for all entities
 */
class BaseEntity extends Schema {
    constructor() {
        super();
        this.id = "";             // Unique instance identifier
        this.entityType = "";      // Entity type (e.g., "player", "npc", "static")
        this.definitionId = "";    // Reference to definition metadata
        this.modelId = "";        // Identifier for the visual model file (e.g., "robokeeper1")
        this.x = 0;               // Position X
        this.y = 0;               // Position Y 
        this.z = 0;               // Position Z
        this.rotationY = 0;       // Rotation around Y axis (yaw)
        this.value = 1;           // Generic value - meaning depends on implementation
        this.color = "#FFFFFF";   // Color in hex format
        this.state = "Idle";      // Current action/animation state (e.g., Idle, Walk, Work)
        this.animationMap = new MapSchema(); // Add animationMap field
        this.scale = 1; // Default scale
    }
}

// Register schema types
type("string")(BaseEntity.prototype, "id");
type("string")(BaseEntity.prototype, "entityType");
// type("string")(BaseEntity.prototype, "definitionId"); // Remove duplicate definitionId annotation (moved to Structure schema)
type("string")(BaseEntity.prototype, "modelId"); // Register modelId type
type("number")(BaseEntity.prototype, "x");
type("number")(BaseEntity.prototype, "y");
type("number")(BaseEntity.prototype, "z");
type("number")(BaseEntity.prototype, "rotationY");
type("number")(BaseEntity.prototype, "value");
type("string")(BaseEntity.prototype, "color");
type("string")(BaseEntity.prototype, "state");
type({ map: "string" })(BaseEntity.prototype, "animationMap"); // Register animationMap type
type("number")(BaseEntity.prototype, "scale"); // Register scale type

module.exports = { BaseEntity }; 