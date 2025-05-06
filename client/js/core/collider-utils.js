// Utility to create an invisible selection collider mesh from server-sent collider fields
// Usage: addSelectionColliderFromEntity(colliderData, clientEntity, parentMesh)

(function(){
    function addSelectionColliderFromEntity(colliderData, clientEntity, parentMesh, scale = 1){
        const entityId = clientEntity?.id || 'unknown';
        const modelId = clientEntity?.modelId || 'unknown'; // Get modelId for conditional logging
        const actualEntityType = clientEntity.type || 
                               (clientEntity._isPlayer ? 'player' : 'entity'); 
        const isStructureOfInterest = actualEntityType === 'entity' && modelId !== 'hover_cube';

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
                     console.error(`[ColliderDebug] [ColliderUtils ${entityId}] Invalid or missing radius from server: ${radius}. Skipping collider creation.`);
                     return;
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
                if (!extents || !Array.isArray(extents) || extents.length !== 3) {
                    console.warn(`[ColliderDebug] [ColliderUtils ${entityId}] Invalid halfExtents format from server: ${JSON.stringify(extents)}. Attempting to convert or use default.`);
                    validExtents = [1, 1, 1]; // Default fallback if data is invalid
                    if (extents && typeof extents === 'object' && !Array.isArray(extents)) {
                        // Convert object to array if it's an object with numeric properties
                        validExtents = [extents[0] || 1, extents[1] || 1, extents[2] || 1];
                    } else if (extents && Array.isArray(extents)) {
                        // Ensure all elements are numbers greater than 0
                        validExtents = extents.map(e => typeof e === 'number' && e > 0 ? e : 1);
                    }
                }
                if (validExtents.some(dim => typeof dim !== 'number' || dim <= 0)) {
                    console.warn(`[ColliderDebug] [ColliderUtils ${entityId}] Some dimensions in halfExtents are invalid: ${JSON.stringify(validExtents)}. Using default values.`);
                    validExtents = [1, 1, 1];
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