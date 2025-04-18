/**
 * DefaultEnvironment.js
 * Implementation-specific environment objects for the default implementation
 */

class DefaultEnvironmentManager {
    constructor() {
        console.log('[DefaultEnvironmentManager] Instance created.');
        this.initialized = false;
    }

    // Changed: This function now expects the scene to be passed in
    initialize(scene) {
        if (this.initialized) return;
        if (!scene) {
            console.error('[DefaultEnvironmentManager] Initialize called without a valid scene!');
            return;
        }
        console.log('[DefaultEnvironmentManager] Initializing environment objects...');
        

        this.initialized = true;
    }
    

}

// Create instance and make it globally available
if (typeof window !== 'undefined') {
    window.defaultEnvironmentManager = new DefaultEnvironmentManager();
} 