import * as THREE from '/vendor/three.module.js';

class SelectionController {
    constructor(scene, camera, ui) {
        this.scene = scene;
        this.camera = camera; // We might need the camera for raycasting
        this.ui = ui; // Reference to PlayerUI for future updates
        this.raycaster = new THREE.Raycaster();
        this.selectedEntity = null;
        this.selectableEntities = []; // We'll need to populate this

        console.log("SelectionController initialized.");
        // TODO: Add visual indicators for selection (e.g., outline effect)
    }

    // Call this method when entities are added/removed to keep the list updated
    updateSelectableEntities(entities) {
        this.selectableEntities = entities;
        // Filter entities that should be selectable (e.g., exclude terrain, effects)
        // console.log("Selectable entities updated:", this.selectableEntities.length);
    }

    // Attempt selection based on mouse coordinates
    selectAt(screenX, screenY) {
        const mouse = new THREE.Vector2(
            (screenX / window.innerWidth) * 2 - 1,
            -(screenY / window.innerHeight) * 2 + 1
        );

        this.raycaster.setFromCamera(mouse, this.camera);

        // Gather all collider meshes (children with userData.isCollider === true) for raycasting
        let meshesToIntersect = [];
        this.selectableEntities.forEach(entity => {
            if (entity.mesh) {
                entity.mesh.traverse(child => {
                    if (child.userData && child.userData.isCollider) {
                        meshesToIntersect.push(child);
                    }
                });
            }
        });

        if (meshesToIntersect.length === 0) {
            // console.log("No meshes available for intersection test.");
            // Deselect if clicking empty space
            this.setSelectedEntity(null);
            return;
        }

        const intersects = this.raycaster.intersectObjects(meshesToIntersect, true); // true for recursive

        if (intersects.length > 0) {
            // Find the entity corresponding to the closest intersected mesh
            let closestIntersection = intersects[0];
            let intersectedObject = closestIntersection.object;

            // Traverse up the hierarchy to find the root mesh associated with an entity
            while (intersectedObject.parent && !intersectedObject.userData.entity) {
                 intersectedObject = intersectedObject.parent;
            }

            if (intersectedObject.userData.entity) {
                this.setSelectedEntity(intersectedObject.userData.entity);
            } else {
                console.warn("Clicked on mesh but couldn't find associated entity:", closestIntersection.object);
                this.setSelectedEntity(null); // Deselect if clicked object isn't linked to an entity
            }
        } else {
            // Clicked on empty space
            this.setSelectedEntity(null);
        }
    }

    setSelectedEntity(entity) {
        if (this.selectedEntity === entity) {
            return; // No change
        }

        // TODO: Remove visual indicator from previously selected entity
        if (this.selectedEntity && this.selectedEntity.mesh) {
             // Example: Remove outline or change material back
             // console.log("Deselecting:", this.selectedEntity.id);
        }


        this.selectedEntity = entity;

        if (this.selectedEntity) {
            console.log(`Entity selected: ${this.selectedEntity.id} (Type: ${this.selectedEntity.constructor.name})`);
            // TODO: Add visual indicator to the newly selected entity
            if (this.selectedEntity.mesh) {
                // Example: Add outline or highlight material
            }
            // TODO: Trigger UI update (Step 4a)
            // this.ui.updateSelectionPanel({ entity: this.selectedEntity /*, actions: [] */ }); // Placeholder data
        } else {
            console.log("Selection cleared.");
            // TODO: Clear UI panel (Step 4a)
            // this.ui.updateSelectionPanel(null);
        }

        // TODO: Send selection to server (Step 2)
        // network.send('select_entities', { ids: this.selectedEntity ? [this.selectedEntity.id] : [] });
    }

    getSelectedEntity() {
        return this.selectedEntity;
    }

    // Helper to get the current camera (needed if camera changes)
    setCamera(camera) {
        this.camera = camera;
        this.raycaster.camera = camera; // Update raycaster's camera too
    }
}

export { SelectionController };

// Wrap NPC creation to ensure linking
if (typeof window.createNpcVisual === 'function') {
    const originalCreateNpcVisual = window.createNpcVisual;
    window.createNpcVisual = function(npcData) {
         const npc = originalCreateNpcVisual(npcData);
         if (npc && npc.mesh) {
             npc.mesh.userData.entity = npc; // Ensure link
         }
         return npc;
    }
    console.log("Wrapped window.createNpcVisual for mesh linking.");
} else {
    console.warn("window.createNpcVisual not found for wrapping.");
}

// Wrap remote player updates to ensure linking
if (typeof window.updateRemotePlayers === 'function') {
    const originalUpdateRemotePlayers = window.updateRemotePlayers;
    window.updateRemotePlayers = function(delta) {
         originalUpdateRemotePlayers(delta);
         if (window.remotePlayers) {
             window.remotePlayers.forEach((player, id) => {
                 if (player && player.mesh && !player.mesh.userData.entity) {
                     player.mesh.userData.entity = player; // Ensure link
                 }
             });
         }
    }
    console.log("Wrapped window.updateRemotePlayers for mesh linking.");
} else {
    console.warn("window.updateRemotePlayers not found for wrapping.");
}
