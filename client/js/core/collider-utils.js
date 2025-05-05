// Utility to create an invisible selection collider mesh from server-sent collider fields
// Usage: addSelectionColliderFromEntity(colliderData, clientEntity, parentMesh)

(function(){
    function addSelectionColliderFromEntity(colliderData, clientEntity, parentMesh){
        const entityId = clientEntity?.id || 'unknown';
        console.log(`[ColliderUtils ${entityId}] addSelectionColliderFromEntity called. Data:`, colliderData, `Parent: ${parentMesh?.uuid}`);
        
        if(!colliderData || !clientEntity || !parentMesh) {
            console.error(`[ColliderUtils ${entityId}] Missing colliderData, clientEntity, or parentMesh!`);
            return;
        }
        if (!colliderData.type) {
            console.warn(`[ColliderUtils ${entityId}] No collider type provided in colliderData.`);
            return;
        }
        
        const type = colliderData.type;
        const radius = colliderData.radius;
        const extents = colliderData.halfExtents;
        console.log(`[ColliderUtils ${entityId}] Using server data - Type: ${type}, Radius: ${radius}, Extents: ${JSON.stringify(extents)}`);
        
        let mesh;
        try {
            if(type === 'sphere'){
                const effectiveRadius = radius || 1;
                 if (effectiveRadius <= 0) { 
                     console.warn(`[ColliderUtils ${entityId}] Invalid radius from server: ${radius}. Using fallback 1.`);
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
                console.log(`[ColliderUtils ${entityId}] Created SPHERE geometry with effective radius: ${effectiveRadius}`);
            } else if(type === 'box'){
                let he = extents;
                if (!he || he.length !== 3 || he.some(dim => dim <= 0)) { 
                     console.warn(`[ColliderUtils ${entityId}] Invalid halfExtents from server: ${JSON.stringify(extents)}. Using fallback [1,1,1].`);
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
                 console.log(`[ColliderUtils ${entityId}] Created BOX geometry with effective halfExtents: ${JSON.stringify(he)}`);
            }
        } catch (error) {
            console.error(`[ColliderUtils ${entityId}] Error creating geometry:`, error);
            return;
        }
        
        if(!mesh) {
            console.warn(`[ColliderUtils ${entityId}] Mesh creation failed for type: ${type}`);
            return;
        }
        
        mesh.userData.isCollider = true;
        mesh.userData.entity = clientEntity;
        mesh.visible = window.showSelectionColliders !== undefined ? window.showSelectionColliders : false;
        
        const entityType = clientEntity.type || clientEntity.entityType || (clientEntity._isPlayer ? 'player' : 'unknown');
        mesh.userData.entityType = entityType;
        
        console.log(`[ColliderUtils ${entityId}] Mesh created successfully (UUID: ${mesh.uuid}). Setting userData and adding to parent (UUID: ${parentMesh.uuid}). Initial visibility: ${mesh.visible}`);
        
        mesh.renderOrder = 999;
        
        try {
            parentMesh.add(mesh);
            console.log(`[ColliderUtils ${entityId}] Successfully added collider mesh to parent.`);
            
            if (entityType === 'entity') {
                mesh.position.set(0, 0, 0);
                console.log(`[ColliderUtils ${entityId}] Structure collider - resetting position to parent origin.`);
            }
        } catch (error) {
            console.error(`[ColliderUtils ${entityId}] Error adding mesh to parent:`, error);
        }
    }
    if(typeof window !== 'undefined'){
        window.addSelectionColliderFromEntity = addSelectionColliderFromEntity;
    }
    if(typeof module!=='undefined'){
        module.exports = { addSelectionColliderFromEntity };
    }
})(); 