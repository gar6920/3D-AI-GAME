// Test function to create player sphere collider correctly
function testPlayerSphereCollider() {
    if (!window.scene || !window.playerEntity) {
        console.error("Cannot test collider - scene or player not available");
        return;
    }
    
    console.log("=== TESTING PLAYER SPHERE COLLIDER ===");
    
    // Create test entity with explicit sphere collider
    const testEntity = {
        id: 'test-sphere',
        type: 'player',
        colliderType: 'SPHERE', // In uppercase to test case-insensitive matching
        colliderRadius: 1.0,
        mesh: window.playerEntity.mesh
    };
    
    // Remove any existing colliders first
    window.playerEntity.mesh.traverse(child => {
        if (child.userData && child.userData.isCollider) {
            console.log("Removing existing collider for test");
            if (child.parent) {
                child.parent.remove(child);
            }
        }
    });
    
    // Directly call the collider utility
    if (typeof window.addSelectionColliderFromEntity === 'function') {
        window.addSelectionColliderFromEntity(testEntity, window.playerEntity.mesh);
        console.log("Test sphere collider created directly");
    } else {
        console.error("addSelectionColliderFromEntity function not found!");
    }
} 