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

// Generic animation mapping for NPCs - can be overridden per model or type
const DEFAULT_ANIMATION_MAP = {
    // Placeholder for default mappings if needed
    'Idle': ANIMATIONS.IDLE,
    'Walk': ANIMATIONS.WALK,
    'Run': ANIMATIONS.RUN,
    'Die': ANIMATIONS.DIE,
    'Work': ANIMATIONS.WORK,

    // --- Mappings for robokeeper1 ---
    'Armature.001|mixamo.com|Layer0': ANIMATIONS.IDLE, // Assuming this is Idle based on logs
    'Armature.002|mixamo.com|Layer0': ANIMATIONS.DIE,  // Identified as Die
    'Armature.003|mixamo.com|Layer0': ANIMATIONS.WALK, // Trying this for Walk
    // Add mappings for other robokeeper1 animations if needed (Run etc.)
    // 'Armature.004|mixamo.com|Layer0': ANIMATIONS.RUN, 
    // ...
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
        console.log(`[NPC Class] [DEBUG] Creating visual for NPC: ${entityId}`);
        console.log(`[NPC Class] [DEBUG] Entity object:`, entity);
        console.log(`[NPC Class] [DEBUG] Entity prototype:`, Object.getPrototypeOf(entity));
        console.log(`[NPC Class] [DEBUG] Entity keys:`, Object.keys(entity));
        // --- END DEBUG LOGGING ---

        // Attach Colyseus .listen handlers for all fields we care about
        ['x', 'y', 'z', 'state', 'rotationY'].forEach(field => {
            if (typeof entity.listen === 'function') {
                entity.listen(field, (value, prev) => {
                    console.log(`[NPC ${entityId}][LISTEN] Field '${field}' changed: ${prev} -> ${value}`);
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
            console.log(`[NPC Class] Successfully created and stored NPC: ${entityId}`);
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
        if (!NPC.npcs.has(entityId)) {
            console.warn(`NPC.removeNpcVisual: NPC with ID ${entityId} not found.`);
            return;
        }

        console.log(`[NPC Class] Removing visual for NPC: ${entityId}`);
        try {
            const npcInstance = NPC.npcs.get(entityId);
            npcInstance.dispose(); // Call instance method for cleanup
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
        // Ensure THREE.js and GLTFLoader are loaded
        if (typeof THREE === 'undefined' || !THREE.GLTFLoader) {
            console.error("THREE.js or GLTFLoader not found. Cannot load NPC model.");
            return;
        }
        const loader = new THREE.GLTFLoader();
        // Path relative to where index.html is served from (likely client/)
        const modelPath = 'assets/models/robokeeper1.glb'; 

        // --- DEBUG LOGGING ---
        console.log(`[NPC ${this.id}] [DEBUG] _loadModel called. Entity:`, this);
        // --- END DEBUG LOGGING ---

        loader.load(modelPath, (gltf) => {
            console.log(`NPC model loaded successfully for entity: ${this.id}`);
            const loadedModel = gltf.scene;

            // Optional: Scale or adjust the loaded model if needed
            loadedModel.scale.set(0.2, 0.2, 0.2); // Reduce scale to make NPC smaller in the game world
            // console.log(`NPC ${this.id}: Model structure:`, loadedModel); // Reduced verbosity
            loadedModel.traverse((child) => {
                // console.log(`NPC ${this.id}: Child - Name: ${child.name}, Type: ${child.type}, Scale: ${child.scale.x},${child.scale.y},${child.scale.z}, Position: ${child.position.x},${child.position.y},${child.position.z}`); // Reduced verbosity
                // Ensure child scale is normalized
                child.scale.set(0.2, 0.2, 0.2); // Apply smaller scale to children as well
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

            // Add the loaded model to our placeholder group
            this.modelPlaceholder.add(loadedModel);
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
                    console.log(`NPC ${this.id}: Added model placeholder to scene.`);
                } else {
                    console.warn(`NPC ${this.id}: Scene not set, cannot add model to scene.`);
                }
            }

            // Setup animation mixer and actions
            this.mixer = new THREE.AnimationMixer(loadedModel);
            // console.log(`[NPC ${this.id} Animations] Found ${gltf.animations.length} animations in GLB:`); // REMOVED LOG
            gltf.animations.forEach((clip) => {
                const rawName = clip.name;
                // console.log(`  - Raw Name: '${rawName}'`); // REMOVED LOG
                // Use the explicit map
                const mappedName = DEFAULT_ANIMATION_MAP[rawName];

                if (mappedName) {
                    if (!this.actions[mappedName]) { // Prevent overwriting if multiple clips map to the same name
                        this.actions[mappedName] = this.mixer.clipAction(clip);
                        console.log(`  - NPC ${this.id}: Mapped animation '${rawName}' to '${mappedName}'`);
                    } else {
                        console.warn(`  - NPC ${this.id}: Multiple animations map to '${mappedName}'. Skipping duplicate '${rawName}'.`);
                    }
                } else {
                    console.warn(`  - NPC ${this.id}: Could not map animation '${rawName}'. Storing under original name.`);
                    // Store under original name as a fallback if needed, though ideally all used animations are mapped
                    if (!this.actions[rawName]) { 
                        this.actions[rawName] = this.mixer.clipAction(clip);
                    }
                }
            });

            // --- Initialize Animation State ---
            // Initialize animation based purely on server state.
            let initialState = this.state; // Get initial state from server data passed to constructor
            let initialActionName = null;

            if (initialState && this.actions[initialState]) {
                console.log(`NPC ${this.id}: Initializing animation to server state: ${initialState}`);
                initialActionName = initialState;
            } else if (this.actions[ANIMATIONS.IDLE]) { // Default to Idle if state invalid/missing
                console.warn(`NPC ${this.id}: Initial server state ('${initialState}') is invalid or missing. Defaulting to '${ANIMATIONS.IDLE}'.`);
                initialActionName = ANIMATIONS.IDLE;
                this.state = ANIMATIONS.IDLE; // Update internal state to match default
            } else if (Object.keys(this.actions).length > 0) { // Default to first available animation if Idle missing
                initialActionName = Object.keys(this.actions)[0];
                console.warn(`NPC ${this.id}: Initial server state ('${initialState}') and '${ANIMATIONS.IDLE}' are invalid/missing. Defaulting to first available animation: '${initialActionName}'.`);
                this.state = initialActionName; // Update internal state to match default
            } else {
                console.error(`NPC ${this.id}: No valid initial state from server and no animations found. Cannot set initial animation.`);
            }

            if (initialActionName) {
                this.playAnimation(initialActionName, 0); // Play immediately, no fade-in
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
        if (!this.mixer || !this.actions[name]) {
            // Don't warn excessively if model/animations just haven't loaded yet
            console.warn(`NPC ${this.id}: Cannot play animation '${name}'. Mixer or action not ready.`);
            return;
        }

        const newAction = this.actions[name];
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
        
        console.log(`[NPC ${this.id} playAnimation] Request: '${name}'. Current: '${currentActionName}'.`);

        if (currentAction === newAction) {
            console.log(`[NPC ${this.id} playAnimation] Already playing '${name}'. Skipping.`);
            return; // Already playing this animation and it's fully faded in
        }

        // Reset and fade in the new action
        console.log(`[NPC ${this.id} playAnimation] Resetting and playing '${name}' immediately (no fade).`);
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
                console.log(`[NPC ${this.id} Mixer Update] Mixer reports active animation: '${activeActionName}'`);
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
        const sessionId = window.room?.sessionId || 'unknown';
        if (entity.id === 'robokeeper1') {
            console.log(`%c[robokeeper1][UPDATE][${sessionId}] x=${entity.x}, y=${entity.y}, z=${entity.z}, state=${entity.state} @${new Date().toLocaleTimeString()}`,'color: #fff; background: #FF4136; font-weight: bold;');
        }
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

if (typeof module !== 'undefined') {
    module.exports = { NPC };
}