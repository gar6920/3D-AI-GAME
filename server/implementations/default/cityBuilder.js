/**
 * Behavior function for city builder: process a queue of tasks from architect
 */
function cityBuilderBehavior(entity, deltaTime, roomState) {
    if (!entity._taskQueue || entity._taskQueue.length === 0) return { state: 'Idle' };
    if (!entity._currentTask) entity._currentTask = entity._taskQueue.shift();
    const { id: defId, x: cellX, y: cellY } = entity._currentTask;
    const worldX = cellX, worldZ = cellY;
    const dx = worldX - entity.x, dz = worldZ - entity.z;
    const distSq = dx*dx + dz*dz, moveThreshold = 0.1;
    if (distSq > moveThreshold*moveThreshold) {
        const dist = Math.sqrt(distSq)||1, nx = dx/dist, nz = dz/dist;
        const newX = entity.x + nx*entity.speed*deltaTime;
        const newZ = entity.z + nz*entity.speed*deltaTime;
        const rotationY = Math.atan2(nx,nz);
        return { x: newX, z: newZ, rotationY, state: 'Walk' };
    }
    // Collision check for entire footprint
    const { structureDefinitions } = require('./structures');
    const def = structureDefinitions.find(d => d.id === defId);
    const baseX = Math.floor(worldX), baseY = Math.floor(worldZ);
    const widthCells = def.scale || 1, heightCells = def.scale || 1;
    let overlap = false;
    for (let ix = 0; ix < widthCells; ix++) {
        for (let iy = 0; iy < heightCells; iy++) {
            if (this.cityGrid.schemaMap.get(`${baseX + ix}_${baseY + iy}`)) { overlap = true; break; }
        }
        if (overlap) break;
    }
    if (overlap) { console.warn(`[CityBuilder] footprint overlap at ${baseX},${baseY}`); entity._currentTask = null; return { state: 'Idle' }; }
    this._placeStructure(defId, worldX, worldZ);
    entity._currentTask = null;
    return { state: 'Idle' };
}

module.exports = { cityBuilderBehavior };
