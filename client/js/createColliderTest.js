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

// Test function to manually create colliders for all entities
window.createColliderTest = function() {
    if (!window.scene) {
        console.error("Scene not available for collider test");
        return;
    }
    
    console.log("=== TESTING COLLIDER CREATION FOR ALL ENTITIES ===");
    let createdCount = 0;
    
    // Create player collider
    if (window.playerEntity) {
        // Create explicit sphere collider
        const playerEntity = {
            id: 'player-test',
            type: 'player',
            colliderType: 'sphere',
            colliderRadius: 1.0,
            _isPlayer: true
        };
        
        if (typeof window.addSelectionColliderFromEntity === 'function') {
            window.addSelectionColliderFromEntity(playerEntity, window.playerEntity.mesh);
            console.log("Created test sphere collider for player");
            createdCount++;
        }
    }
    
    // Try to create colliders for all NPCs in the scene
    if (window.NPC && window.NPC.npcs) {
        console.log(`Found ${window.NPC.npcs.size} NPCs to create colliders for`);
        window.NPC.npcs.forEach((npc, id) => {
            if (npc.mesh) {
                const npcEntity = {
                    id: id + '-test',
                    type: 'npc',
                    colliderType: 'sphere',
                    colliderRadius: 1.0
                };
                
                if (typeof window.addSelectionColliderFromEntity === 'function') {
                    window.addSelectionColliderFromEntity(npcEntity, npc.mesh);
                    console.log(`Created test sphere collider for NPC ${id}`);
                    createdCount++;
                }
            }
        });
    }
    
    // Try to create colliders for static entities if available
    if (window.visuals && window.visuals.staticEntities) {
        const staticEntities = Object.values(window.visuals.staticEntities);
        console.log(`Found ${staticEntities.length} static entities to create colliders for`);
        
        staticEntities.forEach(entity => {
            if (entity.mesh) {
                const staticEntity = {
                    id: entity.id + '-test',
                    type: 'entity',
                    colliderType: 'box',
                    colliderHalfExtents: [1, 1, 1]
                };
                
                if (typeof window.addSelectionColliderFromEntity === 'function') {
                    window.addSelectionColliderFromEntity(staticEntity, entity.mesh);
                    console.log(`Created test box collider for static entity ${entity.id}`);
                    createdCount++;
                }
            }
        });
    }
    
    console.log(`=== TEST COMPLETE: Created ${createdCount} test colliders ===`);
    
    // Force visibility update
    if (typeof window.updateColliderVisibility === 'function') {
        window.updateColliderVisibility();
    }
    
    return `Created ${createdCount} test colliders. Press H to toggle visibility.`;
};

// Add function to window object for console access
console.log("Test collider functions loaded - use window.createColliderTest() to run tests"); 