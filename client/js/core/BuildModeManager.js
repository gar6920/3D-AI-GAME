// client/js/core/BuildModeManager.js

// Assume THREE is loaded globally via index.html or another script
// import * as THREE from 'three'; // Removed import statement

class BuildModeManager {
    constructor(scene, camera, rendererDomElement, networkInterface, inputManager, uiManager) {
        // Ensure THREE is available
        if (typeof THREE === 'undefined') {
            console.error("BuildModeManager Error: THREE is not defined. Make sure Three.js is loaded.");
            return; // Prevent further initialization if THREE is missing
        }
        
        this.scene = scene;
        this.camera = camera;
        this.rendererDomElement = rendererDomElement;
        this.networkInterface = networkInterface;
        this.inputManager = inputManager; // Assuming InputManager handles mouse clicks/positions
        this.uiManager = uiManager; // Assuming UIManager handles UI elements

        this.isBuildModeActive = false;
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.previewMesh = null;
        this.selectedStructureType = null; // e.g., 'wall', 'floor'
        this.buildIndicator = null; // Visual indicator for placement
        this.placementValid = false;

        this.boundOnPointerMove = this.onPointerMove.bind(this);
        this.boundOnPointerDown = this.onPointerDown.bind(this);
        this.boundToggleBuildMode = this.toggleBuildMode.bind(this); // Bind the toggle method
    }

    init() {
        console.log("BuildModeManager initializing...");
        this.createBuildModeUI();
        this.setupEventListeners();
        this.createBuildIndicator();
        // Add key binding for toggling build mode (e.g., 'B')
        this.inputManager.addKeyListener('KeyB', this.boundToggleBuildMode);
        console.log("BuildModeManager initialized.");
    }

    createBuildModeUI() {
        // Example: Create a simple button using UIManager
        // This assumes UIManager has a method like addElement
        const buildModeButton = this.uiManager.addElement('button', {
            id: 'toggle-build-mode-btn',
            text: 'Build Mode (B)',
            style: {
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                zIndex: '100',
                padding: '10px'
            }
        });
        buildModeButton.onclick = this.boundToggleBuildMode;

        // Create a menu for selecting structures (initially hidden)
        const buildMenu = this.uiManager.addElement('div', {
            id: 'building-menu',
            style: {
                display: 'none', // Initially hidden
                position: 'absolute',
                bottom: '60px',
                left: '20px',
                zIndex: '100',
                background: 'rgba(0,0,0,0.7)',
                padding: '10px',
                borderRadius: '5px'
            }
        });

        // Add structure selection buttons (example)
        const structures = ['Wall', 'Floor', 'Ramp']; // Example structure types
        structures.forEach(type => {
            const btn = this.uiManager.addElement('button', {
                text: type,
                parent: buildMenu, // Attach to the menu
                style: { margin: '5px', padding: '5px' }
            });
            btn.onclick = () => this.selectStructure(type.toLowerCase());
        });
    }

    setupEventListeners() {
        // We'll add pointer move/down listeners only when build mode is active
    }

    createBuildIndicator() {
        // Create a simple visual indicator (e.g., a semi-transparent cube or plane)
        const geometry = new THREE.BoxGeometry(1, 1, 1); // Adjust size as needed
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5, wireframe: true });
        this.buildIndicator = new THREE.Mesh(geometry, material);
        this.buildIndicator.visible = false;
        this.scene.add(this.buildIndicator);
    }

    toggleBuildMode() {
        this.isBuildModeActive = !this.isBuildModeActive;
        console.log(`Build Mode: ${this.isBuildModeActive ? 'ON' : 'OFF'}`);
        const buildMenu = document.getElementById('building-menu'); // Use UIManager if possible
        
        if (this.isBuildModeActive) {
            // Enter build mode
            this.rendererDomElement.addEventListener('pointermove', this.boundOnPointerMove);
            this.rendererDomElement.addEventListener('pointerdown', this.boundOnPointerDown);
            this.buildIndicator.visible = true;
            this.selectedStructureType = null; // Reset selection
            if (buildMenu) buildMenu.style.display = 'block';
            // Request pointer lock release if needed, or change controls
            // document.exitPointerLock(); // Example
        } else {
            // Exit build mode
            this.rendererDomElement.removeEventListener('pointermove', this.boundOnPointerMove);
            this.rendererDomElement.removeEventListener('pointerdown', this.boundOnPointerDown);
            this.buildIndicator.visible = false;
            if (this.previewMesh) {
                this.scene.remove(this.previewMesh);
                this.previewMesh = null;
            }
            if (buildMenu) buildMenu.style.display = 'none';
            // Re-enable game controls / pointer lock if needed
            // this.inputManager.requestPointerLock(); // Example
        }
        this.uiManager.updateHUD(); // Example: Update HUD to show build mode status
    }

    selectStructure(type) {
        console.log(`Selected structure: ${type}`);
        this.selectedStructureType = type;
        // Remove old preview if exists
        if (this.previewMesh) {
            this.scene.remove(this.previewMesh);
        }
        // Create a preview mesh for the selected structure
        // TODO: Use actual geometry/material based on 'type'
        const geometry = new THREE.BoxGeometry(1, 1, 1); // Placeholder
        const material = new THREE.MeshLambertMaterial({ color: 0xcccccc, transparent: true, opacity: 0.6 });
        this.previewMesh = new THREE.Mesh(geometry, material);
        this.previewMesh.visible = false; // Start invisible until pointer moves
        this.scene.add(this.previewMesh);
    }

    onPointerMove(event) {
        if (!this.isBuildModeActive || !this.selectedStructureType || !this.previewMesh) return;

        // Calculate pointer position in normalized device coordinates (-1 to +1)
        this.pointer.x = (event.clientX / this.rendererDomElement.clientWidth) * 2 - 1;
        this.pointer.y = -(event.clientY / this.rendererDomElement.clientHeight) * 2 + 1;

        this.updatePlacementIndicator();
    }

    updatePlacementIndicator() {
        this.raycaster.setFromCamera(this.pointer, this.camera);
        // Calculate objects intersecting the picking ray - adjust intersectables as needed
        // Might need to ignore the player, other dynamic objects, or the preview mesh itself
        const intersects = this.raycaster.intersectObjects(this.scene.children, true); // Check children recursively

        let foundPlacementSurface = false;
        if (intersects.length > 0) {
            for (const intersect of intersects) {
                // Ignore intersections with the preview mesh itself or the indicator
                if (intersect.object === this.previewMesh || intersect.object === this.buildIndicator) continue;
                
                // Find the first valid surface (e.g., ground, existing structures)
                // Add more sophisticated placement rules here (e.g., grid snapping, surface normals)
                const point = intersect.point;
                const normal = intersect.face.normal.clone();
                
                // Example: Snap to grid (adjust grid size)
                const gridSize = 1;
                const snappedPosition = new THREE.Vector3(
                    Math.round(point.x / gridSize) * gridSize,
                    Math.round(point.y / gridSize) * gridSize, 
                    Math.round(point.z / gridSize) * gridSize
                );
                
                // Apply offset based on normal to place on top of surface
                // This needs refinement based on structure dimensions and pivot points
                snappedPosition.addScaledVector(normal, 0.5); // Offset slightly along normal

                this.buildIndicator.position.copy(snappedPosition);
                this.previewMesh.position.copy(snappedPosition);
                this.buildIndicator.visible = true;
                this.previewMesh.visible = true;

                // TODO: Add validation logic (e.g., check collisions, terrain slope)
                this.placementValid = true; // Assume valid for now
                this.buildIndicator.material.color.set(this.placementValid ? 0x00ff00 : 0xff0000); // Green if valid, red if not
                this.previewMesh.material.color.set(this.placementValid ? 0xcccccc : 0xff8888); // Adjust preview color

                foundPlacementSurface = true;
                break; // Use the first valid intersection point
            }
        }

        if (!foundPlacementSurface) {
            this.buildIndicator.visible = false;
            this.previewMesh.visible = false;
            this.placementValid = false;
        }
    }

    onPointerDown(event) {
        // Use left mouse button (button 0) to place structures
        if (!this.isBuildModeActive || event.button !== 0 || !this.placementValid || !this.selectedStructureType) return;

        console.log(`Attempting to place ${this.selectedStructureType} at`, this.buildIndicator.position);

        // Send placement request to the server
        this.networkInterface.sendBuildRequest({
            type: this.selectedStructureType,
            position: {
                x: this.buildIndicator.position.x,
                y: this.buildIndicator.position.y,
                z: this.buildIndicator.position.z
            },
            // Include rotation/other data if necessary
            rotation: {
                 x: this.buildIndicator.rotation.x, 
                 y: this.buildIndicator.rotation.y, 
                 z: this.buildIndicator.rotation.z
             } 
        });

        // Optional: Provide immediate feedback (e.g., temporary placement ghost)
        // The actual structure is created when the server confirms via Colyseus state change (handled elsewhere or via networkInterface callbacks)

        // Deselect structure after placement?
        // this.selectedStructureType = null;
        // this.scene.remove(this.previewMesh);
        // this.previewMesh = null;
    }

    // Method to handle structure creation/update confirmed by the server
    // This might be called by NetworkInterface when a message is received
    handleStructureUpdate(data) {
        // Logic to create/update the actual THREE.Object3D in the scene
        // This replaces the logic previously in index.html (createStructureInWorld, etc.)
        console.log("Handling structure update from server:", data);
        // Example: Find existing or create new mesh based on data.id
        // Apply position, rotation, type from data
    }
}

// Assign the class to the window object so it can be accessed globally
window.BuildModeManager = BuildModeManager;