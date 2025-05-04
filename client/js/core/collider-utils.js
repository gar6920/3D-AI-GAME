// Utility to create an invisible selection collider mesh from server-sent collider fields
// Usage: addSelectionColliderFromEntity(entity, parentGroup)

(function(){
    function addSelectionColliderFromEntity(entity, parent){
        if(!entity || !parent) return;
        const type = entity.colliderType;
        if(!type) return;
        let mesh;
        if(type === 'sphere'){
            const radius = entity.colliderRadius || 1;
            mesh = new THREE.Mesh(new THREE.SphereGeometry(radius,8,6), new THREE.MeshBasicMaterial({transparent:true,opacity:0}));
        } else if(type === 'box'){
            const he = entity.colliderHalfExtents || [1,1,1];
            mesh = new THREE.Mesh(new THREE.BoxGeometry(he[0]*2, he[1]*2, he[2]*2), new THREE.MeshBasicMaterial({transparent:true,opacity:0}));
        }
        if(!mesh) return;
        mesh.userData.entity = entity;
        mesh.userData.isCollider = true;
        mesh.renderOrder = -1;
        parent.add(mesh);
    }
    if(typeof window !== 'undefined'){
        window.addSelectionColliderFromEntity = addSelectionColliderFromEntity;
    }
    if(typeof module!=='undefined'){
        module.exports = { addSelectionColliderFromEntity };
    }
})(); 