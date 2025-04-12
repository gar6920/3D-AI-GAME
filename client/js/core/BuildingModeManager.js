class BuildingModeManager {
    constructor() {
        // State properties
        this.active = false;
        this.currentStructure = null;
        this.rotation = 0;
        this.rotationInterval = null;
        this.lastMousePosition = null;
        
        // UI elements
        this.buildingModeIndicator = null;
        this.buildingMenu = null;
        this.placementPreview = null;
        this.clickInterceptor = null;
        
        // 3D objects
        this.buildingPreview = null;
        this.worldStructuresMap = new Map();
        
        // Constants
        this.rotationSpeed = 15; // degrees per interval
        this.rotationIntervalMs = 100; // milliseconds between rotations
        
        // Structure types
        this.structureTypes = [
            { id: 'building', name: 'Building' },
            { id: 'wall', name: 'Wall' }
        ];
        
        // Bind methods to this instance
        this.toggle = this.toggle.bind(this);
        this.updateCursorPosition = this.updateCursorPosition.bind(this);
        this.selectStructureType = this.selectStructureType.bind(this);
        this.rotateStructure = this.rotateStructure.bind(this);
        this.screenToWorld = this.screenToWorld.bind(this);
        this.checkPlacementValidity = this.checkPlacementValidity.bind(this);
        this.updatePreviewPosition = this.updatePreviewPosition.bind(this);
        this.createPreviewModels = this.createPreviewModels.bind(this);
        this.init = this.init.bind(this);
        
        // Initialize when ready
        // this.initWhenReady();
    }
    
    init() {
        // This function will now be called externally after managers are ready
        console.log("[BuildingModeManager] Initializing...");
        
        // Global flag to track if user has interacted with the game
        window.hasInteracted = false;
        
        // Add listener to set interacted flag through InputManager
        window.inputManager.on('mousedown', function() {
            window.hasInteracted = true;
        });
        
        // Create UI elements
        this.createUIElements();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Make functionality available globally
        this.exposeGlobalFunctions();
        
        console.log("Building mode manager initialization complete - press B to toggle");
    }
    
    createUIElements() {
        // Create the building mode indicator
        this.buildingModeIndicator = document.createElement('div');
        this.buildingModeIndicator.id = 'building-mode-indicator';
        this.buildingModeIndicator.style.position = 'fixed';
        this.buildingModeIndicator.style.bottom = '50px';
        this.buildingModeIndicator.style.right = '20px';
        this.buildingModeIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        this.buildingModeIndicator.style.color = 'white';
        this.buildingModeIndicator.style.padding = '5px 10px';
        this.buildingModeIndicator.style.borderRadius = '5px';
        this.buildingModeIndicator.style.fontFamily = 'Arial, sans-serif';
        this.buildingModeIndicator.style.fontSize = '14px';
        this.buildingModeIndicator.style.zIndex = '1000';
        this.buildingModeIndicator.style.display = 'none';
        this.buildingModeIndicator.textContent = 'Building Mode';
        document.body.appendChild(this.buildingModeIndicator);
        
        // Create the building menu with higher z-index
        this.buildingMenu = document.createElement('div');
        this.buildingMenu.id = 'building-menu';
        this.buildingMenu.style.position = 'fixed';
        this.buildingMenu.style.bottom = '10px';
        this.buildingMenu.style.left = '50%';
        this.buildingMenu.style.transform = 'translateX(-50%)';
        this.buildingMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        this.buildingMenu.style.color = 'white';
        this.buildingMenu.style.padding = '8px';
        this.buildingMenu.style.borderRadius = '5px';
        this.buildingMenu.style.display = 'none';
        this.buildingMenu.style.zIndex = '2000'; // Much higher z-index
        this.buildingMenu.style.textAlign = 'center';
        this.buildingMenu.style.pointerEvents = 'auto'; // Ensure clicks work
        document.body.appendChild(this.buildingMenu);
        
        // Create placement preview smaller and more visible
        this.placementPreview = document.createElement('div');
        this.placementPreview.id = 'placement-preview';
        this.placementPreview.style.position = 'fixed';
        this.placementPreview.style.width = '16px';
        this.placementPreview.style.height = '16px';
        this.placementPreview.style.backgroundColor = 'rgba(0, 255, 0, 0.7)';
        this.placementPreview.style.border = '2px solid white';
        this.placementPreview.style.borderRadius = '50%';
        this.placementPreview.style.pointerEvents = 'none'; // Don't interfere with clicks
        this.placementPreview.style.transform = 'translate(-50%, -50%)';
        this.placementPreview.style.zIndex = '1001';
        this.placementPreview.style.display = 'none';
        this.placementPreview.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.5)'; // Add shadow for visibility
        document.body.appendChild(this.placementPreview);
        
        // Add structure buttons
        this.structureTypes.forEach(type => {
            const button = document.createElement('button');
            button.textContent = type.name;
            button.style.margin = '0 5px';
            button.style.padding = '5px 10px';
            button.style.backgroundColor = '#555';
            button.style.color = 'white';
            button.style.border = 'none';
            button.style.borderRadius = '3px';
            button.style.cursor = 'pointer';
            button.style.position = 'relative';
            button.style.zIndex = '1002';
            button.style.pointerEvents = 'auto';
            
            // Add button click handler through InputManager for each structure type button
            button.id = `building-button-${type.id}`; // Assign unique ID for InputManager
            this.buildingMenu.appendChild(button);
            
            // Register with InputManager
            window.inputManager.registerUIElement(`building-button-${type.id}`, 'click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.selectStructureType(type.id);
                
                // Keep controls unlocked
                if (window.controls && window.controls.isLocked) {
                    window.controls.unlock();
                }
            });
        });
        
        // Add rotate button
        const rotateButton = document.createElement('button');
        rotateButton.id = 'building-rotate-button';  // Assign ID for InputManager
        rotateButton.textContent = 'Rotate (Q/E)';
        rotateButton.title = 'Hold Q or E to rotate smoothly in 15° increments';
        rotateButton.style.margin = '0 5px';
        rotateButton.style.padding = '5px 10px';
        rotateButton.style.backgroundColor = '#555';
        rotateButton.style.color = 'white';
        rotateButton.style.border = 'none';
        rotateButton.style.borderRadius = '3px';
        rotateButton.style.cursor = 'pointer';
        rotateButton.style.position = 'relative';
        rotateButton.style.zIndex = '1002';
        rotateButton.style.pointerEvents = 'auto';
        this.buildingMenu.appendChild(rotateButton);
        
        // Register with InputManager
        window.inputManager.registerUIElement('building-rotate-button', 'click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.rotateStructure();
            
            // Keep controls unlocked
            if (window.controls && window.controls.isLocked) {
                window.controls.unlock();
            }
        });
    }
    
    setupEventListeners() {
        // Setup keyboard event listeners using InputManager
        window.inputManager.on('keydown', (event) => {
            // Normalize event to handle both direct DOM events and InputManager wrapper events
            const key = event.key !== undefined ? event.key : 
                        (event.event ? event.event.key : null);
                        
            console.log("[BuildingMode] Keydown event:", key, event);
            
            // Don't process if we're in an input field
            if (document.activeElement.tagName === 'INPUT' || 
                document.activeElement.tagName === 'TEXTAREA') {
                return;
            }
            
            // Only process other keys if building mode is active
            if (!this.active) return;
            
            // Q key rotates structure counter-clockwise
            if (key === 'q' || key === 'Q') {
                console.log("[BuildingMode] Q key pressed, rotating counter-clockwise");
                // Skip if interval already exists
                if (!this.rotationInterval) {
                    // Single keypress rotation
                    this.rotation = (this.rotation - 15) % 360;
                    if (this.rotation < 0) this.rotation += 360;
                    
                    console.log("[BuildingMode] New rotation:", this.rotation + "°");
                    
                    // Update preview
                    if (this.lastMousePosition) {
                        this.updatePreviewPosition(this.lastMousePosition);
                    }
                    
                    // Set up interval for continuous rotation
                    this.rotationInterval = setInterval(() => {
                        this.rotation = (this.rotation - this.rotationSpeed) % 360;
                        if (this.rotation < 0) this.rotation += 360;
                        
                        console.log("[BuildingMode] Continuous rotation:", this.rotation + "°");
                        
                        // Update preview
                        if (this.lastMousePosition) {
                            this.updatePreviewPosition(this.lastMousePosition);
                        }
                    }, this.rotationIntervalMs);
                }
            }
            // E key rotates structure clockwise
            else if (key === 'e' || key === 'E') {
                console.log("[BuildingMode] E key pressed, rotating clockwise");
                // Skip if interval already exists
                if (!this.rotationInterval) {
                    // Single keypress rotation
                    this.rotation = (this.rotation + 15) % 360;
                    
                    console.log("[BuildingMode] New rotation:", this.rotation + "°");
                    
                    // Update preview
                    if (this.lastMousePosition) {
                        this.updatePreviewPosition(this.lastMousePosition);
                    }
                    
                    // Set up interval for continuous rotation
                    this.rotationInterval = setInterval(() => {
                        this.rotation = (this.rotation + this.rotationSpeed) % 360;
                        
                        console.log("[BuildingMode] Continuous rotation:", this.rotation + "°");
                        
                        // Update preview
                        if (this.lastMousePosition) {
                            this.updatePreviewPosition(this.lastMousePosition);
                        }
                    }, this.rotationIntervalMs);
                }
            }
            
            // Escape key - exit building mode
            if (key === 'Escape') {
                this.toggle();
            }
        });
        
        // Setup keyup event for rotation
        window.inputManager.on('keyup', (event) => {
            // Normalize event
            const key = event.key !== undefined ? event.key : 
                       (event.event ? event.event.key : null);
                       
            console.log("[BuildingMode] Keyup event:", key, event);
            
            if ((key === 'q' || key === 'Q' || key === 'e' || key === 'E') && this.rotationInterval) {
                console.log("[BuildingMode] Stopping continuous rotation");
                clearInterval(this.rotationInterval);
                this.rotationInterval = null;
            }
        });
        
        // Setup mouse event listeners using InputManager
        window.inputManager.on('mousemove', this.handleMouseMove.bind(this));
        window.inputManager.on('mousedown', this.handleMouseDown.bind(this));
        
        console.log("[BuildingModeManager] Set up all listeners through InputManager");
    }
    
    toggle() {
        console.log('[BuildingModeManager] toggle() called.');
        this.active = !this.active;
        console.log(`[BuildingModeManager] Toggled state. Active: ${this.active}`);
        
        // Update prevention flag
        window.preventPointerLock = this.active;
        
        // Show/hide UI elements
        this.buildingModeIndicator.style.display = this.active ? 'block' : 'none';
        this.buildingMenu.style.display = this.active ? 'block' : 'none';
        this.placementPreview.style.display = this.active ? 'block' : 'none';
        
        // Always hide lock instructions in building mode
        // Removed direct manipulation to centralize control in game-engine.js
        // lockInstructions.style.display = 'none';
        
        // Initialize 3D preview if needed
        if (this.active && !this.buildingPreview && window.scene) {
            this.createPreviewModels();
        }
        
        // Show/hide 3D preview and grid
        if (this.buildingPreview) {
            this.buildingPreview.group.visible = this.active;
            this.buildingPreview.grid.visible = this.active;
            
            // Set current type if activating
            if (this.active && this.currentStructure) {
                this.buildingPreview.currentType = this.currentStructure;
            }
        }
        
        // Unlock/lock pointer
        if (this.active) {
            console.log('[BuildingModeManager] Activating - Checking element status:');
            console.log(`  - this.buildingMenu: ${this.buildingMenu ? 'Exists' : 'NULL'}`);
            console.log(`  - this.placementPreview: ${this.placementPreview ? 'Exists' : 'NULL'}`);
            console.log(`  - this.buildingPreview: ${this.buildingPreview ? 'Exists' : 'NULL'}`);
            console.log(`  - window.controls: ${window.controls ? 'Exists' : 'NULL'}`);

            // Unlock the pointer to show cursor
            if (window.controls) {
                console.log(`[BuildingModeManager] Controls state before unlock: isLocked=${window.controls.isLocked}, enabled=${window.controls.enabled}`);
                if (window.controls.isLocked) {
                    window.controls.unlock();
                }
                // Disable pointer lock controls to prevent auto-locking
                window.controls.enabled = false;
                console.log(`[BuildingModeManager] Controls state after changes: enabled=${window.controls.enabled}`);
            }
            
            // Most aggressive approach - add class to html element
            document.documentElement.classList.add('hide-cursor');
            
            // Create and use a completely transparent cursor as fallback
            const transparentCursor = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
            document.body.style.cursor = `url(${transparentCursor}), none`;
            document.documentElement.style.cursor = `url(${transparentCursor}), none`;
            
            if (window.renderer && window.renderer.domElement) {
                window.renderer.domElement.style.cursor = `url(${transparentCursor}), none`;
            }
            
            console.log(`[BuildingModeManager] Building Menu display style: ${this.buildingMenu.style.display}`);
            console.log(`[BuildingModeManager] Body cursor style: ${document.body.style.cursor}`);
            
            // Add a click interceptor div to prevent clicks from triggering pointer lock
            this.clickInterceptor = document.createElement('div');
            this.clickInterceptor.id = 'build-click-interceptor';
            this.clickInterceptor.style.position = 'fixed';
            this.clickInterceptor.style.top = '0';
            this.clickInterceptor.style.left = '0';
            this.clickInterceptor.style.width = '100%';
            this.clickInterceptor.style.height = '100%';
            this.clickInterceptor.style.zIndex = '900'; // Below our UI but above everything else
            this.clickInterceptor.style.pointerEvents = 'all';

            // Add to DOM first so it can be registered
            document.body.appendChild(this.clickInterceptor);

            // Register with InputManager
            window.inputManager.registerUIElement('build-click-interceptor', 'click', (event) => {
                // Only handle LEFT CLICKS (button 0)
                if (event.button !== 0) return;
                
                // Skip if clicking on UI
                if (event.target.closest('#building-menu')) return;
                
                event.preventDefault();
                event.stopPropagation();
                
                // Get world position
                const worldPos = this.screenToWorld(event.clientX, event.clientY);
                if (!worldPos) return;
                
                // Check if valid placement
                if (!this.buildingPreview || !this.buildingPreview.isValid) return;
                
                // Send structure placement request to server - SIMPLE VERSION
                if (window.room) {
                    const placementData = {
                        structureType: this.currentStructure,
                        x: Math.round(worldPos.x),
                        y: Math.round(worldPos.y) || 0,
                        z: Math.round(worldPos.z),
                        rotation: this.rotation * (Math.PI / 180)
                    };
                    console.log('[BuildingModeManager] Sending placeStructure request:', placementData);
                    window.room.send("placeStructure", placementData);
                    
                    // Important: Force refresh preview position after building
                    setTimeout(() => {
                        // Force cursor update with current mouse position
                        if (event) this.updateCursorPosition({
                            clientX: event.clientX,
                            clientY: event.clientY
                        });
                    }, 50);
                }
            });
            
            // Position cursor at center initially
            this.updateCursorPosition({
                clientX: window.innerWidth / 2,
                clientY: window.innerHeight / 2
            });
            
            // Start tracking mouse movement for placement preview
            window.inputManager.on('mousemove', this.updateCursorPosition);
            
            // Modify building menu button styles to ensure they're clickable
            const allButtons = this.buildingMenu.querySelectorAll('button');
            allButtons.forEach(button => {
                button.style.zIndex = '1002'; // Higher than placement preview
                button.style.position = 'relative'; // Ensure proper stacking
                button.style.pointerEvents = 'auto'; // Force clickable
            });
        } else {
            // Exiting Building Mode
            console.log('[BuildingModeManager] Exiting building mode.');
            // Hide UI elements
            if (this.buildingModeIndicator) this.buildingModeIndicator.style.display = 'none';
            if (this.buildingMenu) this.buildingMenu.style.display = 'none';
            if (this.placementPreview) this.placementPreview.style.display = 'none';
            
            // --- Attempt to re-lock pointer if returning to a suitable view ---
            if (!window.isRTSMode && !window.isFreeCameraMode) { // Only lock if returning to FPS/TPS
                console.log('[BuildingModeManager] Attempting to re-acquire pointer lock after exiting build mode.');
                // Use a small delay to ensure the UI is hidden before lock attempt
                setTimeout(() => {
                    // Double-check conditions right before locking, in case state changed during delay
                    if (!this.active && !window.isRTSMode && !window.isFreeCameraMode && !document.pointerLockElement && !window.controls.isLocked) {
                         window.controls.lock();
                    }
                }, 50); // 50ms delay
            } else {
                 console.log('[BuildingModeManager] Not re-locking pointer (in RTS or FreeCam mode).');
            }
            // --- End re-lock logic ---
            
            // Remove cursor-hiding class
            document.documentElement.classList.remove('hide-cursor');
            
            // Stop tracking mouse movement
            window.inputManager.off('mousemove', this.updateCursorPosition);
            
            // Restore cursor style
            document.body.style.cursor = 'default';
            document.documentElement.style.cursor = 'default';
            
            if (window.renderer && window.renderer.domElement) {
                window.renderer.domElement.style.cursor = 'default';
            }
            
            // Re-enable controls
            if (window.controls) {
                window.controls.enabled = true;
            }
            
            // Remove click interceptor
            if (this.clickInterceptor) {
                this.clickInterceptor.remove();
                this.clickInterceptor = null;
            }
        }
        
        console.log("Building mode " + (this.active ? "activated" : "deactivated"));
        
        // Select default structure if activating
        if (this.active && !this.currentStructure) {
            this.selectStructureType('building');
        }
    }
    
    updateCursorPosition(event) {
        // Normalize event to handle both direct DOM events and InputManager wrapper events
        const clientX = event.clientX !== undefined ? event.clientX : 
                        (event.position ? event.position.x : window.innerWidth / 2);
        const clientY = event.clientY !== undefined ? event.clientY : 
                        (event.position ? event.position.y : window.innerHeight / 2);
        
        // Update 2D cursor preview position
        this.placementPreview.style.left = clientX + 'px';
        this.placementPreview.style.top = clientY + 'px';
        
        // Get 3D world position from screen position
        const worldPos = this.screenToWorld(clientX, clientY);
        
        if (worldPos && this.active) {
            // Save last position
            this.lastMousePosition = worldPos;
            
            // Check if placement is valid
            this.buildingPreview.isValid = this.checkPlacementValidity(worldPos);
            
            // Update 3D preview position
            this.updatePreviewPosition(worldPos);
        }
    }
    
    checkPlacementValidity(position) {
        // If we don't have a room or structures, assume valid
        if (!window.room || !window.room.state || !window.room.state.structures) {
            return true;
        }
        
        const structureType = this.currentStructure;
        const rotationDegrees = this.rotation;
        const rotationRadians = rotationDegrees * (Math.PI / 180);
        
        // Get base dimensions based on type
        let width = 4, depth = 4;
        if (structureType === 'wall') {
            width = 4;
            depth = 0.5;
            
            // For continuous rotation, calculate the actual footprint using trigonometry
            // This handles any arbitrary rotation angle, not just 90-degree increments
            const absRotation = rotationDegrees % 180; // Only need to consider 0-180 due to symmetry
            const normalizedRotation = absRotation > 90 ? 180 - absRotation : absRotation;
            const radians = normalizedRotation * (Math.PI / 180);
            
            // Calculate effective width and depth after rotation
            const effectiveWidth = Math.abs(width * Math.cos(radians)) + Math.abs(depth * Math.sin(radians));
            const effectiveDepth = Math.abs(width * Math.sin(radians)) + Math.abs(depth * Math.cos(radians));
            
            width = effectiveWidth;
            depth = effectiveDepth;
        }
        
        // Create bounding box for new structure
        const halfWidth = width / 2;
        const halfDepth = depth / 2;
        
        const newMin = { 
            x: position.x - halfWidth, 
            z: position.z - halfDepth 
        };
        const newMax = { 
            x: position.x + halfWidth, 
            z: position.z + halfDepth 
        };
        
        // Check for collisions with existing structures
        let isValid = true;
        
        window.room.state.structures.forEach(structure => {
            if (!isValid) return; // Skip if already invalid
            
            // Get structure dimensions
            let otherWidth = structure.width;
            let otherDepth = structure.depth;
            
            // Create bounding box for existing structure
            const otherHalfWidth = otherWidth / 2;
            const otherHalfDepth = otherDepth / 2;
            
            const otherMin = { 
                x: structure.x - otherHalfWidth, 
                z: structure.z - otherHalfDepth 
            };
            const otherMax = { 
                x: structure.x + otherHalfWidth, 
                z: structure.z + otherHalfDepth 
            };
            
            // Check for overlap
            if (newMin.x <= otherMax.x && newMax.x >= otherMin.x &&
                newMin.z <= otherMax.z && newMax.z >= otherMin.z) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    selectStructureType(typeId) {
        this.currentStructure = typeId;
        console.log("Selected structure type:", typeId);
        
        // Update 3D preview type
        if (this.buildingPreview) {
            this.buildingPreview.currentType = typeId;
            
            // Update preview position based on last mouse position
            if (this.lastMousePosition) {
                this.updatePreviewPosition(this.lastMousePosition);
            }
        }
        
        // Update button styling
        const buttons = this.buildingMenu.querySelectorAll('button');
        buttons.forEach(button => {
            if (button.textContent === this.structureTypes.find(t => t.id === typeId)?.name) {
                button.style.backgroundColor = 'blue';
            } else if (['Rotate (Q/E)'].indexOf(button.textContent) === -1) {
                button.style.backgroundColor = '#555';
            }
        });
    }
    
    rotateStructure() {
        this.rotation = (this.rotation + 90) % 360;
        console.log("Rotating structure to", this.rotation, "degrees");
        
        // Update preview if available
        if (this.lastMousePosition) {
            this.updatePreviewPosition(this.lastMousePosition);
        }
    }
    
    screenToWorld(screenX, screenY) {
        // Need to normalize coordinates for raycaster
        const normalizedX = (screenX / window.innerWidth) * 2 - 1;
        const normalizedY = -(screenY / window.innerHeight) * 2 + 1;
        
        if (!window.camera || !window.scene) {
            console.error("Camera or scene not available for raycasting");
            return null;
        }
        
        // Create raycaster
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(normalizedX, normalizedY), window.camera);
        
        // Create a ground plane at y=0
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersection = new THREE.Vector3();
        
        if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
            // Round coordinates to grid
            intersection.x = Math.round(intersection.x);
            intersection.y = 0; // Structures always start at ground level
            intersection.z = Math.round(intersection.z);
            
            return intersection;
        }
        
        return null;
    }
    
    createPreviewModels() {
        if (!window.scene) return;
        
        // Create materials
        const validMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5
        });
        
        const invalidMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.5
        });
        
        // Building preview mesh
        const buildingGeometry = new THREE.BoxGeometry(4, 3, 4);
        const buildingMesh = new THREE.Mesh(buildingGeometry, validMaterial.clone());
        
        // Wall preview mesh
        const wallGeometry = new THREE.BoxGeometry(4, 2, 0.5);
        const wallMesh = new THREE.Mesh(wallGeometry, validMaterial.clone());
        
        // Create preview container
        const previewGroup = new THREE.Group();
        previewGroup.visible = false;
        window.scene.add(previewGroup);
        
        // Create grid helper
        const grid = new THREE.GridHelper(50, 50, 0x444444, 0x888888);
        grid.position.y = 0.01; // Slightly above ground
        grid.visible = false;
        window.scene.add(grid);
        
        // Store references
        this.buildingPreview = {
            group: previewGroup,
            grid: grid,
            models: {
                building: buildingMesh,
                wall: wallMesh
            },
            materials: {
                valid: validMaterial,
                invalid: invalidMaterial
            },
            currentType: null,
            isValid: true
        };
        
        console.log("Created 3D preview models");
    }
    
    updatePreviewPosition(worldPos) {
        if (!this.buildingPreview || !this.buildingPreview.group) return;
        
        // Get preview data
        const preview = this.buildingPreview;
        
        // Clear current preview
        while (preview.group.children.length > 0) {
            preview.group.remove(preview.group.children[0]);
        }
        
        // If no world position or no selected type, hide preview
        if (!worldPos || !preview.currentType) {
            preview.group.visible = false;
            return;
        }
        
        // Get appropriate model
        const model = preview.models[preview.currentType].clone();
        
        // Apply appropriate material
        model.material = preview.isValid ? 
            preview.materials.valid.clone() : 
            preview.materials.invalid.clone();
        
        // Position model in group
        model.position.y = model.geometry.parameters.height / 2;
        
        // Position group in world
        preview.group.position.set(worldPos.x, worldPos.y, worldPos.z);
        
        // Apply rotation
        preview.group.rotation.y = this.rotation * (Math.PI / 180);
        
        // Add model to group and show
        preview.group.add(model);
        preview.group.visible = true;
    }
    
    createStructureInWorld(structure, key) {
        console.log("Creating structure in world:", key, structure);
        
        // Skip if structure already exists
        if (this.worldStructuresMap.has(key)) {
            console.log("Structure already exists, updating instead:", key);
            return this.updateStructureInWorld(structure, key);
        }
        
        if (!window.scene) {
            console.error("Scene not available to create structure");
            return null;
        }
        
        // Validate structure data
        if (!structure || !structure.structureType) {
            console.error("Invalid structure data:", structure);
            return null;
        }
        
        console.log("Building structure:", structure.structureType, "at", structure.x, structure.y, structure.z);
        
        // Generate mesh based on structure type
        let mesh;
        let geometry, material;
        
        switch (structure.structureType) {
            case "building":
                // Create a building with roof
                const buildingHeight = structure.height || 3;
                const buildingWidth = structure.width || 4;
                const buildingDepth = structure.depth || 4;
                
                // Main building
                geometry = new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth);
                material = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown
                mesh = new THREE.Mesh(geometry, material);
                
                // Add a roof
                const roofGeometry = new THREE.ConeGeometry(buildingWidth * 0.7, buildingHeight * 0.5, 4);
                const roofMaterial = new THREE.MeshLambertMaterial({ color: 0xA52A2A }); // Dark red
                const roof = new THREE.Mesh(roofGeometry, roofMaterial);
                roof.position.y = buildingHeight/2 + buildingHeight*0.25/2;
                roof.rotation.y = Math.PI/4; // 45 degrees
                mesh.add(roof);
                break;
                
            case "wall":
                geometry = new THREE.BoxGeometry(structure.width || 4, structure.height || 2, structure.depth || 0.5);
                material = new THREE.MeshLambertMaterial({ color: 0x808080 }); // Gray
                mesh = new THREE.Mesh(geometry, material);
                break;
                
            default:
                console.log("Unknown structure type, using default:", structure.structureType);
                geometry = new THREE.BoxGeometry(1, 1, 1);
                material = new THREE.MeshLambertMaterial({ color: 0xffff00 });
                mesh = new THREE.Mesh(geometry, material);
        }
        
        // Position the structure (center Y position based on height)
        mesh.position.set(
            structure.x, 
            structure.y + (structure.height || 1) / 2, 
            structure.z
        );
        mesh.rotation.y = structure.rotationY || 0;
        
        // Add to scene
        window.scene.add(mesh);
        
        // Store reference to mesh
        this.worldStructuresMap.set(key, mesh);
        console.log("Structure created successfully:", key);
        
        return mesh;
    }
    
    updateStructureInWorld(structure, key) {
        const mesh = this.worldStructuresMap.get(key);
        
        if (mesh) {
            // Update position and rotation
            mesh.position.set(structure.x, structure.y + (structure.height || 1)/2, structure.z);
            mesh.rotation.y = structure.rotationY || 0;
            return mesh;
        } else {
            // If mesh doesn't exist, create it
            return this.createStructureInWorld(structure, key);
        }
    }
    
    removeStructureFromWorld(key) {
        const mesh = this.worldStructuresMap.get(key);
        
        if (mesh && window.scene) {
            window.scene.remove(mesh);
            this.worldStructuresMap.delete(key);
            
            // Cleanup resources
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
            
            return true;
        }
        return false;
    }
    
    initializeStructureListeners(room) {
        if (!room || !room.state || !room.state.structures) {
            console.error("[BuildingModeManager] initializeStructureListeners called before room/state/structures were ready!");
            return;
        }

        console.log("[BuildingModeManager] Initializing structure listeners for room:", room.id);
        
        // Handler for new structures added by the server
        room.state.structures.onAdd = (structure, key) => {
            console.log("[BuildingModeManager] structures.onAdd triggered:", key, structure);
            this.createStructureInWorld(structure, key);
        };
        
        // Handler for structures removed from the server
        room.state.structures.onRemove = (structure, key) => {
            console.log("[BuildingModeManager] structures.onRemove triggered:", key);
            this.removeStructureFromWorld(key);
        };
        
        // Handler for structures modified on the server
        room.state.structures.onChange = (structure, key) => {
            console.log("[BuildingModeManager] structures.onChange triggered:", key);
            this.updateStructureInWorld(structure, key);
        };
        
        // Process any structures that might have already been added before listeners were attached
        if (room.state.structures.size > 0) {
            console.log("[BuildingModeManager] Processing existing structures (", room.state.structures.size, ")");
            room.state.structures.forEach((structure, key) => {
                // Use createStructureInWorld which handles updates if already exists
                this.createStructureInWorld(structure, key);
            });
        }
        
        console.log("[BuildingModeManager] Structure listeners setup complete.");
    }
    
    exposeGlobalFunctions() {
        // Expose necessary functions to the global scope
        window.buildingMode = {
            active: this.active,
            currentStructure: this.currentStructure,
            rotation: this.rotation,
            toggle: () => this.toggle()
        };
        
        // Make world structures map accessible globally
        window.worldStructuresMap = this.worldStructuresMap;
        
        // Make necessary functions globally accessible for other parts of the app
        window.createStructureInWorld = (structure, key) => this.createStructureInWorld(structure, key);
        window.updateStructureInWorld = (structure, key) => this.updateStructureInWorld(structure, key);
        window.removeStructureFromWorld = (key) => this.removeStructureFromWorld(key);
        window.updatePreviewPosition = (worldPos) => this.updatePreviewPosition(worldPos);
        
        // Setup pointer lock prevention for building mode
        window.preventPointerLock = false;

        // Modify any existing pointer lock controls to check this flag
        const originalPointerLockInit = window.initPointerLock || function(){};
        window.initPointerLock = function() {
            if (window.preventPointerLock) {
                console.log("Pointer lock prevented - building mode active");
                return false;
            }
            return originalPointerLockInit.apply(this, arguments);
        };

        // Add listeners for pointer lock events through InputManager
        // Create handler functions that can be registered
        const handlePointerLockChange = () => {
            if (window.preventPointerLock && document.pointerLockElement) {
                // If pointer lock was activated while it should be prevented, exit it immediately
                document.exitPointerLock();
                console.log("Forced exit of pointer lock - building mode active");
            }
        };
        
        const handlePointerLockError = (event) => {
            if (window.preventPointerLock) {
                // Prevent the error from propagating when we're in building mode
                event.preventDefault();
                console.log("Prevented pointer lock error while in building mode");
            }
        };
        
        // We still need to use direct DOM listeners for these browser events
        // as they aren't standard input events handled by InputManager
        document.addEventListener('pointerlockchange', handlePointerLockChange, false);
        document.addEventListener('pointerlockerror', handlePointerLockError, false);
    }
    
    handleMouseMove(event) {
        // Only process if building mode is active
        if (this.active) {
            // Normalize event to extract clientX and clientY
            const clientX = event.clientX !== undefined ? event.clientX : 
                           (event.position ? event.position.x : null);
            const clientY = event.clientY !== undefined ? event.clientY : 
                           (event.position ? event.position.y : null);
                           
            if (clientX !== null && clientY !== null) {
                this.updateCursorPosition({
                    clientX: clientX,
                    clientY: clientY,
                    originalEvent: event
                });
            }
            
            // Store the last event for potential reference
            this.lastMouseEvent = event;
        }
        // Always update for potential hover effects
        window.lastMouseEvent = event;
    }
    
    handleMouseDown(event) {
        // Only process if building mode is active
        if (this.active) {
            // Get button value
            const button = event.button !== undefined ? event.button : 
                           (event.event ? event.event.button : 0);
                           
            if (button === 0) { // Left button (0)
                // Get clientX and clientY
                const clientX = event.clientX !== undefined ? event.clientX : 
                               (event.position ? event.position.x : null);
                const clientY = event.clientY !== undefined ? event.clientY : 
                               (event.position ? event.position.y : null);
                               
                if (clientX !== null && clientY !== null) {
                    this.placeStructure({
                        clientX: clientX,
                        clientY: clientY,
                        button: button,
                        originalEvent: event
                    });
                }
            }
        }
    }
    
    placeStructure(event) {
        // Get cursor position from normalized event
        const clientX = event.clientX !== undefined ? event.clientX : 
                       (event.position ? event.position.x : null);
        const clientY = event.clientY !== undefined ? event.clientY : 
                       (event.position ? event.position.y : null);
                       
        if (clientX === null || clientY === null) {
            console.error("[BuildingMode] Missing coordinates in placeStructure event", event);
            return;
        }
        
        // Get world position
        const worldPos = this.screenToWorld(clientX, clientY);
        if (!worldPos) return;
        
        // Ensure we have a structure selected
        if (!this.currentStructure) {
            console.warn("[BuildingMode] No structure type selected");
            return;
        }
        
        // Check if position is valid
        const isValid = this.checkPlacementValidity(worldPos);
        if (!isValid) {
            console.warn("[BuildingMode] Cannot place structure here - invalid position");
            return;
        }
        
        // Send placement request to server
        if (window.room) {
            window.room.send("placeStructure", {
                x: Math.round(worldPos.x),
                z: Math.round(worldPos.z),
                type: this.currentStructure,
                rotation: this.rotation
            });
            
            console.log(`[BuildingMode] Requested to place ${this.currentStructure} at (${Math.round(worldPos.x)}, ${Math.round(worldPos.z)}) with rotation ${this.rotation}°`);
        }
    }
}

// Wait for managers before initializing
if (typeof window !== 'undefined') {
    document.addEventListener('managersReady', () => {
        console.log("[BuildingModeManager] Managers ready event received.");
        if (window.buildingModeManager) {
            window.buildingModeManager.init();
        }
    });
}

// Create and expose instance (still needs to exist for the event listener)
if (typeof window !== 'undefined') {
    window.buildingModeManager = new BuildingModeManager();
    console.log("Building mode manager instance created, waiting for managersReady event.");
} else if (typeof module !== 'undefined') {
    // Basic export for potential Node.js usage (though unlikely for this manager)
    module.exports = BuildingModeManager;
}
