const { CityCell } = require("./schemas/CityCell");

/**
 * CityGrid wrapper for managing a 2D cell grid and structure registry
 * Backed by a Colyseus MapSchema of CityCell for persistence to clients
 */
class CityGrid {
    /**
     * @param {number} width  Number of columns in the grid
     * @param {number} height Number of rows in the grid
     * @param {import("@colyseus/schema").MapSchema<CityCell>} schemaMap Underlying MapSchema keyed by "x_y"
     */
    constructor(width, height, schemaMap) {
        this.width = width;
        this.height = height;
        this.schemaMap = schemaMap;
        // registry: Map<structureId, {id,type,ownerId,hp,maxHp,x,y,width,height}>
        this.structuresRegistry = new Map();
    }

    /** Clear all cells and registry */
    clear() {
        this.schemaMap.clear();
        this.structuresRegistry.clear();
    }

    /**
     * Set a cell and update structure registry
     * @param {number} x 
     * @param {number} y 
     * @param {object} cellData {structureType,isBuildablePlot,structureId,ownerId,currentHP,maxHP,width,height}
     */
    setCell(x, y, cellData) {
        const key = `${x}_${y}`;
        const cell = new CityCell(
            cellData.structureType,
            cellData.isBuildablePlot,
            cellData.structureId,
            cellData.ownerId,
            cellData.currentHP,
            cellData.maxHP
        );
        this.schemaMap.set(key, cell);
        if (cellData.structureId) {
            this.structuresRegistry.set(cellData.structureId, {
                id: cellData.structureId,
                type: cellData.structureType,
                ownerId: cellData.ownerId,
                hp: cellData.currentHP,
                maxHp: cellData.maxHP,
                x, y,
                width: cellData.width || 1,
                height: cellData.height || 1
            });
        }
    }

    /**
     * Returns a 2D array [rows][cols] of CityCell or null
     */
    getMatrix() {
        const matrix = Array.from({length: this.height}, () => Array(this.width).fill(null));
        for (const [key, cell] of this.schemaMap.entries()) {
            const [sx, sy] = key.split("_").map(Number);
            if (sx >= 0 && sx < this.width && sy >= 0 && sy < this.height) {
                matrix[sy][sx] = cell;
            }
        }
        return matrix;
    }

    /** Flat list of structures with pos & size */
    getStructures() {
        return Array.from(this.structuresRegistry.values());
    }
}

module.exports = CityGrid;
