/**
 * Behavior function for city engineer: query LLM for next build, move to location, and place structure.
 * TODO: implement LLM integration and building logic.
 */
function cityEngineerBehavior(entity, deltaTime, roomState) {
    // Request new task if none pending
    if (!entity._task && !entity._taskRequest) {
        entity._taskRequest = this._requestCityTask(entity);
        return null;
    }
    // Wait for LLM response
    if (entity._taskRequest && !entity._task) {
        return null;
    }
    // Execute task: move to and build structure
    const { id: defId, x: cellX, y: cellY } = entity._task;
    const worldX = cellX; const worldZ = cellY;
    const dx = worldX - entity.x;
    const dz = worldZ - entity.z;
    const distSq = dx*dx + dz*dz;
    const moveThreshold = 0.1;
    if (distSq > moveThreshold * moveThreshold) {
        const dist = Math.sqrt(distSq) || 1;
        const nx = dx / dist; const nz = dz / dist;
        const newX = entity.x + nx * entity.speed * deltaTime;
        const newZ = entity.z + nz * entity.speed * deltaTime;
        const rotationY = Math.atan2(nx, nz);
        return { x: newX, z: newZ, rotationY, state: 'Walk' };
    }
    // At target: place structure
    const gridX = Math.floor(worldX);
    const gridY = Math.floor(worldZ);
    const key = `${gridX}_${gridY}`;
    // Skip placement if occupied
    if (this.cityGrid.schemaMap.get(key)) {
        console.warn(`[CityEngineer] target cell ${gridX},${gridY} already occupied, skipping placement.`);
        entity._task = null;
        entity._taskRequest = null;
        return { state: 'Idle' };
    }
    this._placeStructure(defId, worldX, worldZ);
    // Clear task and prepare next
    entity._task = null;
    entity._taskRequest = null;
    return { state: 'Idle' };
}

module.exports = { cityEngineerBehavior };
