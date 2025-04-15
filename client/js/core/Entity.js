// 3D AI Game Platform - Base Entity class for all game entities

class Entity {
    constructor({id, name, value, color, x, y, z, rotationY, type, modelId, scale}) {
        this.id = id;
        this.name = name || id;
        this.value = value || 1;
        this.color = color; 
        this.type = type; // Type of visual representation
        this.modelId = modelId; // <-- assign modelId
        this.scale = scale;     // <-- assign scale
        this.x = x || 0;
        this.y = y || 1;
        this.z = z || 0;
        this.rotationY = rotationY || 0;
        
        // Initialize THREE.Vector3 position *before* calling createMesh
        this.position = new THREE.Vector3(this.x, this.y, this.z);

        // Create the mesh - this should be implemented by subclasses
        this.mesh = this.createMesh();
        if (this.mesh) {
            // Set mesh position using the Vector3
            this.mesh.position.copy(this.position);
            this.mesh.rotation.y = this.rotationY;
            
            // Store a reference to this entity in the mesh's userData
            this.mesh.userData.entity = this;
        }
    }

    // Create the visual representation (mesh) for this entity
    // For generic entities, try to load a GLB model if modelId is present
    createMesh() {
        // If modelId is provided, attempt to load the GLB model
        if (this.modelId) {
            if (!THREE.GLTFLoader) {
                console.error(`[Entity ${this.id}] THREE.GLTFLoader is not loaded.`);
                return null;
            }
            const modelPath = `assets/models/${this.modelId}.glb`;
            const loader = new THREE.GLTFLoader();
            const group = new THREE.Group();
            group.userData.entity = this;
            // Async load the model
            loader.load(
                modelPath,
                (gltf) => {
                    const loadedModel = gltf.scene;
                    // Apply scale if present
                    if (this.scale) loadedModel.scale.setScalar(this.scale);
                    // Set position and rotation
                    loadedModel.position.copy(this.position);
                    loadedModel.rotation.y = this.rotationY;
                    loadedModel.userData.entity = this;
                    group.add(loadedModel);
                    // Optionally: add to scene if not already
                    if (window.scene && !window.scene.getObjectById(group.id)) {
                        window.scene.add(group);
                    }
                    console.log(`[Entity ${this.id}] Model loaded and added to group.`);
                },
                undefined,
                (error) => {
                    console.error(`[Entity ${this.id}] Error loading model:`, error);
                }
            );
            return group;
        } else {
            // If no modelId, create a simple box as a placeholder
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshStandardMaterial({ color: this.color || 0x00ff00 });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(this.position);
            mesh.rotation.y = this.rotationY;
            mesh.userData.entity = this;
            console.warn(`[Entity ${this.id}] No modelId provided, using box placeholder.`);
            return mesh;
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