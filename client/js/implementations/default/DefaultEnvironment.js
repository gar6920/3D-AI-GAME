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
        
        // Load the hovercar
        this.loadHovercar(scene);
        this.initialized = true;
    }
    
    loadHovercar(scene) {
        const loader = new THREE.GLTFLoader();
        
        console.log('[DefaultEnvironmentManager] Loading hovercar model');
        loader.load(
            'assets/models/free_merc_hovercar.glb',
            (gltf) => {
                const hovercar = gltf.scene;
                
                // Position the hovercar at coordinates (15, 0, 20)
                hovercar.position.set(15, 0, 20);
                
                // Rotate 45 degrees around Y axis
                hovercar.rotation.y = Math.PI / 4;
                
                // Set scale to 1 (default size)
                hovercar.scale.set(1, 1, 1);
                
                // Enable shadows
                hovercar.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                // Add to scene
                scene.add(hovercar);
                
                console.log('[DefaultEnvironmentManager] Hovercar model loaded successfully');
            },
            (xhr) => {
                const percent = Math.round(xhr.loaded / xhr.total * 100);
                if (percent % 25 === 0) { // Log at 0, 25, 50, 75, 100%
                    console.log(`[DefaultEnvironmentManager] Hovercar ${percent}% loaded`);
                }
            },
            (error) => {
                console.error('[DefaultEnvironmentManager] Error loading hovercar model:', error);
            }
        );
    }
}

// Create instance and make it globally available
if (typeof window !== 'undefined') {
    window.defaultEnvironmentManager = new DefaultEnvironmentManager();
} 