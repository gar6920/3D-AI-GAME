class BuildingModeManager {
    constructor() {
        // State properties
        this.active = false;
        this.currentStructure = null;
        this.rotation = 0;
        this.rotationInterval = null;
        this.lastMousePosition = null;
        
        // Store previous view mode when entering building mode
        this.previousViewMode = null;
        
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
        
        // Structure types - loaded dynamically from server definitions
        this.structureTypes = [];
        
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
        this.update = this.update.bind(this);
        this.placeCurrentStructure = this.placeCurrentStructure.bind(this);
        
        // Initialize when ready
        // this.initWhenReady();
    }
    
    init() {
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
        
        // Load structure types based on server definitions
        this.loadStructureTypes();
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
                       
            // console.log("[BuildingMode] Keyup event:", key, event);
            
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
        // Toggle active state
        this.active = !this.active;
        console.log(`[BuildingModeManager] Toggled state. Active: ${this.active}`);
        
        // IMPORTANT: Set the global flag that other components check
        window.isBuildingMode = this.active;
        console.log(`[BuildingModeManager] Set global flag window.isBuildingMode = ${this.active}`);
        
        // Update prevention flag
        window.preventPointerLock = this.active;
        
        if (this.active) {
            // Entering Building Mode
            console.log('[BuildingModeManager] Entering building mode.');
            
            // Store the current view mode to restore later
            this.previousViewMode = window.viewMode;
            console.log(`[BuildingModeManager] Stored previous view mode: ${this.previousViewMode}`);
            
            // Show UI elements
            this.buildingModeIndicator.style.display = 'block';
            this.buildingMenu.style.display = 'block';
            this.placementPreview.style.display = 'block';
            
            // Initialize 3D preview if needed
            if (!this.buildingPreview && window.scene) {
                this.createPreviewModels();
            }
            
            // Show 3D preview and grid
            if (this.buildingPreview) {
                this.buildingPreview.group.visible = true;
                this.buildingPreview.grid.visible = true;
                
                // Set current type if activating
                if (this.currentStructure) {
                    this.buildingPreview.currentType = this.currentStructure;
                }
            }
            
            // Unlock the pointer to show cursor
            if (window.controls) {
                console.log('[BuildingModeManager] Activating - Checking element status:');
                console.log(`  - this.buildingMenu: ${this.buildingMenu ? 'Exists' : 'NULL'}`);
            
                if (window.controls.isLocked) {
                    window.controls.unlock();
                }
                // Disable pointer lock controls to prevent auto-locking
                window.controls.enabled = false;
            }
            
            // Most aggressive approach - add class to html element
            document.documentElement.classList.add('hide-cursor');
            
            // System cursor show (always visible in building mode)
            document.body.style.cursor = 'default';
            document.documentElement.style.cursor = 'default';
            window.renderer.domElement.style.cursor = 'default';
            
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

            document.body.appendChild(this.clickInterceptor);
            
            // Register with InputManager
            window.inputManager.registerUIElement('build-click-interceptor', 'click', (event) => {
                // Only handle LEFT CLICKS (button 0)
                if (event.button !== 0) return;
                
                // Determine if the click was on the building menu UI
                const clickedOnMenu = event.target.closest('#building-menu');
                
                // Only place structure if the click was NOT on the menu UI
                if (!clickedOnMenu) {
                     event.preventDefault();
                     event.stopPropagation();
                     console.log('[BuildingModeManager] Click interceptor triggered placement.');
                     this.placeCurrentStructure(); // ---> Call the new centralized method
                     
                     // No need to manually refresh preview, update() handles it
                } else {
                     console.log('[BuildingModeManager] Click intercepted but was on menu UI.');
                     // Allow default behavior for menu buttons (handled by their own listeners)
                }
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
            
            // Set transition flag to prevent overlay flashing during exit
            window.inViewTransition = true;
            console.log('[BuildingModeManager] Set inViewTransition flag to prevent overlay flashing');
            
            // Reset the flag after a delay (matching other transitions)
            setTimeout(() => {
                window.inViewTransition = false;
                console.log('[BuildingModeManager] Reset inViewTransition flag');
            }, 300);
            
            // Hide UI elements
            if (this.buildingModeIndicator) this.buildingModeIndicator.style.display = 'none';
            if (this.buildingMenu) this.buildingMenu.style.display = 'none';
            if (this.placementPreview) this.placementPreview.style.display = 'none';
            
            // Get input type to determine if we should re-lock
            const activeInputType = window.inputManager ? window.inputManager.getActiveInputType() : 'keyboardMouse';
            
            // Clear building mode flag
            window.preventPointerLock = false;
            
            // Hide 3D preview and grid
            if (this.buildingPreview) {
                this.buildingPreview.group.visible = false;
                this.buildingPreview.grid.visible = false;
            }
            
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
            
            // --- Restore the previous view mode and attempt to re-lock pointer if appropriate ---
            if (activeInputType === 'keyboardMouse' && !window.isRTSMode) {
                console.log(`[BuildingModeManager] Restoring previous view mode: ${this.previousViewMode}`);
                
                // Use a longer delay to ensure all transitions complete
                setTimeout(() => {
                    // Double-check conditions right before locking
                    if (activeInputType === 'keyboardMouse' && !window.isBuildingMode && !window.isRTSMode && !document.pointerLockElement) {
                        console.log('[BuildingModeManager] Re-acquiring pointer lock for keyboard/mouse input');
                        // Re-enable controls first
                        if (window.controls) {
                            window.controls.enabled = true;
                            window.controls.lock();
                        }
                    } else {
                        console.log('[BuildingModeManager] Not re-locking pointer', {
                            inputType: activeInputType,
                            isBuildingMode: window.isBuildingMode,
                            isRTSMode: window.isRTSMode,
                            pointerLocked: !!document.pointerLockElement
                        });
                    }
                }, 100); // 100ms delay to ensure transitions complete
            } else {
                console.log(`[BuildingModeManager] Not re-locking - using gamepad or in RTS mode: ${activeInputType}`);
            }
        }
        
        console.log("Building mode " + (this.active ? "activated" : "deactivated"));
        
        // Select default structure if activating
        if (this.active && !this.currentStructure) {
            this.selectStructureType('data_center');
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
        const activeInputType = window.inputManager ? window.inputManager.getActiveInputType() : 'keyboardMouse';
        if (this.active && activeInputType === 'keyboardMouse') {
            const worldPos = this.screenToWorld(clientX, clientY);
            if (worldPos) {
                // Save last mouse position
                this.lastMousePosition = worldPos; // Store the valid position for potential placement
            
                // Check if placement is valid
                this.buildingPreview.isValid = this.checkPlacementValidity(worldPos);
            
                // Update 3D preview position
                this.updatePreviewPosition(worldPos);
            } else {
                 // Raycast failed, mark as invalid and hide/update preview
                this.buildingPreview.isValid = false;
                this.updatePreviewPosition(null); // Pass null to hide the preview model
            }
        }
        // Only the 2D placement preview dot follows the actual mouse cursor now.
        // (This comment is slightly inaccurate now, the 3D preview also follows mouse if active)
    }
    
    update(deltaTime) {
        // Only run logic if building mode is active and components are ready
        if (!this.active || !window.camera || !window.scene || !this.buildingPreview) {
            // Ensure preview is hidden if not active or ready
            if (this.buildingPreview && this.buildingPreview.group) {
                 this.buildingPreview.group.visible = false;
                 this.buildingPreview.grid.visible = false; // Also hide grid
            }
            return;
        }
        
        // Ensure the grid is visible when active
        this.buildingPreview.grid.visible = true;
        
        const activeInputType = window.inputManager ? window.inputManager.getActiveInputType() : 'keyboardMouse';
        
        // --- GAMEPAD: Update preview based on camera center --- 
        if (activeInputType === 'gamepad') {
            // Raycast from the center of the screen
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const worldPos = this.screenToWorld(centerX, centerY);
            
            if (worldPos) {
                // Update the last known valid target position for placement
                this.lastMousePosition = worldPos; // Store the valid position for potential placement
            
                // Check placement validity based on raycast position
                this.buildingPreview.isValid = this.checkPlacementValidity(worldPos);
            
                // Update the 3D preview model's position, rotation, and material
                this.updatePreviewPosition(worldPos);
            } else {
                // Raycast failed (e.g., pointing at the sky), mark as invalid and hide/update preview
                this.buildingPreview.isValid = false;
                this.updatePreviewPosition(null); // Pass null to hide the preview model
            }
        }
        // --- MOUSE/KEYBOARD: Preview update is handled by updateCursorPosition --- 
        // No action needed here for mouse/keyboard, as updateCursorPosition handles it via mousemove.
        // We still need this update loop active for grid visibility etc.
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
        if (!window.scene || !THREE.GLTFLoader) {
            console.error("Scene or GLTFLoader not available for creating preview models");
            return;
        }
        
        // Create materials
        const validMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5,
            depthWrite: false // Ensure transparency works well
        });
        
        const invalidMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.5,
            depthWrite: false // Ensure transparency works well
        });
        
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
            models: {}, // Will store loaded GLTF scenes
            materials: {
                valid: validMaterial,
                invalid: invalidMaterial
            },
            currentType: null,
            isValid: true,
            isLoading: false, // Flag to track loading state
            loadedModelsCache: {} // Cache for loaded GLTF scenes
        };

        // --- Load all preview models asynchronously ---
        const loader = new THREE.GLTFLoader();
        const promises = this.structureTypes.map(type => {
            return new Promise((resolve, reject) => {
                const modelPath = `assets/models/${type.modelId}.glb`;
                loader.load(
                    modelPath,
                    (gltf) => {
                        console.log(`[BuildingModeManager] SUCCESS loading preview model: ${modelPath}`);
                        // Store the loaded scene for reuse
                        if (!gltf.scene) {
                            console.error(`[BuildingModeManager] Loaded GLTF for ${type.modelId} but gltf.scene is missing!`);
                        } else {
                            this.buildingPreview.loadedModelsCache[type.id] = gltf.scene; 
                            console.log(`[BuildingModeManager] Stored preview model scene in cache for key: ${type.id}`);
                        }
                        resolve();
                    },
                    undefined, // Progress callback (optional)
                    (error) => {
                        console.error(`[BuildingModeManager] FAILED loading preview model: ${modelPath}`, error);
                        reject(error); 
                    }
                );
            });
        });

        // Wait for all models to load (or fail)
        this.buildingPreview.isLoading = true;
        Promise.all(promises).then(() => {
            console.log("[BuildingModeManager] All preview models loaded successfully.");
            this.buildingPreview.isLoading = false;
            // If a structure was selected while loading, update the preview now
             if (this.active && this.currentStructure && this.lastMousePosition) {
                console.log("[BuildingModeManager] Updating preview after async load.");
                // Explicitly log cache state right before update
                console.log("[BuildingModeManager] Current preview cache state:", this.buildingPreview.loadedModelsCache);
                this.updatePreviewPosition(this.lastMousePosition);
            }
        }).catch(error => {
            console.error("[BuildingModeManager] Error loading one or more preview models:", error);
            this.buildingPreview.isLoading = false;
            // Handle potential errors, maybe disable building mode or show a message
        });

        console.log("Initiated loading of 3D preview models");
    }
    
    // Helper function to apply material recursively
    applyMaterialToGroup(group, material) {
        group.traverse((child) => {
            if (child.isMesh) {
                // Clone material to avoid unintended sharing
                child.material = material.clone(); 
            }
        });
    }
    
    updatePreviewPosition(worldPos) {
        console.log(`[BuildingModeManager] updatePreviewPosition called. worldPos: ${worldPos ? 'exists' : 'null'}, currentType: ${this.buildingPreview?.currentType}, isLoading: ${this.buildingPreview?.isLoading}`);
        if (!this.buildingPreview || !this.buildingPreview.group || this.buildingPreview.isLoading) {
             // Hide group if preview isn't ready or is loading
             if(this.buildingPreview && this.buildingPreview.group) {
                this.buildingPreview.group.visible = false;
             }
             return;
        }
        
        // Get preview data
        const preview = this.buildingPreview;
        
        // Clear current preview model from the group
        while (preview.group.children.length > 0) {
            preview.group.remove(preview.group.children[0]);
        }
        
        // If no world position, no selected type, or model not loaded, hide preview
        if (!worldPos || !preview.currentType || !preview.loadedModelsCache[preview.currentType]) {
            preview.group.visible = false;
            if (preview.currentType && !preview.loadedModelsCache[preview.currentType] && !preview.isLoading) {
                console.warn(`[BuildingModeManager] Preview model for ${preview.currentType} not loaded yet.`);
            }
            return;
        }
        
        // Get the loaded model from cache and clone it for the preview instance
        const originalModel = preview.loadedModelsCache[preview.currentType];
        if (!originalModel) {
             console.error(`[BuildingModeManager] Could not find loaded model for ${preview.currentType} in cache.`);
             preview.group.visible = false;
             return;
        }
        const modelInstance = originalModel.clone(true); // Deep clone
        
        // Apply appropriate material (valid/invalid) recursively
        const materialToApply = preview.isValid ? preview.materials.valid : preview.materials.invalid;
        this.applyMaterialToGroup(modelInstance, materialToApply);

        // --- Adjust position based on model's bounding box or defined height ---
        const structureDef = this.structureTypes.find(t => t.id === preview.currentType);
        const modelHeight = structureDef?.height || 1; // Use defined height or default
        
        // Scale the preview model if specified
        if (structureDef && structureDef.scale) {
            modelInstance.scale.setScalar(structureDef.scale);
        }

        // Position the model *within* the group so the group's origin is on the ground
        modelInstance.position.y = 0; // Model itself sits at the group's origin Y

        // Position the entire preview group in the world
        preview.group.position.set(worldPos.x, worldPos.y, worldPos.z); // worldPos.y is likely 0 from screenToWorld

        // Apply rotation to the group
        preview.group.rotation.y = this.rotation * (Math.PI / 180);
        
        // Add cloned model instance to the group and make it visible
        preview.group.add(modelInstance);
        preview.group.visible = true;
        console.log(`[BuildingModeManager] Preview model instance for ${preview.currentType} added to group and set visible.`);
    }
    
    placeCurrentStructure() {
        // Check if active, a structure is selected, preview exists, placement is valid, and room is available
        if (!this.active || !this.currentStructure || !this.buildingPreview || !this.buildingPreview.isValid || !window.room) {
            console.log('[BuildingModeManager] Placement conditions not met:', {
                active: this.active,
                currentStructure: this.currentStructure,
                previewExists: !!this.buildingPreview,
                isValid: this.buildingPreview ? this.buildingPreview.isValid : 'N/A',
                roomExists: !!window.room
            });
            return; // Cannot place
        }
        
        // Get position and rotation directly from the preview object
        const position = this.buildingPreview.group.position;
        const rotationRad = this.rotation * (Math.PI / 180);
        
        // ADDED: Log the exact position being sent
        console.log(`[BuildingModeManager] Preview position at time of placement: x=${position.x.toFixed(2)}, y=${position.y.toFixed(2)}, z=${position.z.toFixed(2)}, rotation=${this.rotation}°`);
        
        // Prepare placement data - ensure it includes necessary info for server
        const structureDef = this.structureTypes.find(t => t.id === this.currentStructure);
        if (!structureDef) {
            console.error(`[BuildingModeManager] Cannot find definition for structure type: ${this.currentStructure}`);
            return;
        }

        const placementData = {
            structureType: this.currentStructure, // e.g., 'building', 'wall'
            modelId: structureDef.modelId,       // Send model ID
            scale: structureDef.scale,           // Send scale
            x: Math.round(position.x),
            y: 0, // Structures placed on the ground plane (server might adjust)
            z: Math.round(position.z),
            rotationY: rotationRad // Send rotation in radians
        };
        
        console.log('[BuildingModeManager] Sending placeStructure request with data:', placementData);
        window.room.send("placeStructure", placementData);
        
        // Potential: Add a small cooldown here if needed
        // Example: this.canPlace = false; setTimeout(() => { this.canPlace = true; }, 200);
    }
    
    createStructureInWorld(structureData, key) {
        // console.log("[BuildingModeManager] Attempting to create structure entity:", key, structureData);
        
        // Skip if structure entity already exists in our map
        if (this.worldStructuresMap.has(key)) {
            console.log("[BuildingModeManager] Structure entity already exists, updating instead:", key);
            return this.updateStructureInWorld(structureData, key); // Use the update logic
        }
        
        // Ensure EntityFactory and Scene are available
        if (!window.entityFactory || !window.scene) {
            console.error("[BuildingModeManager] EntityFactory or Scene not available to create structure entity.");
            return null;
        }
        
        // Validate essential structure data received from server
        if (!structureData || !structureData.id || !structureData.modelId || 
            structureData.x === undefined || structureData.y === undefined || structureData.z === undefined) {
            console.error("[BuildingModeManager] Invalid or incomplete structure data from server:", structureData);
            return null;
        }

        // Prepare parameters for EntityFactory
        // Ensure we use the correct property names expected by the Entity constructor
        const entityParams = {
            id: structureData.id, // Use the ID from the server (which should match the key)
            modelId: structureData.modelId,
            scale: structureData.scale || 1, // Default scale if not provided
            x: structureData.x,
            y: structureData.y, // Use Y from server (might not be 0)
            z: structureData.z,
            rotationY: structureData.rotationY || 0, // Use rotation from server
            // type: structureData.structureType || 'entity', // Use specific type or fallback
            type: 'entity', // Use generic 'entity' type for now
            // Add any other relevant properties the Entity constructor might expect
            // name: structureData.name || structureData.structureType, 
            // color: structureData.color, // etc.
        };
        
        // console.log("[BuildingModeManager] Creating entity with params:", entityParams);

        try {
            // Use EntityFactory to create the structure entity instance
            // We assume a base 'entity' type handles model loading via modelId
            const structureEntity = window.entityFactory.createEntity(entityParams.type, entityParams);

            if (structureEntity) {
                // Store the Entity instance (not just the mesh)
                this.worldStructuresMap.set(key, structureEntity);
                
                // The Entity constructor and its loader callback handle initial positioning and scene addition
                console.log("[BuildingModeManager] Structure entity created/updated:", key);
                
                // Wait for readyPromise and add collider
                (async () => {
                    try {
                        if (structureEntity.readyPromise instanceof Promise) {
                            await structureEntity.readyPromise;
                            console.log(`[ColliderDebug] Dynamic structure ${key} readyPromise resolved.`);
                            // Pass the original server data (structureData) for collider info
                            if (!structureEntity._colliderAdded) { // Double check flag after promise
                                console.log(`[ColliderDebug] About to call tryAddCollider for player-built structure ID: ${structureData.id}. Server data (structureData):`, JSON.parse(JSON.stringify(structureData)));
                                window.tryAddCollider(structureData, structureEntity); 
                            }
                        } else {
                            console.warn(`[ColliderDebug] Dynamic structure ${key} missing readyPromise. Cannot add collider reliably.`);
                        }
                    } catch (err) {
                        console.error(`[ColliderDebug] Error waiting for readyPromise or adding collider for dynamic structure ${key}:`, err);
                    }
                })();

                return structureEntity;

            } else {
                 console.error("[BuildingModeManager] EntityFactory failed to return a structure entity instance:", key);
                 return null;
            }
        } catch (error) {
            console.error(`[BuildingModeManager] Error during entityFactory.createEntity for key ${key}:`, error);
            console.error("[BuildingModeManager] Entity Params used:", entityParams);
            return null;
        }
    }
    
    updateStructureInWorld(structureData, key) {
        const structureEntity = this.worldStructuresMap.get(key);
        
        if (structureEntity) {
            console.log("[BuildingModeManager] Updating structure entity:", key, structureData);
            // Update position and rotation using the Entity's method
             const updateData = {
                 x: structureData.x,
                 y: structureData.y, // Use server Y
                 z: structureData.z,
                 rotationY: structureData.rotationY || 0
             };
             structureEntity.updatePosition(updateData);

            // Handle other potential updates like scale or model change if necessary
            // Example: if (structureData.scale && structureEntity.mesh && structureEntity.scale !== structureData.scale) {
            //     structureEntity.scale = structureData.scale;
            //     structureEntity.mesh.scale.setScalar(structureData.scale); 
            // }
            // Example: Model change would likely require destroying and recreating the entity.

            return structureEntity;
        } else {
            // If entity doesn't exist in our map, attempt to create it
            console.warn("[BuildingModeManager] updateStructureInWorld called for non-existent key, attempting creation:", key);
            return this.createStructureInWorld(structureData, key);
        }
    }
    
    removeStructureFromWorld(key) {
        const structureEntity = this.worldStructuresMap.get(key);
        
        if (structureEntity) {
             console.log("[BuildingModeManager] Removing structure entity:", key);
            // Use the Entity's destroy method to handle scene removal and cleanup
            if (typeof structureEntity.destroy === 'function') {
                structureEntity.destroy();
            } else {
                // Fallback if destroy method is missing (shouldn't happen)
                if (structureEntity.mesh && structureEntity.mesh.parent) {
                    structureEntity.mesh.parent.remove(structureEntity.mesh);
                }
            }
            
            // Remove from our map
            this.worldStructuresMap.delete(key);
            console.log("[BuildingModeManager] Structure entity removed successfully:", key);
            return true;
        } else {
             console.log("[BuildingModeManager] Attempted to remove non-existent structure entity:", key);
             return false;
        }
    }
    
    initializeStructureListeners(room) {
        if (!room || !room.state || !room.state.structures) {
            console.error("[BuildingModeManager] initializeStructureListeners called before room/state/structures were ready!");
            return;
        }

        // console.log("[BuildingModeManager] Initializing structure listeners for room:", room.id);
        
        // Handler for new structures added by the server
        room.state.structures.onAdd = (structure, key) => {
            // console.log(`[BuildingModeManager] structures.onAdd listener triggered for key: ${key}`, structure);
            // Ensure the structure data includes an 'id' matching the key for the Entity constructor
             if (!structure.id) structure.id = key; 
            this.createStructureInWorld(structure, key);
        };
        
        // Handler for structures removed from the server
        room.state.structures.onRemove = (structure, key) => {
            console.log("[BuildingModeManager] structures.onRemove triggered:", key);
            this.removeStructureFromWorld(key);
        };
        
        // Handler for structures modified on the server
        room.state.structures.onChange = (structure, key) => {
             // Ensure the structure data includes an 'id' matching the key
             if (!structure.id) structure.id = key; 
            // console.log("Updated structure data received: ", key, structure); // Less verbose logging
            this.updateStructureInWorld(structure, key);
        };
        
        // Process any structures that might have already been added before listeners were attached
        if (room.state.structures.size > 0) {
            // console.log("[BuildingModeManager] Processing existing structures (", room.state.structures.size, ")");
            room.state.structures.forEach((structure, key) => {
                // Use createStructureInWorld which handles updates if already exists
                 // Ensure the structure data includes an 'id' matching the key
                 if (!structure.id) structure.id = key;
                this.createStructureInWorld(structure, key);
            });
        }
        
        // console.log("[BuildingModeManager] Structure listeners setup complete.");
        // Refresh build menu now that definitions are synced
        this.loadStructureTypes();
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
                    // this.placeStructure({
                    //     clientX: clientX,
                    //     clientY: clientY,
                    //     button: button,
                    //     originalEvent: event
                    // });
                }
            }
        }
    }
    
    // Dynamically load buildable structures from server definitions
    loadStructureTypes() {
        if (!window.room || !window.room.state || !window.room.state.structureDefinitions) {
            console.warn("[BuildingModeManager] No structure definitions available on client");
            this.structureTypes = [];
            this.renderStructureButtons(); // clear any existing buttons
            return;
        }
        this.structureTypes = [];
        window.room.state.structureDefinitions.forEach(def => {
            if (def.buildable) {
                const id = def.id;
                const name = id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                let modelId = id;
                if (def.modelPath) {
                    const parts = def.modelPath.split('/');
                    modelId = parts[parts.length - 1].replace('.glb', '');
                }
                this.structureTypes.push({ id, name, modelId, scale: def.scale || 1, height: def.height || def.scale || 1 });
            }
        });
        // After loading definitions, regenerate UI
        this.renderStructureButtons();
        // Select default if none chosen
        if (!this.currentStructure && this.structureTypes.length) {
            this.selectStructureType(this.structureTypes[0].id);
        }
    }
    
    // Render structure selection buttons based on loaded definitions
    renderStructureButtons() {
        if (!this.buildingMenu) return;
        // Remove old structure buttons
        const old = Array.from(this.buildingMenu.querySelectorAll('button'))
            .filter(b => b.id.startsWith('building-button-'));
        old.forEach(b => this.buildingMenu.removeChild(b));
        // Insert new buttons before rotate button
        const rotateBtn = this.buildingMenu.querySelector('#building-rotate-button');
        this.structureTypes.forEach(type => {
            const btn = document.createElement('button');
            btn.textContent = type.name;
            btn.id = `building-button-${type.id}`;
            Object.assign(btn.style, {
                margin: '0 5px', padding: '5px 10px', backgroundColor: '#555',
                color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer',
                zIndex: '1002', pointerEvents: 'auto'
            });
            this.buildingMenu.insertBefore(btn, rotateBtn);
            window.inputManager.registerUIElement(`building-button-${type.id}`, 'click', event => {
                event.preventDefault(); event.stopPropagation();
                this.selectStructureType(type.id);
                if (window.controls?.isLocked) window.controls.unlock();
            });
        });
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
