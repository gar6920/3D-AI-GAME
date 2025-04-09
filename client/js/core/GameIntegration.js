// ========== GAME INTEGRATION ==========
// Integration layer to sync game state with ActionManager

function setupGameIntegration() {
    console.log('[GameIntegration] Setting up after managersReady...');
    // Enhance the game's view mode system to work with ActionManager
    (function() {
        // Store the original toggleCameraView function
        const originalToggleView = window.toggleCameraView;
        
        // Replace with enhanced version that updates ActionManager
        window.toggleCameraView = function() {
            // Call the original function first
            const result = originalToggleView();
            
            // Then update ActionManager context
            if (window.actionManager) {
                window.actionManager.setContext(window.viewMode);
                console.log(`View mode changed to: ${window.viewMode}`);
            }
            
            return result;
        };
        
        // Initial sync of view mode
        if (window.viewMode && window.actionManager) {
            window.actionManager.setContext(window.viewMode);
            console.log(`Initial view mode: ${window.viewMode}`);
        }
        
        console.log("View toggle function enhanced");
    })();

    // Connect BuildingMode if available
    (function() {
        if (window.BuildingModeManager) {
            // Store original toggle method if it exists
            let originalToggle = null;
            if (window.buildingModeManager && typeof window.buildingModeManager.toggle === 'function') {
                originalToggle = window.buildingModeManager.toggle;
                
                // Replace with enhanced version
                window.buildingModeManager.toggle = function() {
                    // Call original toggle method
                    const result = originalToggle.apply(window.buildingModeManager);
                    
                    // Then update ActionManager context
                    if (window.actionManager) {
                        // Use building mode status as context
                        const isBuilding = window.buildingModeManager.isActive || false;
                        window.actionManager.setContext(isBuilding ? 'building' : window.viewMode);
                        console.log(`Building mode ${isBuilding ? 'enabled' : 'disabled'}`);
                    }
                    
                    return result;
                };
                
                console.log("Building mode toggle function enhanced");
            }
            
            // Also connect through ActionManager for future use
            window.actionManager.onAction('toggle_building', (data) => {
                if (data.active && window.buildingModeManager && 
                    typeof window.buildingModeManager.toggle === 'function') {
                    window.buildingModeManager.toggle();
                }
            });
        }
    })();

    // Add context-specific behaviors to actions
    (function() {
        // Example of movement refinement
        window.actionManager.onAction('move_forward', (data) => {
            // This will automatically use the right context now
            const context = window.actionManager.context;
            
            // Different behavior based on context
            if (context === 'building') {
                // Could modify movement speed for building mode
            } else if (context === 'thirdPerson') {
                // Could have special behavior for third person mode
            }
        });
    })();
}

// Wait for managers before setting up
document.addEventListener('managersReady', setupGameIntegration);

console.log("Game Integration module loaded - waiting for managersReady event"); 