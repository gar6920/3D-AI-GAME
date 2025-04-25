/**
 * Behavior for City Architect: queue deterministic road grid plan
 */
function cityArchitectBehavior(entity, deltaTime, roomState) {
    if (!entity._planQueued) {
        const plan = this._generateRoadGridPlan(5, 50);
        const builder = Array.from(this.state.entities.values()).find(e => e._isCityBuilder);
        if (builder) {
            builder._taskQueue = builder._taskQueue || [];
            for (const task of plan) builder._taskQueue.push(task);
        }
        entity._planQueued = true;
    }
    return { state: 'Idle' };
}

module.exports = { cityArchitectBehavior };
