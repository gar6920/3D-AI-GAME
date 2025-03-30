// Default Implementation - Player class
// Loads a static GLB model

class DefaultPlayer extends Player {
    constructor(params = {}) {
        super(params); // Pass params up to parent Player class
        
        // Ensure scene is passed
        if (!params || !params.scene) {
            console.error("[DefaultPlayer] requires 'scene' in params!");
            return;
        }
        this.scene = params.scene;
        
        // Use color from params, gameConfig, or fallback to default blue
        this.color = params.color || 
                     (window.gameConfig && window.gameConfig.playerSettings.playerColor) || 
                     new THREE.Color(0x007bff); // Fallback color

        this.modelLoaded = false;

        // Animation properties
        this.mixer = null;
        this.animations = new Map(); // Store animations by name
        this.activeAction = null;

        // Create initial placeholder mesh synchronously
        this.mesh = this.createMesh(); 

        // Call async method to load the actual model
        this.loadModelAsync(); // Start loading the actual model asynchronously
        console.log(`[DefaultPlayer ${this.id}] Constructor finished. Placeholder mesh created. Starting async model load.`);
    }
    
    // Create an invisible placeholder mesh (Group)
    createMesh() {
        console.log(`[DefaultPlayer ${this.id}] createMesh called. Creating invisible placeholder.`);
        const placeholder = new THREE.Group(); // Use a Group as a container
        placeholder.userData.entity = this; // Link mesh back to entity
        if (this.position) { // Ensure position exists (from Entity constructor)
            placeholder.position.copy(this.position); // Set initial position
        } else {
            console.warn("[DefaultPlayer] this.position not set when creating placeholder!");
        }
        placeholder.visible = false; // Make it invisible initially
        return placeholder;
    }

    // Asynchronously load the GLB model and replace the placeholder
    async loadModelAsync() {
        if (this.modelLoaded) return; // Don't load if already loaded

        console.log(`[DefaultPlayer ${this.id}] Loading model for player: ${this.id}...`);
        console.log(`[DefaultPlayer ${this.id}] Calling loadModelAsync...`);

        // Ensure GLTFLoader is available
        if (!THREE.GLTFLoader) {
            console.error("[DefaultPlayer] THREE.GLTFLoader is not loaded. Make sure it's included in index.html.");
            return;
        }

        if (!this.scene) {
            console.error("[DefaultPlayer] Scene not available for loading model.");
            return;
        }
        
        const loader = new THREE.GLTFLoader(); // Use GLTFLoader
        const modelPath = window.gameConfig?.playerSettings?.playerModelPath;
        
        if (!modelPath) {
            console.error("[DefaultPlayer] Player model path not defined in gameConfig.playerSettings.playerModelPath");
            return;
        } else {
            console.log(`[DefaultPlayer ${this.id}] Model path configured: ${modelPath}`);
        }

        try {
            console.log(`[DefaultPlayer ${this.id}] Attempting to load model via GLTFLoader...`);
            const gltf = await loader.loadAsync(modelPath);
            console.log(`[DefaultPlayer ${this.id}] GLTFLoader.loadAsync successful. Loaded GLTF object:`, gltf);

            // The main mesh/model is in gltf.scene
            const newMesh = gltf.scene;
            
            // IMPORTANT: Reset the model's position within the GLB to zero
            // This ensures it rotates around its own center
            newMesh.position.set(0, 0, 0);
            
            // Configure the loaded model (scale, shadows, etc.)
            newMesh.scale.set(1.0, 1.0, 1.0); // Adjust scale if needed for GLB
            newMesh.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    console.log(`[DefaultPlayer ${this.id}] Enabled shadows for child mesh:`, child.name);
                }
            });

            // Create a parent container to handle rotation properly
            const modelContainer = new THREE.Group();
            
            // First add the model to the container
            modelContainer.add(newMesh);
            
            // Apply rotation to align the model's forward direction with the camera
            // Rotate the model 180 degrees so it faces in the same direction as the camera
            newMesh.rotation.set(0, Math.PI, 0);
            
            // VERY IMPORTANT: After adding the model to the container,
            // position the container at the entity's position
            modelContainer.position.copy(this.position);
            
            // Then apply player rotation to the container
            modelContainer.rotation.set(0, this.rotationY, 0);
            
            // Add userData to link entity
            modelContainer.userData.entity = this;
            
            // --- Animation Setup ---
            console.log(`[DefaultPlayer ${this.id}] --- Entering Animation Setup ---`); 
            // Animations are directly available in gltf.animations
            if (gltf.animations && gltf.animations.length > 0) {
                console.log(`[DefaultPlayer ${this.id}] Animation array exists and has length: ${gltf.animations.length}`); 
                console.log(`[DefaultPlayer ${this.id}] Found ${gltf.animations.length} animations. Names:`); 
                this.mixer = new THREE.AnimationMixer(newMesh); // Mixer uses the scene graph root

                gltf.animations.forEach(clip => {
                    console.log(`  - Name: ${clip.name}`); 
                    const action = this.mixer.clipAction(clip);
                    this.animations.set(clip.name, action); 
                    console.log(`[DefaultPlayer ${this.id}] Storing animation clip: ${clip.name}`);
                });

                // Attempt to play a default animation (e.g., 'Idle')
                // Make sure your GLB export has an animation named 'Idle' or adjust this
                const defaultAnimationName = 'Idle.002'; // Adjusted based on GLB file
                console.log(`[DefaultPlayer ${this.id}] Attempting to play default animation: ${defaultAnimationName}`); 
                if (this.animations.has(defaultAnimationName)) {
                    this.playAnimation(defaultAnimationName);
                } else if (gltf.animations.length > 0) {
                    // Fallback to the first animation if 'Idle' is not found
                    const fallbackAnimName = gltf.animations[0].name;
                    console.warn(`[DefaultPlayer ${this.id}] Default animation '${defaultAnimationName}' not found. Falling back to first animation: '${fallbackAnimName}'`);
                    this.playAnimation(fallbackAnimName);
                } else {
                    console.warn(`[DefaultPlayer ${this.id}] Could not determine default animation name and no animations found.`);
                }

            } else {
                console.log(`[DefaultPlayer ${this.id}] Animation array condition failed. Animations:`, gltf.animations); 
                console.log(`[DefaultPlayer ${this.id}] No animations found in the loaded model.`);
            }
            console.log(`[DefaultPlayer ${this.id}] --- Exiting Animation Setup ---`); 
            // --- End Animation Setup ---

            // --- Swap Mesh in Scene --- 
            // Remove placeholder if it exists and is in the scene
            if (this.mesh && this.scene && this.scene.getObjectById(this.mesh.id)) {
                this.scene.remove(this.mesh);
                console.log(`[DefaultPlayer ${this.id}] Removed placeholder mesh for player: ${this.id}`);
            }

            // Add the container to the scene (not the newMesh directly)
            if (this.scene) {
                this.scene.add(modelContainer);
                console.log(`[DefaultPlayer ${this.id}] Loaded model container added to scene.`);
            } else {
                console.error(`[DefaultPlayer ${this.id}] Scene object not available when adding model for player: ${this.id}`);
            }
            // --- End Swap Mesh --- 

            // Update the entity's mesh reference to the container (not the newMesh)
            this.mesh = modelContainer;
            this.modelMesh = newMesh; // Store reference to actual model for animation
            this.modelLoaded = true;

            // Set visibility based on player type and view mode
            this.updateVisibility();
            console.log(`[DefaultPlayer ${this.id}] Visibility updated. Current mesh visibility: ${this.mesh.visible}`);
            console.log(`[DefaultPlayer ${this.id}] Model setup complete for player: ${this.id}`);

        } catch (error) {
            console.error(`[DefaultPlayer ${this.id}] Error during GLTFLoader.loadAsync or processing:`, error);
            // Ensure placeholder is still added if loading fails, but keep it invisible
            if (this.mesh && this.scene && !this.scene.getObjectById(this.mesh.id)) {
                this.scene.add(this.mesh); // Add the invisible placeholder
                console.log(`[DefaultPlayer ${this.id}] Added invisible placeholder mesh due to load error for player: ${this.id}`);
            }
        }
    }

    // Function to play a specific animation
    playAnimation(name) {
        console.log(`[DefaultPlayer ${this.id}] Attempting to play animation: ${name}`);
        const newAction = this.animations.get(name);
        if (!newAction) {
            console.warn(`[DefaultPlayer ${this.id}] Animation '${name}' not found.`);
            return;
        }

        if (this.activeAction === newAction) {
            console.log(`[DefaultPlayer ${this.id}] Animation '${name}' is already active.`);
            return; // Don't restart if already playing
        }

        if (this.activeAction) {
            this.activeAction.fadeOut(0.5); // Smoothly fade out the old action
        }

        newAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.5).play();
        this.activeAction = newAction;
        console.log(`[DefaultPlayer ${this.id}] Started playing animation: ${name}`);
    }

    // NEW METHOD: Update animation based on player state
    updateAnimationBasedOnState() {
        if (!this.modelLoaded || this.animations.size === 0) return; // Ensure model and animations are loaded

        // <<< ADDED: Check for non-player movement view modes >>>
        if (window.viewMode === 'freeCamera' || window.viewMode === 'rtsView') {
            // If in a camera-only mode, force Idle and don't process inputs
            if (this.activeAction?.getClip().name !== 'Idle.002') {
                this.playAnimation('Idle.002');
            }
            return; // Exit early
        }
        // <<< END ADDED >>>

        let desiredAnimation = 'Idle.002'; // Default

        // Determine desired animation based on inputState
        // Note: Accessing window.inputState directly here. Consider passing it as a parameter if needed.
        const input = window.inputState;
        const moving = input.keys.w || input.keys.a || input.keys.s || input.keys.d;
        const jumping = input.keys.space; // Assuming space means jump is active
        // <<< MODIFIED: Invert running logic >>>
        const running = !input.keys.shift; // Run by default, walk if shift is pressed

        if (jumping) {
            desiredAnimation = 'Jumping.006';
        } else if (moving) {
            if (input.keys.a && !input.keys.d) { // Primarily strafing left
                desiredAnimation = 'Left_Strafe.006';
            } else if (input.keys.d && !input.keys.a) { // Primarily strafing right
                desiredAnimation = 'Right_Strafe.006';
            } else if (running) { // Forward/Backward Run
                 desiredAnimation = 'Running.006';
            } else { // Forward/Backward Walk
                desiredAnimation = 'Walking.006';
            }
        } else {
            desiredAnimation = 'Idle.002';
        }

        // Play the desired animation if it's different from the current one
        if (this.activeAction?.getClip().name !== desiredAnimation) {
             if (this.animations.has(desiredAnimation)) {
                this.playAnimation(desiredAnimation);
            } else {
                // Fallback if specific animation is missing (e.g., no strafe)
                if (moving) {
                    this.playAnimation(running ? 'Running.006' : 'Walking.006');
                } else {
                    this.playAnimation('Idle.002');
                }
            }
        }
    }

    // Override update to include mixer update and handle rotation
    update(deltaTime) {
        super.update(deltaTime); // Call base update if needed

        // Update the animation mixer
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
        
        // Apply rotation based on whether this is the local player or remote player
        if (this.mesh) {
            if (this.isLocalPlayer) {
                // For LOCAL player:
                // Rotation is already handled by controls.js and mousemove event
                // We just ensure the entity's rotation property stays in sync
                this.rotationY = this.mesh.rotation.y;
            } else {
                // For REMOTE players:
                // Get rotation directly from server state
                let targetRotation = 0;
                
                // Find this player in the room state by ID
                if (window.room && window.room.state && window.room.state.players) {
                    // Find the player state that matches this entity's ID
                    const players = Array.from(window.room.state.players.entries());
                    for (const [sessionId, playerState] of players) {
                        // Match player to entity either by ID or name if available
                        if ((playerState.id && playerState.id === this.id) || 
                            (playerState.name && playerState.name === this.name)) {
                            targetRotation = playerState.rotationY || 0;
                            break;
                        }
                    }
                }
                
                // Apply rotation with smooth interpolation for remote players
                if (typeof targetRotation === 'number') {
                    // Find shortest rotation path
                    let rotDiff = targetRotation - this.mesh.rotation.y;
                    if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
                    if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
                    
                    // Apply smooth rotation for remote players
                    this.mesh.rotation.y += rotDiff * 0.2;
                    // Also update entity property
                    this.rotationY = this.mesh.rotation.y;
                }
            }
        }
    }

    updateVisibility() {
        // Make sure mesh exists before trying to set visibility
        if (!this.mesh) return;

        // Important: If this is the local player in first-person view,
        // make the mesh invisible.
        if (this.isLocalPlayer && window.viewMode === 'firstPerson') {
            console.log("[DefaultPlayer] Setting mesh invisible for local player in first-person view.")
            this.mesh.visible = false;
        } else {
            // Otherwise, ensure it's visible (for remote players or non-first-person views)
            this.mesh.visible = true;
        }
    }

    // Override updatePosition to properly handle rotation without affecting position
    updatePosition(pos) {
        if (!pos) {
            console.warn("updatePosition called with undefined position!");
            return;
        }
    
        const { x, y, z, rotationY } = pos;
    
        // First update position properties on the entity
        if (x !== undefined) {
            this.x = x;
            this.position.x = x;
        }
        if (y !== undefined) {
            this.y = y;
            this.position.y = y;
        }
        if (z !== undefined) {
            this.z = z;
            this.position.z = z;
        }
        
        // Then update the mesh position
        if (this.mesh) {
            // Important: Apply position directly without using Vector3.copy 
            // to avoid issues with container/model relationships
            if (x !== undefined) this.mesh.position.x = x;
            if (y !== undefined) this.mesh.position.y = y;
            if (z !== undefined) this.mesh.position.z = z;
        }
        
        // Update rotation separately
        if (rotationY !== undefined) {
            this.rotationY = rotationY;
            if (this.mesh) this.mesh.rotation.y = rotationY;
        }
    }
}

// Register this class with the entity factory if available
if (window.entityFactory) {
    window.entityFactory.registerType('defaultPlayer', DefaultPlayer);
}

// Make available globally
if (typeof window !== 'undefined') {
    window.DefaultPlayer = DefaultPlayer;
}

if (typeof module !== 'undefined') {
    module.exports = { DefaultPlayer };
}