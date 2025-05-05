// Utility to create an invisible selection collider mesh from server-sent collider fields
// Usage: addSelectionColliderFromEntity(colliderData, clientEntity, parentMesh)

(function(){
    function addSelectionColliderFromEntity(colliderData, clientEntity, parentMesh){
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
                let effectiveRadius = radius || 1;
                 if (effectiveRadius <= 0) { 
                     if (isStructureOfInterest) console.warn(`[ColliderDebug] [ColliderUtils ${entityId}] Invalid radius from server: ${radius}. Using fallback 1.`);
                     effectiveRadius = 1;
                 }
                mesh = new THREE.Mesh(
                    new THREE.SphereGeometry(effectiveRadius,16,12), 
                    new THREE.MeshBasicMaterial({
                        color: 0x00ff00, // Green for spheres
                        wireframe: true, 
                        depthTest: false,
                        transparent: true,
                        opacity: 0.8
                    })
                );
                if (isStructureOfInterest) console.log(`[ColliderDebug] [ColliderUtils ${entityId}] Created SPHERE geometry with effective radius: ${effectiveRadius}`);
            } else if(type === 'box'){
                let he = extents;
                if (!he || he.length !== 3 || he.some(dim => dim <= 0)) { 
                     if (isStructureOfInterest) console.warn(`[ColliderDebug] [ColliderUtils ${entityId}] Invalid halfExtents from server: ${JSON.stringify(extents)}. Using fallback [1,1,1].`);
                     he = [1, 1, 1]; 
                }
                mesh = new THREE.Mesh(
                    new THREE.BoxGeometry(he[0]*2, he[1]*2, he[2]*2), 
                    new THREE.MeshBasicMaterial({
                        color: 0x00ffff, // Cyan for boxes
                        wireframe: true, 
                        depthTest: false,
                        transparent: true,
                        opacity: 0.8
                    })
                );
                 if (isStructureOfInterest) console.log(`[ColliderDebug] [ColliderUtils ${entityId}] Created BOX geometry with effective halfExtents: ${JSON.stringify(he)}`);
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