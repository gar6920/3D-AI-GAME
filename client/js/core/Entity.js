// 3D AI Game Platform - Base Entity class for all game entities

class Entity {
    constructor({id, name, value, color, x, y, z, rotationY, type, modelId, scale, colliderType, colliderRadius, colliderHalfExtents}) {
        this.id = id;
        this.name = name || id;
        this.value = value || 1;
        this.color = color; 
        this.type = type || 'entity'; // Type of visual representation
        this.modelId = modelId; // <-- assign modelId
        this.scale = scale;     // <-- assign scale
        this.x = x || 0;
        this.y = (y !== undefined) ? y : 1; // FIX: Use provided y if defined, otherwise default to 1
        this.z = z || 0;
        this.rotationY = rotationY || 0;
        
        // <<< Store collider properties >>>
        this.colliderType = colliderType || 'box'; // Default to box if not specified
        this.colliderRadius = colliderRadius || 1;
        // Note: Colyseus ArraySchema needs conversion if used directly
        this.colliderHalfExtents = colliderHalfExtents ? Array.from(colliderHalfExtents) : null; 
        // <<<
        
        // Initialize THREE.Vector3 position *before* calling createMesh
        this.position = new THREE.Vector3(this.x, this.y, this.z);

        // Create the mesh (which will be a Group container)
        this.mesh = this.createMesh(); // Note: createMesh now returns the group immediately
        // Ensure we have a mesh group (fallback if createMesh failed)
        if (!this.mesh) {
            console.warn(`[Entity ${this.id}] createMesh returned falsy; using fallback group.`);
            this.mesh = new THREE.Group();
            this.mesh.userData.entity = this;
        }
        // Set position and rotation
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotationY;
        // Add to scene
        if (window.scene) {
            window.scene.add(this.mesh);
            // --- Collider creation is now primarily handled by network-core.js calling tryAddCollider ---
            // --- Remove direct calls from here to avoid conflicts/redundancy ---
            // this.createEntityCollider(); // REMOVED
            
            // // Schedule another collider creation attempt after a delay // REMOVED
            // setTimeout(() => { // REMOVED
            //     this.createEntityCollider(true); // true = retry attempt // REMOVED
            // }, 1000); // Longer delay to ensure model is loaded // REMOVED
        } else {
            console.warn(`[Entity ${this.id}] window.scene not available during constructor.`);
        }
    }

    // Create the visual representation (mesh) for this entity
    // For generic entities, try to load a GLB model if modelId is present
    createMesh() {
        // --- Add readyPromise logic --- 
        let resolvePromise, rejectPromise;
        this.readyPromise = new Promise((resolve, reject) => {
            resolvePromise = resolve;
            rejectPromise = reject;
        });
        // --- End readyPromise logic ---

        // If modelId is provided, attempt to load the GLB model
        if (this.modelId) {
            // Create a group container for the model
            const modelPath = `assets/models/${this.modelId}.glb`;
            const group = new THREE.Group();
            group.userData.entity = this; // Link group back to entity early

            if (!THREE.GLTFLoader) {
                console.warn(`[Entity ${this.id}] THREE.GLTFLoader not available; using placeholder group for ${modelPath}`);
                 // Resolve promise immediately for placeholder
                 resolvePromise(); 
            } else {
                // console.log(`[Entity ${this.id}] Loading model: ${modelPath}`);
                const loader = new THREE.GLTFLoader();
                loader.load(
                    modelPath,
                    (gltf) => {
                        // --- Inside onLoad callback --- 
                        try {
                            const loadedModel = gltf.scene;
                            if (this.scale) loadedModel.scale.setScalar(this.scale);
                            loadedModel.position.set(0, 0, 0);
                            loadedModel.rotation.set(0, 0, 0);
                            // Ensure the loaded model itself also references the entity
                            loadedModel.userData.entity = this; 
                            group.add(loadedModel);
                            
                            // Compute and store bounding box collider
                            const bbox = new THREE.Box3().setFromObject(group); // Use group for bbox
                            this.boundingBox = bbox;
                            
                            this.modelLoaded = true;
                            
                            // Apply portal shaders for city_dome_150
                            if (this.modelId === 'city_dome_150') {
                                const fileLoader = new THREE.FileLoader();
                                // Load shaders via Promise.all
                                Promise.all([
                                    fileLoader.loadAsync('/assets/models/portal_vertex.glsl'),
                                    fileLoader.loadAsync('/assets/models/portal_fragment.glsl')
                                ])
                                .then(([vertexShader, fragmentShader]) => {
                                    console.log(`[Entity ${this.id}] Portal shaders loaded`);
                                    const portalMaterial = new THREE.ShaderMaterial({
                                        uniforms: {
                                            time: { value: 0 },
                                            seeds: { value: Array.from({ length: 15 }, () => new THREE.Vector2(Math.random(), Math.random())) }
                                        },
                                        vertexShader,
                                        fragmentShader,
                                        transparent: true,
                                        depthWrite: false,
                                        side: THREE.DoubleSide
                                    });
                                    loadedModel.traverse(child => {
                                        if (child.isMesh) child.material = portalMaterial;
                                    });
                                    // Animate time uniform each frame
                                    window.registerAnimationCallback(delta => {
                                        portalMaterial.uniforms.time.value += delta;
                                    });
                                })
                                .catch(error => console.error(`[Entity ${this.id}] FAILED loading portal shaders:`, error));
                            }

                            // Tag every mesh so raycaster can pick up selectable entity
                            loadedModel.traverse(child => {
                                if (child.isMesh) child.userData.entity = this;
                            });

                            // Resolve the promise AFTER model is loaded and processed
                            console.log(`[Entity ${this.id}] Model loaded, resolving readyPromise.`);
                            resolvePromise(); 
                        } catch (loadError) {
                            console.error(`[Entity ${this.id}] Error processing loaded model ${modelPath}:`, loadError);
                            rejectPromise(loadError); // Reject promise on processing error
                        }
                        // --- End onLoad logic ---
                    },
                    undefined, // onProgress callback (optional)
                    (error) => {
                        // --- Inside onError callback --- 
                        console.error(`[Entity ${this.id}] FAILED loading model ${modelPath}:`, error);
                        // Reject the promise on loading error
                        rejectPromise(error); 
                        // --- End onError logic ---
                    }
                );
            }
            return group; // Return the group immediately
        } else {
            // --- Placeholder Box Case --- 
            console.warn(`[Entity ${this.id}] No modelId provided, using box placeholder.`);
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshStandardMaterial({ color: this.color || 0x00ff00 });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.userData.entity = this;

            const group = new THREE.Group(); 
            group.add(mesh);
            group.userData.entity = this;
            
            const bbox = new THREE.Box3().setFromObject(group);
            this.boundingBox = bbox;

            this.modelLoaded = true;
            
            // Resolve promise immediately for placeholder
            console.log(`[Entity ${this.id}] Placeholder created, resolving readyPromise.`);
            resolvePromise(); 
            
            return group; 
            // --- End Placeholder Case ---
        }
    }
    
    // New helper method to standardize collider creation with better logging
    // Note: This is less critical now as network-core.js drives creation via tryAddCollider
    createEntityCollider(isRetry = false) {
        const retryMsg = isRetry ? " (RETRY)" : "";
        try {
            // <<< Log intent, but don't set defaults here >>>
            // console.log(`[Entity ${this.id}] createEntityCollider called${retryMsg}. Type from instance: ${this.colliderType}`);
            
            if (typeof window.addSelectionColliderFromEntity !== 'function') {
                console.error(`[Entity ${this.id}] window.addSelectionColliderFromEntity function NOT FOUND!${retryMsg}`);
                return;
            }
            
            // <<< Validation is good, but avoid setting defaults that might override server data >>>
            // <<< Log warnings if data seems invalid/missing when this is called (though unlikely now) >>>
            if (!this.colliderType) {
                 console.warn(`[Entity ${this.id}] Missing colliderType when createEntityCollider called${retryMsg}`);
            }
            if (this.colliderType === 'box' && (!this.colliderHalfExtents || this.colliderHalfExtents.length !== 3 || this.colliderHalfExtents.some(dim => dim <= 0))) {
                 console.warn(`[Entity ${this.id}] Invalid colliderHalfExtents when createEntityCollider called${retryMsg}:`, this.colliderHalfExtents);
            }
            if (this.colliderType === 'sphere' && (!this.colliderRadius || this.colliderRadius <= 0)) {
                 console.warn(`[Entity ${this.id}] Invalid colliderRadius when createEntityCollider called${retryMsg}:`, this.colliderRadius);
            }
            
            // Check if a collider already exists
            let existingCollider = false;
            this.mesh.traverse(child => {
                if (child.userData && child.userData.isCollider) {
                    existingCollider = true;
                }
            });
            
            if (existingCollider) {
                console.log(`[Entity ${this.id}] Collider already exists, skipping creation${retryMsg}`);
                return;
            }
            
            // Create the collider - This part is now mostly redundant as tryAddCollider is primary
            // window.addSelectionColliderFromEntity(this, this.mesh); // REMOVED - Handled by tryAddCollider
            
            // Add special flag for identity via tryAddCollider
            // this._colliderAdded = true; // REMOVED - Set within tryAddCollider
            
            // Verify collider was added (This verification logic is useful, could be moved or adapted)
            setTimeout(() => {
                let colliderFound = false;
                this.mesh.traverse(child => {
                    if (child.userData && child.userData.isCollider) {
                        colliderFound = true;
                        console.log(`[Entity ${this.id}] Collider created successfully${retryMsg} - ID: ${child.uuid}`);
                    }
                });
                
                if (!colliderFound) {
                    console.warn(`[Entity ${this.id}] Collider creation may have failed${retryMsg} - no collider found in hierarchy`);
                }
            }, 100);
        } catch (error) {
            console.error(`[Entity ${this.id}] Error creating collider${retryMsg}:`, error);
        }
    }

    // Update the entity's position and rotation
    updatePosition(pos) {
        if (!pos) {
            console.warn("updatePosition called with undefined position!");
            return;
        }
    
        const { x, y, z, rotationY } = pos;
    
        if (x !== undefined) {
            this.x = x;
            this.position.x = x; // Update Vector3 as well
            this.mesh.position.x = x;
        }
        if (y !== undefined) {
            this.y = y;
            this.position.y = y;
            this.mesh.position.y = y;
        }
        if (z !== undefined) {
            this.z = z;
            this.position.z = z;
            this.mesh.position.z = z;
        }
        if (rotationY !== undefined) {
            this.rotationY = rotationY;
            this.mesh.rotation.y = rotationY;
        }
    }
    
    // Update the entity's value
    // This is a base method that implementations can override
    updateValue(newValue) {
        if (this.value === newValue) return;
        this.value = newValue;
    }

    // Update the entity's color
    // This is a base method that implementations can override
    updateColor(newColor) {
        this.color = newColor;
    }

    // Generic update method called once per frame
    // This should be overridden by subclasses that need frame-by-frame updates
    update(deltaTime) {
        // Base implementation does nothing
    }

    // Remove entity from scene when destroyed
    destroy() {
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}

// Export the Entity class
if (typeof window !== 'undefined') {
    window.Entity = Entity;
}

if (typeof module !== 'undefined') {
    module.exports = { Entity };
} 