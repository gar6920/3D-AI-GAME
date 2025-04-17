// Pickup.js - Colyseus schema for pickup/item entities
const { Schema, type } = require("@colyseus/schema");

class Pickup extends require("./BaseEntity").BaseEntity {
    constructor() {
        super();
        this.itemType = ""; // e.g., 'coin', 'potion', 'sword'
        this.isHeld = false; // Is the item currently held by a player?
        this.ownerId = "";  // If held, which player owns it
        this.stackCount = 1; // For stackable items
    }
}

type("string") (Pickup.prototype, "itemType");
type("boolean") (Pickup.prototype, "isHeld");
type("string") (Pickup.prototype, "ownerId");
type("number") (Pickup.prototype, "stackCount");

module.exports = { Pickup };
