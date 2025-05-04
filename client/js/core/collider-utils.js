// Utility to create an invisible selection collider mesh from server-sent collider fields
// Usage: addSelectionColliderFromEntity(entity, parentGroup)

(function(){
    function addSelectionColliderFromEntity(entity, parent){
        console.log(`[ColliderUtils] addSelectionColliderFromEntity called for entity: ${entity?.id}, parent: ${parent?.uuid}`);
        if(!entity || !parent) {
            console.error(`[ColliderUtils] Missing entity or parent! Entity: ${entity?.id}, Parent UUID: ${parent?.uuid}`);
            return;
        }
        const type = entity.colliderType;
        const radius = entity.colliderRadius;
        const extents = entity.colliderHalfExtents;
        console.log(`[ColliderUtils ${entity.id}] Received - Type: ${type}, Radius: ${radius}, Extents: ${JSON.stringify(extents)}`);
        
        if(!type) {
             console.warn(`[ColliderUtils ${entity.id}] No colliderType found.`);
             return;
        }
        let mesh;
        try {
            if(type === 'sphere'){
                const effectiveRadius = radius || 1;
                 if (effectiveRadius <= 0) { console.warn(`[ColliderUtils ${entity.id}] Invalid radius: ${effectiveRadius}`); return; }
                mesh = new THREE.Mesh(new THREE.SphereGeometry(effectiveRadius,16,12), new THREE.MeshBasicMaterial({color: 0x00ff00, wireframe: true, depthTest: false}));
                console.log(`[ColliderUtils ${entity.id}] Created SPHERE geometry with radius: ${effectiveRadius}`);
            } else if(type === 'box'){
                const he = extents || [1,1,1];
                if (he.some(dim => dim <= 0)) { console.warn(`[ColliderUtils ${entity.id}] Invalid halfExtents: ${JSON.stringify(he)}`); return; }
                mesh = new THREE.Mesh(new THREE.BoxGeometry(he[0]*2, he[1]*2, he[2]*2), new THREE.MeshBasicMaterial({color: 0x00ffff, wireframe: true, depthTest: false}));
                 console.log(`[ColliderUtils ${entity.id}] Created BOX geometry with halfExtents: ${JSON.stringify(he)}`);
            }
        } catch (error) {
            console.error(`[ColliderUtils ${entity.id}] Error creating geometry:`, error);
            return;
        }
        
        if(!mesh) {
            console.warn(`[ColliderUtils ${entity.id}] Mesh creation failed for type: ${type}`);
            return;
        }
        
        // Tag collider mesh for selection and debugging
        mesh.userData.isCollider = true;
        mesh.userData.entity = entity;
        // Make collider visible for debugging (set to false to hide in production)
        mesh.visible = true;
        
        console.log(`[ColliderUtils ${entity.id}] Mesh created successfully (UUID: ${mesh.uuid}). Setting userData and adding to parent (UUID: ${parent.uuid}).`);
        
        mesh.renderOrder = 999;
        
        try {
            parent.add(mesh);
            console.log(`[ColliderUtils ${entity.id}] Successfully added collider mesh to parent.`);
        } catch (error) {
            console.error(`[ColliderUtils ${entity.id}] Error adding mesh to parent:`, error);
        }
    }
    if(typeof window !== 'undefined'){
        window.addSelectionColliderFromEntity = addSelectionColliderFromEntity;
    }
    if(typeof module!=='undefined'){
        module.exports = { addSelectionColliderFromEntity };
    }
})(); 