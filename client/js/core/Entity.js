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
        this.y = (y !== undefined) ? y : 1; // FIX: Use provided y if defined, otherwise default to 1
        this.z = z || 0;
        this.rotationY = rotationY || 0;
        
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
            console.log(`[Entity ${this.id}] Added mesh group (ID: ${this.mesh.id}) to scene.`);
        } else {
            console.warn(`[Entity ${this.id}] window.scene not available during constructor.`);
        }
    }

    // Create the visual representation (mesh) for this entity
    // For generic entities, try to load a GLB model if modelId is present
    createMesh() {
        // If modelId is provided, attempt to load the GLB model
        if (this.modelId) {
            // Create a group container for the model
            const modelPath = `assets/models/${this.modelId}.glb`;
            const group = new THREE.Group();
            group.userData.entity = this;
            if (!THREE.GLTFLoader) {
                console.warn(`[Entity ${this.id}] THREE.GLTFLoader not available; using placeholder group for ${modelPath}`);
            } else {
                console.log(`[Entity ${this.id}] Loading model: ${modelPath}`);
                const loader = new THREE.GLTFLoader();
                loader.load(
                    modelPath,
                    (gltf) => {
                        const loadedModel = gltf.scene;
                        if (this.scale) loadedModel.scale.setScalar(this.scale);
                        loadedModel.position.set(0, 0, 0);
                        loadedModel.rotation.set(0, 0, 0);
                        loadedModel.userData.entity = this;
                        group.add(loadedModel);
                        // Compute and store bounding box collider
                        const bbox = new THREE.Box3().setFromObject(group);
                        this.boundingBox = bbox;
                        console.log(`[Entity ${this.id}] Bounding box computed: min${bbox.min.toArray()}, max${bbox.max.toArray()}`);
                    },
                    undefined,
                    (error) => {
                        console.error(`[Entity ${this.id}] FAILED loading model ${modelPath}:`, error);
                    }
                );
            }
            return group;
        } else {
            // If no modelId, create a simple box as a placeholder
            console.warn(`[Entity ${this.id}] No modelId provided, using box placeholder.`);
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshStandardMaterial({ color: this.color || 0x00ff00 });
            const mesh = new THREE.Mesh(geometry, material);
            // Position/rotation is handled by constructor for this.mesh
            // mesh.position.copy(this.position);
            // mesh.rotation.y = this.rotationY;
            mesh.userData.entity = this;
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