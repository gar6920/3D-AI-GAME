// 3D AI Game Platform - Core Player entity class

class Player extends Entity {
    constructor(params) {
        super(params);
        this.isPlayer = true;
        this.isLocalPlayer = params.isLocalPlayer || false;
        
        // Ensure scene is passed
        if (!params || !params.scene) {
            console.error("[Player] requires 'scene' in params!");
            return;
        }
        this.scene = params.scene;
        
        // Player-specific properties
        this.moveSpeed = params.moveSpeed || 5.0;
        this.jumpHeight = params.jumpHeight || 5.0;
        this.isJumping = false;
        this.isColliding = false;
        
        // Use color from params, gameConfig, or fallback color
        this.color = params.color || 
                    (window.gameConfig && window.gameConfig.playerSettings.playerColor) || 
                    new THREE.Color(0x007bff); // Default blue
        
        // Animation properties
        this.modelLoaded = false;
        this.mixer = null;
        this.animations = new Map(); // Store animations by name
        this.activeAction = null;
        this.controls = null;
        this.animationsLoaded = false;
        
        // Model properties
        this.modelPath = params.modelPath || 'assets/models/human_man.glb'; // Default or provided model
        
        // Create initial placeholder mesh synchronously
        this.mesh = this.createMesh();
        
        // Start loading the model asynchronously
        this.loadModelAsync();
        console.log(`[Player ${this.id}] Constructor finished. Starting async model load.`);
    }
    
    // Create an invisible placeholder mesh (Group)
    createMesh() {
        console.log(`[Player ${this.id}] Creating invisible placeholder mesh.`);
        const placeholder = new THREE.Group(); // Use a Group as a container
        placeholder.userData.entity = this; // Link mesh back to entity
        if (this.position) { // Ensure position exists (from Entity constructor)
            placeholder.position.copy(this.position); // Set initial position
        }
        placeholder.visible = false; // Make it invisible initially
        return placeholder;
    }
    
    // Asynchronously load the GLB model and replace the placeholder
    async loadModelAsync() {
        if (this.modelLoaded) return; // Don't load if already loaded
        
        console.log(`[Player ${this.id}] Loading model: ${this.modelPath}`);
        
        // Ensure GLTFLoader is available
        if (!THREE.GLTFLoader) {
            console.error("[Player] THREE.GLTFLoader is not loaded.");
            return;
        }
        
        if (!this.scene) {
            console.error("[Player] Scene not available for loading model.");
            return;
        }
        
        try {
            const loader = new THREE.GLTFLoader();
            const gltf = await loader.loadAsync(this.modelPath);
            console.log(`[Player ${this.id}] Model loaded successfully.`);
            
            // The main mesh/model is in gltf.scene
            const newMesh = gltf.scene;
            
            // Reset the model's position to zero (for proper centering)
            newMesh.position.set(0, 0, 0);
            
            // Configure shadows
            newMesh.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.userData.entity = this; // enable RTS selection
                }
            });
            
            // Create a parent container for the model
            const modelContainer = new THREE.Group();
            modelContainer.add(newMesh);
            
            // Apply implementation-specific rotation if provided
            if (this.modelRotation) {
                newMesh.rotation.set(
                    this.modelRotation.x || 0,
                    this.modelRotation.y || 0,
                    this.modelRotation.z || 0
                );
            }
            
            // Apply implementation-specific scale if provided
            if (this.modelScale) {
                newMesh.scale.copy(this.modelScale);
            }
            
            // Position the container at the entity's position
            modelContainer.position.copy(this.position);
            
            // Apply current rotation
            modelContainer.rotation.set(0, this.rotationY || 0, 0);
            
            // Add userData to link entity
            modelContainer.userData.entity = this;
            
            // Setup animations
            this.setupAnimations(gltf);
            
            // Swap mesh in scene
            if (this.mesh && this.scene.getObjectById(this.mesh.id)) {
                this.scene.remove(this.mesh);
            }
            
            // Add the container to the scene
            this.scene.add(modelContainer);
            
            // Update the entity's mesh reference to the container
            this.mesh = modelContainer;
            this.modelMesh = newMesh; // Store reference to actual model for animation
            this.modelLoaded = true;
            this.animationsLoaded = true;
            
            // Set visibility based on player type and view mode
            this.updateVisibility();
            console.log(`[Player ${this.id}] Model setup complete.`);
            
            if(typeof addSelectionColliderFromEntity==='function'){
                addSelectionColliderFromEntity(this, modelContainer);
            }
            
        } catch (error) {
            console.error(`[Player ${this.id}] Error loading model:`, error);
            // Ensure placeholder is still added if loading fails
            if (this.mesh && this.scene && !this.scene.getObjectById(this.mesh.id)) {
                this.scene.add(this.mesh);
            }
        }
    }
    
    // Setup animations from loaded model
    setupAnimations(gltf) {
        if (!gltf.animations || gltf.animations.length === 0) {
            console.log(`[Player ${this.id}] No animations found in model.`);
            return;
        }
        
        console.log(`[Player ${this.id}] Setting up ${gltf.animations.length} animations.`);
        this.mixer = new THREE.AnimationMixer(gltf.scene);
        
        gltf.animations.forEach(clip => {
            const action = this.mixer.clipAction(clip);
            this.animations.set(clip.name, action);
        });
        
        // Start with idle animation
        const idleAnimationName = this.getAnimationName('idle');
        if (this.animations.has(idleAnimationName)) {
            this.playAnimation(idleAnimationName);
        } else if (gltf.animations.length > 0) {
            // Fallback to the first animation
            this.playAnimation(gltf.animations[0].name);
        }
    }
    
    // Play a specific animation
    playAnimation(name) {
        const newAction = this.animations.get(name);
        if (!newAction) {
            console.warn(`[Player ${this.id}] Animation '${name}' not found.`);
            return;
        }
        
        if (this.activeAction === newAction) return; // Don't restart if already playing
        
        if (this.activeAction) {
            this.activeAction.fadeOut(0.5); // Smoothly fade out the old action
        }
        
        newAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.5).play();
        this.activeAction = newAction;
    }
    
    // Map animation state to specific animation name (to be overridden by implementations)
    getAnimationName(state) {
        // Default generic mapping - implementations should override with their specific animation names
        return state; // Direct mapping by default
    }
    
    // Update animation based on input state
    updateAnimationBasedOnState() {
        if (!this.modelLoaded || !this.animations.size) return;
        
        // Don't process player animations in camera-only modes
        if (window.viewMode === 'freeCamera' || window.viewMode === 'rtsView') {
            const idleAnim = this.getAnimationName('idle');
            if (this.activeAction?.getClip().name !== idleAnim) {
                this.playAnimation(idleAnim);
            }
            return;
        }
        
        // Determine animation state based on input
        let state = 'idle';
        const input = window.inputState;
        
        if (!input) return;
        
        const moving = input.keys.w || input.keys.a || input.keys.s || input.keys.d;
        const jumping = input.keys.space;
        const running = !input.keys.shift; // Run by default, walk if shift is pressed
        
        if (jumping) {
            state = 'jump';
        } else if (moving) {
            if (input.keys.a && !input.keys.d) {
                state = 'strafeLeft';
            } else if (input.keys.d && !input.keys.a) {
                state = 'strafeRight';
            } else if (running) {
                state = 'run';
            } else {
                state = 'walk';
            }
        }
        
        // Get implementation-specific animation name
        const animationName = this.getAnimationName(state);
        
        // Play the animation if it's different from current
        if (this.activeAction?.getClip().name !== animationName) {
            if (this.animations.has(animationName)) {
                this.playAnimation(animationName);
            } else {
                // Fallback to basic animations
                if (state === 'run' || state === 'walk') {
                    this.playAnimation(this.getAnimationName(running ? 'run' : 'walk'));
                } else {
                    this.playAnimation(this.getAnimationName('idle'));
                }
            }
        }
    }
    
    // Update visibility based on player type and camera mode
    updateVisibility() {
        if (!this.mesh) return;
        
        if (this.isLocalPlayer && window.viewMode === 'firstPerson') {
            this.mesh.visible = false;
        } else {
            this.mesh.visible = true;
        }
    }
    
    // Update method called each frame
    update(deltaTime) {
        super.update(deltaTime);
        
        // Update animation mixer
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
        
        // Update animation state
        if (this.isLocalPlayer) {
            this.updateAnimationBasedOnState();
        }
        
        // Handle rotation
        this.updateRotation();
    }
    
    // Handle rotation updates
    updateRotation() {
        if (!this.mesh) return;
        
        if (this.isLocalPlayer) {
            // Local player rotation is handled by controls.js
            // Just ensure the entity's rotation property stays in sync
            this.rotationY = this.mesh.rotation.y;
        } else {
            // Remote players: get rotation from server state
            let targetRotation = 0;
            
            // Find this player in room state
            if (window.room && window.room.state && window.room.state.players) {
                const players = Array.from(window.room.state.players.entries());
                for (const [sessionId, playerState] of players) {
                    if ((playerState.id && playerState.id === this.id) || 
                        (playerState.name && playerState.name === this.name)) {
                        targetRotation = playerState.rotationY || 0;
                        break;
                    }
                }
            }
            
            // Apply rotation with smooth interpolation
            if (typeof targetRotation === 'number') {
                // Find shortest rotation path
                let rotDiff = targetRotation - this.mesh.rotation.y;
                if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
                if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
                
                // Apply smooth rotation for remote players
                this.mesh.rotation.y += rotDiff * 0.2;
                this.rotationY = this.mesh.rotation.y;
            }
        }
    }
    
    // Update position from network or local movement
    updatePosition(pos) {
        if (!pos) return;
        
        const { x, y, z, rotationY } = pos;
        
        // Update entity properties
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
        
        // Update mesh position
        if (this.mesh) {
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

// Make available globally
window.Player = Player;

// Export for use in other modules
if (typeof module !== 'undefined') {
    module.exports = { Player };
}