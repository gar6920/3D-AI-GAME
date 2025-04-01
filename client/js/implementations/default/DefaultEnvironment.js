/**
 * DefaultEnvironment.js
 * Implementation-specific environment objects for the default implementation
 */

// Self-initializing module - hooks into window.scene when available
(function() {
    console.log('[DefaultEnvironment] Module loaded');
    
    // Check if scene exists, otherwise set up a scene watcher
    if (window.scene) {
        initializeEnvironment(window.scene);
    } else {
        // Set up a scene watcher to detect when scene becomes available
        setupSceneWatcher();
    }
    
    function setupSceneWatcher() {
        console.log('[DefaultEnvironment] Setting up scene watcher');
        
        // Check every 100ms if scene is available
        const checkInterval = setInterval(() => {
            if (window.scene) {
                console.log('[DefaultEnvironment] Scene detected, initializing environment');
                clearInterval(checkInterval);
                initializeEnvironment(window.scene);
            }
        }, 100);
        
        // Safety timeout after 10 seconds
        setTimeout(() => {
            if (checkInterval) {
                clearInterval(checkInterval);
                console.warn('[DefaultEnvironment] Timeout waiting for scene');
            }
        }, 10000);
    }
    
    function initializeEnvironment(scene) {
        console.log('[DefaultEnvironment] Initializing environment objects');
        
        // Load the hovercar
        loadHovercar(scene);
    }
    
    function loadHovercar(scene) {
        const loader = new THREE.GLTFLoader();
        
        console.log('[DefaultEnvironment] Loading hovercar model');
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
                
                console.log('[DefaultEnvironment] Hovercar model loaded successfully');
            },
            (xhr) => {
                const percent = Math.round(xhr.loaded / xhr.total * 100);
                if (percent % 25 === 0) { // Log at 0, 25, 50, 75, 100%
                    console.log(`[DefaultEnvironment] Hovercar ${percent}% loaded`);
                }
            },
            (error) => {
                console.error('[DefaultEnvironment] Error loading hovercar model:', error);
            }
        );
    }
})(); 