// 3D AI Game Platform - Core NPC entity class

// Assumes THREE and GLTFLoader are available globally or imported
// Define animation names for clarity
const ANIMATIONS = {
    IDLE: 'Idle',
    WALK: 'Walk',
    RUN: 'Run',
    DIE: 'Die',
    WORK: 'Work'
};

class NPC extends Entity {
    // --- Static Properties and Methods for Management ---
    static npcs = new Map(); // Stores all active NPC instances, keyed by entityId
    static scene = null;     // Reference to the main THREE.js scene
    static loader = new THREE.GLTFLoader(); // Re-use loader for efficiency

    /**
     * Sets the scene reference for all NPC instances.
     * Should be called once during game initialization.
     * @param {THREE.Scene} scene - The main game scene.
     */
    static setScene(scene) {
        NPC.scene = scene;
    }

    /**
     * Creates the visual representation of an NPC based on server data.
     * Called by network listener when an NPC entity is added.
     * @param {object} entity - The entity data from the server (schema matching BaseEntity + NPC specifics).
     * @param {string} entityId - The unique ID for this NPC entity.
     */
    static createNpcVisual(entity, entityId) {
        if (!NPC.scene) {
            console.error(`NPC.createNpcVisual: Scene not set! Cannot create NPC ${entityId}.`);
            return;
        }
        if (NPC.npcs.has(entityId)) {
            console.warn(`NPC.createNpcVisual: NPC with ID ${entityId} already exists. Removing old instance before creating new.`);
            NPC.removeNpcVisual(entityId);
        }

        // --- DEBUG LOGGING ---
        // console.log(`[NPC Class] [DEBUG] Creating visual for NPC: ${entityId}`);
        // console.log(`[NPC Class] [DEBUG] Entity object:`, entity);
        // console.log(`[NPC Class] [DEBUG] Entity prototype:`, Object.getPrototypeOf(entity));
        // console.log(`[NPC Class] [DEBUG] Entity keys:`, Object.keys(entity));
        // --- END DEBUG LOGGING ---

        // Attach Colyseus .listen handlers for all fields we care about
        ['x', 'y', 'z', 'state', 'rotationY', 'animationMap', 'scale'].forEach(field => {
            if (typeof entity.listen === 'function') {
                entity.listen(field, (value, prev) => {
                    // console.log(`[NPC ${entityId}][LISTEN] Field '${field}' changed: ${prev} -> ${value}`);
                    const npcInstance = NPC.npcs.get(entityId);
                    if (!npcInstance) return;
                    if (field === 'state') {
                        npcInstance.state = value;
                        npcInstance.playAnimation(value);
                    } else if (field === 'rotationY') {
                        npcInstance.rotationY = value;
                        if (npcInstance.mesh) {
                            npcInstance.mesh.rotation.y = value;
                        }
                    } else if (['x','y','z'].includes(field)) {
                        npcInstance.position[field] = value;
                        if (npcInstance.mesh) {
                            npcInstance.mesh.position[field] = value;
                            if (field === 'y') {
                                // console.log(`[NPC ${entityId}] Client mesh y updated to: ${value}`);
                            } else if (field === 'z') {
                                // console.log(`[NPC ${entityId}] Client mesh z updated to: ${value}`);
                            }
                        }
                    } else if (field === 'animationMap') {
                        // Re-copy the animation map if it changes dynamically (unlikely but possible)
                        npcInstance.animationMap.clear();
                        value.forEach((mapValue, mapKey) => {
                            npcInstance.animationMap.set(mapKey, mapValue);
                        });
                        // console.log(`[NPC ${entityId}][LISTEN] Updated animationMap:`, npcInstance.animationMap);
                        // Note: Re-mapping animations in _loadModel might be needed if this happens *after* load
                    } else if (field === 'scale') {
                        if (npcInstance.modelPlaceholder) {
                            npcInstance.modelPlaceholder.scale.set(value, value, value);
                            console.log(`NPC ${entityId}: Scale updated to ${value} via onChange.`);
                        }
                    }
                });
            } else {
                console.warn(`[NPC ${entityId}][LISTEN] entity.listen is not a function!`);
            }
        });

        try {
            const npcInstance = new NPC(entity, entityId); 
            NPC.npcs.set(entityId, npcInstance);
            // console.log(`[NPC Class] Successfully created and stored NPC: ${entityId}`);
        } catch (error) {
            console.error(`[NPC Class] Failed to create NPC ${entityId}:`, error);
        }
    }

    /**
     * Removes the visual representation of an NPC.
     * Called by network listener when an NPC entity is removed.
     * @param {string} entityId - The ID of the NPC to remove.
     */
    static removeNpcVisual(entityId) {
        const npcInstance = NPC.npcs.get(entityId);
        if (!npcInstance) {
            console.warn(`NPC.removeNpcVisual: NPC with ID ${entityId} not found.`);
            return;
        }
        console.log(`[NPC Class] Removing visual for NPC: ${entityId}`);
        try {
            // Remove mesh from scene
            if (npcInstance.mesh && npcInstance.mesh.parent) {
                npcInstance.mesh.parent.remove(npcInstance.mesh);
                // Dispose geometry/material for all child meshes
                npcInstance.mesh.traverse(child => {
                    if (child.isMesh) {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => mat && mat.dispose && mat.dispose());
                            } else if (child.material.dispose) {
                                child.material.dispose();
                            }
                        }
                    }
                });
            }
            // Call instance dispose/destroy if defined
            if (typeof npcInstance.dispose === 'function') {
                npcInstance.dispose();
            } else if (typeof npcInstance.destroy === 'function') {
                npcInstance.destroy();
            }
            NPC.npcs.delete(entityId);
            console.log(`[NPC Class] Successfully removed NPC: ${entityId}`);
        } catch (error) {
            console.error(`[NPC Class] Failed to remove NPC ${entityId}:`, error);
        }
    }

    // --- Instance Properties and Methods ---
    constructor(params) {
        // Pass core params, ensure type is 'npc'
        super({ ...params, type: 'npc' });

        // --- Copy Animation Map from Server Data ---
        this.animationMap = new Map(); // Use a standard JS Map client-side
        if (params.animationMap) {
            params.animationMap.forEach((value, key) => {
                this.animationMap.set(key, value);
            });
            // console.log(`[NPC ${this.id} Constructor] Copied animationMap from server (${this.animationMap.size} entries):`, this.animationMap);
        } else {
            console.warn(`[NPC ${this.id} Constructor] No animationMap received from server.`);
        }
        // --- End Copy ---

        this.modelId = params.modelId; // Store modelId received from server
        // console.log(`[NPC ${this.id}] Created. InstanceID: ${this.id}, ModelID: ${this.modelId}`);

        // Behavior/Animation state
        this.mixer = null;
        this.actions = {}; // Store animation actions { name: THREE.AnimationAction }
        this.clock = new THREE.Clock(); // Still needed for mixer.update() delta time

        // Placeholder mesh group, actual model loaded async
        this.modelPlaceholder = new THREE.Group();
        this.mesh = this.modelPlaceholder; // Base class expects this.mesh
        this.mesh.position.copy(this.position); // Set initial position
        this.mesh.rotation.y = this.rotationY; // Set initial rotation
        this.mesh.userData.entity = this; // Link back for raycasting etc.

        this._loadModel(); // Start loading the actual GLB model
    }

    _loadModel() {
        if (!this.modelId) {
            console.error(`[NPC ${this.id}] Cannot load model: modelId is missing!`);
            return;
        }
        const modelPath = `assets/models/${this.modelId}.glb`; // Use modelId here
        // console.log(`[NPC ${this.id}] Loading model from path: ${modelPath}`);

        if (!this.loader) {
            this.loader = new THREE.GLTFLoader(); // Use static loader
        }

        this.loader.load(modelPath, (gltf) => {
            // console.log(`NPC model loaded successfully for entity: ${this.id}`);
            const loadedModel = gltf.scene;

            // Optional: Scale or adjust the loaded model if needed
            // loadedModel.scale.set(0.2, 0.2, 0.2); // Reduced scale to make NPC smaller in the game world
            // console.log(`NPC ${this.id}: Model structure:`, loadedModel); // Reduced verbosity
            loadedModel.traverse((child) => {
                // console.log(`NPC ${this.id}: Child - Name: ${child.name}, Type: ${child.type}, Scale: ${child.scale.x},${child.scale.y},${child.scale.z}, Position: ${child.position.x},${child.position.y},${child.position.z}`); // Reduced verbosity
                // Ensure child scale is normalized
                // child.scale.set(0.2, 0.2, 0.2); // Apply smaller scale to children as well
                // Hide objects that might represent lying-down pose based on name or position
                if (child.name.toLowerCase().includes('dead') || child.name.toLowerCase().includes('lying') || child.name.toLowerCase().includes('down') || child.position.y < -50.0) {
                    child.visible = false;
                    // console.log(`NPC ${this.id}: Hid child object ${child.name} due to suspected lying-down pose. Position y: ${child.position.y}`); // Reduced verbosity
                } else if (child.type === 'SkinnedMesh' && child.position.y < -1.0) {
                    child.visible = false;
                    // console.log(`NPC ${this.id}: Hid SkinnedMesh object ${child.name} due to low position possibly indicating lying-down pose. Position y: ${child.position.y}`); // Reduced verbosity
                }
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // Tag meshes for selection
            loadedModel.traverse(child=>{ if(child.isMesh) child.userData.entity = this; });

            // Add the loaded model to our placeholder group
            this.modelPlaceholder.add(loadedModel);

            // Compute and store bounding box collider for NPC
            const bbox = new THREE.Box3().setFromObject(this.modelPlaceholder);
            this.boundingBox = bbox;
            // console.log(`[NPC ${this.id}] Bounding box computed: min${bbox.min.toArray()}, max${bbox.max.toArray()}`);

            // --- ADDED: Log current state scale --- 
            // console.log(`NPC ${this.id}: Checking this.state.scale before applying initial scale:`, this.state ? this.state.scale : 'this.state is null/undefined');
            // --- END ADDED ---

            // --- Apply initial scale from server state ---
            if (this.state && this.state.scale !== undefined) {
                this.modelPlaceholder.scale.set(this.state.scale, this.state.scale, this.state.scale);
                console.log(`NPC ${this.id}: Initial scale set to ${this.state.scale} from server state.`);
            } else {
                // Fallback if state isn't ready or scale missing (shouldn't usually happen)
                console.warn(`NPC ${this.id}: Initial scale not found in server state, using default 1.`);
                this.modelPlaceholder.scale.set(1, 1, 1);
            }

            // Check for multiple top-level children which might indicate separate poses/models
            if (loadedModel.children.length > 1) {
                // console.warn(`NPC ${this.id}: Model has multiple top-level children (${loadedModel.children.length}), which might include separate poses. Inspecting...`); // Reduced verbosity
                loadedModel.children.forEach((child, index) => {
                    // console.log(`NPC ${this.id}: Top-level child ${index} - Name: ${child.name}, Type: ${child.type}, Position: ${child.position.x},${child.position.y},${child.position.z}`); // Reduced verbosity
                    // Keep only the first child or one likely to be standing pose; hide others
                    if (index > 0) {
                        child.visible = false;
                        // console.log(`NPC ${this.id}: Hid top-level child ${child.name} (index ${index}) to avoid duplicate poses.`); // Reduced verbosity
                    }
                });
            } 
            // else if (loadedModel.children.length === 1) {
            //     console.log(`NPC ${this.id}: Model has a single top-level child: ${loadedModel.children[0].name}`);
            // }
            else {
                // console.warn(`NPC ${this.id}: Model has no top-level children, which is unexpected.`); // Reduced verbosity
            }
            // Note: this.mesh already points to modelPlaceholder

            // Ensure the placeholder group is added to the scene if not already
            if (!this.modelPlaceholder.parent) {
                if (NPC.scene) {
                    NPC.scene.add(this.modelPlaceholder);
                    // console.log(`NPC ${this.id}: Added model placeholder to scene.`);
                } else {
                    console.warn(`NPC ${this.id}: Scene not set, cannot add model to scene.`);
                }
            }

            // Setup animation mixer and actions USING this.animationMap
            this.mixer = new THREE.AnimationMixer(loadedModel);
            this.actions = {}; // Clear any previous actions
            let animationsFoundCount = 0;
            let animationsMappedCount = 0;

            gltf.animations.forEach((clip) => {
                animationsFoundCount++;
                const rawName = clip.name;
                // Determine action name: first via provided map, then fallback by keyword
                let actionName = this.animationMap.get(rawName);
                if (!actionName) {
                    const lower = rawName.toLowerCase();
                    if (lower.includes('walk')) actionName = 'Walk';
                    else if (lower.includes('idle')) actionName = 'Idle';
                    else if (lower.includes('run')) actionName = 'Run';
                    else if (lower.includes('attack')) actionName = 'Attack';
                }
                if (actionName) {
                    if (!this.actions[actionName]) {
                        this.actions[actionName] = this.mixer.clipAction(clip);
                        animationsMappedCount++;
                        // console.log(`  - NPC ${this.id}: Mapped animation '${rawName}' to '${actionName}'`);
                    }
                } else {
                    // Fallback: register under rawName to allow manual play
                    this.actions[rawName] = this.mixer.clipAction(clip);
                    // console.warn(`  - NPC ${this.id}: Registered fallback animation for raw clip '${rawName}'`);
                }
            });
            // console.log(`[NPC ${this.id} Animations] Processed ${animationsFoundCount} raw animations. Mapped ${animationsMappedCount} to standard names.`);

            // --- Initialize Animation State ---
            let initialState = this.state; // Get initial state from server data
            let initialActionName = null;

            if (initialState && this.actions[initialState]) {
                console.log(`NPC ${this.id}: Initializing animation to server state: '${initialState}'`);
                initialActionName = initialState;
            } else if (this.actions['Walk']) {
                console.warn(`NPC ${this.id}: No mapped action for initial state '${initialState}', falling back to 'Walk'`);
                initialActionName = 'Walk';
            } else if (this.actions['Idle']) {
                console.warn(`NPC ${this.id}: No mapped action for initial state '${initialState}', falling back to 'Idle'`);
                initialActionName = 'Idle';
            } else {
                console.warn(`NPC ${this.id}: Initial server state ('${initialState}') not in actions; no initial animation will play.`);
                // console.log(`NPC ${this.id}: Available actions:`, Object.keys(this.actions));
            }

            if (initialActionName) {
                this.playAnimation(initialActionName, 0); // Play immediately, no fade-in
            }

            if(typeof addSelectionColliderFromEntity==='function'){
                addSelectionColliderFromEntity(this, this.modelPlaceholder);
            }

        }, 
        undefined, // Progress callback (optional)
        (error) => {
            console.error(`Error loading NPC model (${modelPath}) for ${this.id}:`, error);
        });
    }

    // Override createMesh - returns the placeholder group immediately.
    // The actual visual model is added asynchronously by _loadModel.
    createMesh() {
        return this.modelPlaceholder;
    }

    // Override updatePosition to ensure internal state matches server/base class
    updatePosition(pos) {
        super.updatePosition(pos); 
        // Base class handles this.x/y/z, this.rotationY, mesh position/rotation
        // and this.position (Vector3)
        // Ensure mesh position/rotation reflect the server state applied by base class
        if (this.mesh) {
             this.mesh.position.copy(this.position);
             // Only apply Y rotation, let other axes be handled by animation/model itself
             this.mesh.rotation.y = this.rotationY;
        }
    }

    playAnimation(name, fadeDuration = 0.3) {
        // Ensure mixer is ready
        if (!this.mixer) {
            console.warn(`NPC ${this.id}: Mixer not ready to play animation '${name}'.`);
            return;
        }
        // Fallback if requested action missing
        let actionName = name;
        if (!this.actions[actionName]) {
            if (this.actions['Walk']) {
                console.warn(`NPC ${this.id}: No action for '${name}', falling back to 'Walk'`);
                actionName = 'Walk';
            } else if (this.actions['Idle']) {
                console.warn(`NPC ${this.id}: No action for '${name}', falling back to 'Idle'`);
                actionName = 'Idle';
            } else {
                console.warn(`NPC ${this.id}: Cannot play animation '${name}'. No fallback available.`);
                return;
            }
        }
        const newAction = this.actions[actionName];
        let currentAction = null;
        let currentActionName = 'None';

        // Find currently active (playing and not fading out) action
        for (const actionName in this.actions) {
            const action = this.actions[actionName];
            if (action.isRunning() && action.getEffectiveWeight() > 0) {
                currentAction = action;
                currentActionName = actionName;
                break;
            }
        }
        
        // console.log(`[NPC ${this.id} playAnimation] Request: '${name}'. Current: '${currentActionName}'.`);

        if (currentAction === newAction) {
            // console.log(`[NPC ${this.id} playAnimation] Already playing '${name}'. Skipping.`);
            return; // Already playing this animation and it's fully faded in
        }

        // Reset and fade in the new action
        // console.log(`[NPC ${this.id} playAnimation] Resetting and playing '${name}' immediately (no fade).`);
        newAction.reset();
        newAction.setEffectiveWeight(1); // Ensure full weight
        newAction.time = 0;
        newAction.play();
        
        // console.log(`NPC ${this.id}: Playing animation '${name}'`);
    }

    update(deltaTime) {
        // Update animation mixer regardless of state
        if (this.mixer) {
            this.mixer.update(deltaTime);
            
            // Log active animation according to the mixer (every ~2 seconds to avoid spam)
            if (!this._lastMixerLogTime || Date.now() - this._lastMixerLogTime > 2000) {
                let activeActionName = 'None';
                for (const actionName in this.actions) {
                    if (this.actions[actionName].getEffectiveWeight() > 0.1) { // Check weight > threshold
                        activeActionName = actionName;
                        break;
                    }
                }
                // console.log(`[NPC ${this.id} Mixer Update] Mixer reports active animation: '${activeActionName}'`);
                this._lastMixerLogTime = Date.now();
            }
        }
        // Client-side update loop is now only responsible for updating the animation mixer.
        // Position, rotation, and animation state changes are driven by server updates
        // handled by the base Entity class and the 'onChange' listener for 'state'.
    }

    /**
     * Update this NPC instance from the latest schema entity (position, rotation, state, etc.)
     * @param {object} entity - The Colyseus schema entity
     */
    updateFromSchema(entity) {
        // --- Update Animation Map if needed --- (Already handled by listener)
        /*
        if (entity.animationMap && entity.animationMap.size !== this.animationMap.size) { // Basic check for changes
            console.log(`[NPC ${this.id} updateFromSchema] AnimationMap changed, updating...`);
            this.animationMap.clear();
            entity.animationMap.forEach((value, key) => {
                this.animationMap.set(key, value);
            });
            // TODO: Potentially need to re-initialize actions if map changes after _loadModel completes
        }
        */
        // --- End Update ---

        // Update position and rotation
        this.updatePosition({
            x: entity.x,
            y: entity.y,
            z: entity.z,
            rotationY: entity.rotationY
        });
        // Optionally, update animation/state
        if (entity.state !== undefined && this.state !== entity.state) {
            console.log(`[NPC ${this.id} updateFromSchema] State changed: ${this.state} -> ${entity.state}`);
            this.state = entity.state;
            this.playAnimation(this.state);
        }
        // Update scale
        if (entity.scale !== undefined && this.modelPlaceholder) {
            this.modelPlaceholder.scale.set(entity.scale, entity.scale, entity.scale);
            console.log(`NPC ${this.id}: Scale updated to ${entity.scale} via updateFromSchema.`);
        }
    }

    // Destroy method to clean up resources
    destroy() {
        // Stop all animations
        if (this.mixer) {
            this.mixer.stopAllAction();
        }
        // Call base class destroy to remove mesh from scene
        super.destroy();
    }
    
    // Remove obsolete methods from base class if they were overridden
    // setupAnimation() { ... } // Removed
    // animate(deltaTime) { ... } // Removed
}

// Export the updated NPC class
if (typeof window !== 'undefined') {
    window.NPC = NPC;
}

// Optional: CommonJS export for potential use in Node.js environments or bundlers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NPC, ANIMATIONS };
}