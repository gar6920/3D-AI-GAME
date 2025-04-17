// 3D AI Game Platform - Building Entity class

// NOTE: This file is now browser-compatible. Assumes Entity is loaded globally on window.
// DO NOT use import/export in this file.

class Building extends window.Entity {
    constructor(params) {
        super(params);
        // Any building-specific initialization can go here
        // e.g., this.structureType = params.structureType;
        this.structureType = params.structureType;
        // You can add more building-specific properties as needed
    }

    // Optionally override createMesh for custom building visuals
    createMesh() {
        // Use modelId if provided, otherwise fallback to a default building mesh
        if (this.modelId) {
            return super.createMesh();
        } else {
            // Default: larger box for buildings
            const geometry = new THREE.BoxGeometry(4, 3, 4);
            const material = new THREE.MeshStandardMaterial({ color: this.color || 0x888888 });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(this.position);
            mesh.rotation.y = this.rotationY;
            mesh.userData.entity = this;
            return mesh;
        }
    }

    // Optionally override update/destroy if buildings need special logic
}

// Export for use in EntityFactory
if (typeof window !== 'undefined') {
    window.Building = Building;
}
// No export statements for browser compatibility.
}
// No export statements for browser compatibility.
