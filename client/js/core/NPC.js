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
            // Remove the old instance to prevent duplicates
            NPC.removeNpcVisual(entityId);
        }

        console.log(`[NPC Class] Creating visual for NPC: ${entityId}`, entity);
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
            gltf.animations.forEach((clip) => {
                const actionName = clip.name; // Use name from Blender export
                if (actionName) {
                    this.actions[actionName] = this.mixer.clipAction(clip);
                    console.log(`  - NPC ${this.id}: Found animation clip: ${actionName}`);
                } else {
                    console.warn(`NPC ${this.id}: Found animation clip with no name.`);
                }
            });

            // Start the initial animation state based on server's initial state
            // Use base class's state value which should be synchronized initially
            if (this.state && this.actions[this.state]) {
                 console.log(`NPC ${this.id}: Initializing animation to server state: ${this.state}`);
                 this.playAnimation(this.state, 0); // Play immediately, no fade-in
            } else {
                 console.log(`NPC ${this.id}: Server state is undefined. Initiating fallback behavior with available actions:`, Object.keys(this.actions));
                 if (Object.keys(this.actions).length > 0) {
                     const firstAction = Object.keys(this.actions)[0];
                     console.log(`NPC ${this.id}: Starting with first animation: ${firstAction}`);
                     this.playAnimation(firstAction);
                     // Start fallback behavior to cycle animations and move
                     this.startFallbackBehavior();
                 }
            }

            // *** Add listener for state changes from the server ***
            this.onChange = (changes) => {
                console.log(`[NPC] State change for ${this.id}`, changes);
                changes.forEach(change => {
                    const { field, value } = change;
                    if (field === 'state') {
                        this.playAnimation(value);
                    } else if (field === 'x' || field === 'y' || field === 'z') {
                        this.position[field] = value;
                        if (this.mesh) {
                            this.mesh.position[field] = value;
                        }
                    } else if (field === 'rotationY') {
                        this.rotationY = value;
                        if (this.mesh) {
                            this.mesh.rotation.y = value;
                        }
                    }
                });
                // If server sends state or position updates, stop fallback behavior
                if (this.fallbackAnimInterval || this.fallbackMoveInterval) {
                    this.stopFallbackBehavior();
                }
            };

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
            // console.warn(`NPC ${this.id}: Cannot play animation '${name}'. Mixer or action not ready.`);
            return;
        }

        const newAction = this.actions[name];
        let currentAction = null;

        // Find currently active (playing and not fading out) action
        for (const actionName in this.actions) {
            const action = this.actions[actionName];
            if (action.isRunning() && action.getEffectiveWeight() > 0) {
                currentAction = action;
                break;
            }
        }

        if (currentAction === newAction) {
            return; // Already playing this animation and it's fully faded in
        }

        // Reset and fade in the new action
        newAction.reset();
        newAction.setEffectiveTimeScale(1); // Ensure normal speed
        newAction.setEffectiveWeight(1);    // Ensure full weight
        newAction.time = 0; // Start from beginning
        newAction.play();
        if (currentAction) {
            newAction.crossFadeFrom(currentAction, fadeDuration, true);
        } else {
             newAction.fadeIn(fadeDuration); // Fade in if no other action was playing
        }
        
        // console.log(`NPC ${this.id}: Playing animation '${name}'`);
    }

    update(deltaTime) {
        // Update animation mixer regardless of state
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
        // Client-side update loop is now only responsible for updating the animation mixer.
        // Position, rotation, and animation state changes are driven by server updates
        // handled by the base Entity class and the 'onChange' listener for 'state'.
    }

    // Fallback behavior to cycle animations and simulate movement when server state is undefined
    startFallbackBehavior() {
        console.log(`NPC ${this.id}: Starting fallback behavior for animation cycling and movement.`);
        let currentAnimIndex = 0;
        const animKeys = Object.keys(this.actions);
        // Cycle through animations every 5 seconds
        const cycleAnimation = () => {
            if (animKeys.length > 0) {
                currentAnimIndex = (currentAnimIndex + 1) % animKeys.length;
                const nextAnim = animKeys[currentAnimIndex];
                console.log(`NPC ${this.id}: Cycling to animation: ${nextAnim}`);
                this.playAnimation(nextAnim);
            }
        };
        // Simulate movement in a small radius around initial position
        const simulateMovement = () => {
            if (this.mesh) {
                const time = Date.now() * 0.001; // Slow time factor
                const radius = 2.0; // Small radius for wandering
                const initPos = this.position;
                const newX = initPos.x + Math.sin(time) * radius;
                const newZ = initPos.z + Math.cos(time) * radius;
                this.mesh.position.x = newX;
                this.mesh.position.z = newZ;
                // Face direction of movement
                const dx = Math.cos(time) * radius;
                const dz = -Math.sin(time) * radius;
                if (dx !== 0 || dz !== 0) {
                    this.mesh.rotation.y = Math.atan2(dx, dz);
                }
                // console.log(`NPC ${this.id}: Simulated movement to (${newX.toFixed(2)}, ${newZ.toFixed(2)})`); // Commented for reduced verbosity
            }
        };
        // Set intervals for cycling animations and movement
        this.fallbackAnimInterval = setInterval(cycleAnimation, 5000); // Every 5 seconds
        this.fallbackMoveInterval = setInterval(simulateMovement, 100); // Every 100ms for smooth movement
    }
    
    // Stop fallback behavior if server takes control
    stopFallbackBehavior() {
        if (this.fallbackAnimInterval) {
            clearInterval(this.fallbackAnimInterval);
            this.fallbackAnimInterval = null;
        }
        if (this.fallbackMoveInterval) {
            clearInterval(this.fallbackMoveInterval);
            this.fallbackMoveInterval = null;
        }
        console.log(`NPC ${this.id}: Stopped fallback behavior as server control is detected.`);
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