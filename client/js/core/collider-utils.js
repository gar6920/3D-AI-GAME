// Utility to create an invisible selection collider mesh from server-sent collider fields
// Usage: addSelectionColliderFromEntity(colliderData, clientEntity, parentMesh)

(function(){
    function addSelectionColliderFromEntity(colliderData, clientEntity, parentMesh, scale = 1){
        const entityId = clientEntity?.id || 'unknown';
        const modelId = clientEntity?.modelId || 'unknown'; // Get modelId for conditional logging
        const actualEntityType = clientEntity.type || 
                               (clientEntity._isPlayer ? 'player' : 'entity'); 
        const isStructureOfInterest = actualEntityType === 'entity' && modelId !== 'hover_cube';
        const isLocalPlayer = clientEntity?.isLocalPlayer;

        if (isStructureOfInterest) console.log(`[ColliderDebug] [ColliderUtils ${entityId}] addSelectionColliderFromEntity called. Data:`, colliderData, `Parent: ${parentMesh?.uuid}`);
        
        if(!colliderData || !clientEntity || !parentMesh) {
            console.error(`[ColliderDebug] [ColliderUtils ${entityId}] Missing colliderData, clientEntity, or parentMesh!`);
            return;
        }
        if (!colliderData.type) {
            if (isStructureOfInterest) console.warn(`[ColliderDebug] [ColliderUtils ${entityId}] No collider type provided in colliderData.`);
            return;
        }
        
        const type = colliderData.type;
        const radius = colliderData.radius;
        const extents = colliderData.halfExtents;
        if (isStructureOfInterest) console.log(`[ColliderDebug] [ColliderUtils ${entityId}] Using server data - Type: ${type}, Radius: ${radius}, Extents: ${JSON.stringify(extents)}`);
        
        let mesh;
        try {
            if(type === 'sphere'){
                if (typeof radius !== 'number' || radius <= 0) { 
                    if (isLocalPlayer) {
                        console.warn(`[ColliderDebug] [ColliderUtils ${entityId}] Invalid or missing radius for local player from server: ${radius}. Proceeding with default radius for debugging.`);
                    } else {
                        console.error(`[ColliderDebug] [ColliderUtils ${entityId}] Invalid or missing radius from server: ${radius}. Skipping collider creation.`);
                        return;
                    }
                }
                mesh = new THREE.Mesh(
                    new THREE.SphereGeometry(radius, 16, 12), 
                    new THREE.MeshBasicMaterial({
                        color: 0x00ff00, // Green for spheres
                        wireframe: true, 
                        depthTest: false,
                        transparent: true,
                        opacity: 0.8
                    })
                );
                if (isStructureOfInterest) console.log(`[ColliderDebug] [ColliderUtils ${entityId}] Created SPHERE geometry with server radius: ${radius}`);
            } else if(type === 'box'){
                // Fix for handling halfExtents from server
                let validExtents = extents;
                // Convert ArraySchema to a plain array for validation and use
                const plainExtents = extents && typeof extents.toArray === 'function' ? extents.toArray() : (Array.isArray(extents) ? extents : null);

                if (!plainExtents || !Array.isArray(plainExtents) || plainExtents.length !== 3) {
                    if (isLocalPlayer) {
                        console.warn(`[ColliderDebug] [ColliderUtils ${entityId}] Invalid or missing halfExtents for local player from server: ${JSON.stringify(extents)}. Proceeding with default dimensions for debugging.`);
                        // Default to some small box for debugging local player if extents are bad
                        // validExtents = [0.5, 1, 0.5]; // Example default, adjust as needed
                    } else {
                        console.error(`[ColliderDebug] [ColliderUtils ${entityId}] Invalid or missing halfExtents from server: ${JSON.stringify(extents)}. Skipping collider creation.`);
                        return;
                    }
                } else {
                    // If plainExtents are valid, use them
                    validExtents = plainExtents;
                }

                if (validExtents.some(dim => typeof dim !== 'number' || dim <= 0)) {
                    if (isLocalPlayer) {
                        console.warn(`[ColliderDebug] [ColliderUtils ${entityId}] Some dimensions in halfExtents are invalid for local player: ${JSON.stringify(validExtents)}. Proceeding with default values for debugging.`);
                        // Potentially set default validExtents again if any dim is bad
                        // validExtents = [0.5, 1, 0.5]; 
                    } else {
                        console.error(`[ColliderDebug] [ColliderUtils ${entityId}] Some dimensions in halfExtents are invalid: ${JSON.stringify(validExtents)}. Skipping collider creation.`);
                        return;
                    }
                }
                mesh = new THREE.Mesh(
                    new THREE.BoxGeometry(validExtents[0]*2, validExtents[1]*2, validExtents[2]*2), 
                    new THREE.MeshBasicMaterial({
                        color: 0xffff00, // Yellow for boxes
                        wireframe: true, 
                        depthTest: false,
                        transparent: true,
                        opacity: 0.8
                    })
                );
                if (isStructureOfInterest) console.log(`[ColliderDebug] [ColliderUtils ${entityId}] Created BOX geometry with server halfExtents: ${JSON.stringify(validExtents)}`);
            } else {
                if (isStructureOfInterest) console.warn(`[ColliderDebug] [ColliderUtils ${entityId}] Unsupported collider type from server: ${type}. Defaulting to sphere.`);
                mesh = new THREE.Mesh(
                    new THREE.SphereGeometry(scale, 16, 12), 
                    new THREE.MeshBasicMaterial({
                        color: 0x00ffff, // Cyan for fallback
                        wireframe: true, 
                        depthTest: false,
                        transparent: true,
                        opacity: 0.8
                    })
                );
            }
        } catch (error) {
            console.error(`[ColliderDebug] [ColliderUtils ${entityId}] Error creating geometry:`, error);
            return;
        }
        
        if(!mesh) {
            if (isStructureOfInterest) console.warn(`[ColliderDebug] [ColliderUtils ${entityId}] Mesh creation failed for type: ${type}`);
            return;
        }
        
        mesh.userData.isCollider = true;
        mesh.userData.entity = clientEntity;
        mesh.visible = window.showSelectionColliders !== undefined ? window.showSelectionColliders : false;
        
        mesh.userData.entityType = actualEntityType;
        
        if (isStructureOfInterest) console.log(`[ColliderDebug] [ColliderUtils ${entityId}] Mesh created successfully (UUID: ${mesh.uuid}). Setting userData (type: ${actualEntityType}) and adding to parent (UUID: ${parentMesh.uuid}). Initial visibility: ${mesh.visible}`);
        
        mesh.renderOrder = 999;
        
        try {
            parentMesh.add(mesh);
            if (isStructureOfInterest) console.log(`[ColliderDebug] [ColliderUtils ${entityId}] Successfully added collider mesh to parent.`);
            
            if (actualEntityType === 'entity') { 
                mesh.position.set(0, 0, 0);
                if (isStructureOfInterest) console.log(`[ColliderDebug] [ColliderUtils ${entityId}] Structure collider - resetting position to parent origin.`);
            }
        } catch (error) {
            console.error(`[ColliderDebug] [ColliderUtils ${entityId}] Error adding mesh to parent:`, error);
        }
    }
    if(typeof window !== 'undefined'){
        window.addSelectionColliderFromEntity = addSelectionColliderFromEntity;
    }
    if(typeof module!=='undefined'){
        module.exports = { addSelectionColliderFromEntity };
    }
})(); 