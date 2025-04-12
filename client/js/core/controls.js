// Global variables
window.moveForward = false;
window.moveBackward = false;
window.moveLeft = false;
window.moveRight = false;
window.turnLeft = false;    // For diagonal movement forward-left
window.turnRight = false;   // For diagonal movement forward-right
window.canJump = false;
// isFirstPerson is a global variable attached to the window object in game-engine.js
window.prevTime = performance.now();
window.velocity = new THREE.Vector3();
window.direction = new THREE.Vector3();

// Add input state object for server-based movement
window.inputState = {
  keys: { w: false, a: false, s: false, d: false, space: false, q: false, e: false, shift: false },
  mouseDelta: { x: 0, y: 0 }
};

// Add variable for right mouse button state tracking
window.rightMouseDown = false;
window.middleMouseDown = false;

// Player settings
window.playerHeight = 2.0;             // Height of camera from ground
window.moveSpeed = 50.0;                // Units per second
window.turnSpeed = 2.0;                // Rotation speed for Q/E turning
window.jumpHeight = 2.0;               // Jump height in units
window.jumpPressed = false;            // Track jump button press

// Third-person camera settings
window.thirdPersonCameraDistance = 5;  // Distance for the third person camera
window.thirdPersonCameraMinDistance = 2; // Minimum zoom distance
window.thirdPersonCameraMaxDistance = 10; // Maximum zoom distance
window.thirdPersonCameraZoomSpeed = 0.5; // Zoom speed multiplier
window.thirdPersonCameraOrbitSpeed = 0.003; // Orbit speed multiplier
window.thirdPersonCameraHeight = 3.0; // Height of camera above player 
window.thirdPersonCameraOrbitX = 0; // Horizontal orbit angle (left/right)
window.thirdPersonCameraOrbitY = 0.5; // Vertical orbit angle (up/down) 
window.thirdPersonCameraMinY = -0.3; // Minimum vertical orbit angle
window.thirdPersonCameraMaxY = 1.0; // Maximum vertical orbit angle

// Add variables for free camera mode
window.freeCameraSpeed = 0.3;         // Speed for free camera movement
window.freeCameraRotationSpeed = 0.003; // Rotation speed for free camera
window.freeCameraPitch = 0;          // Vertical rotation of free camera
window.freeCameraYaw = 0;            // Horizontal rotation of free camera

// Add variables for RTS view mode
window.rtsCameraHeight = 30.0;        // Fixed height for RTS camera
window.rtsCameraMinHeight = 10.0;     // Minimum height for RTS camera (zoom in)
window.rtsCameraMaxHeight = 60.0;     // Maximum height for RTS camera (zoom out)
window.rtsCameraZoomSpeed = 30.0;     // Speed for RTS camera zoom (keeping as requested)
window.rtsCameraPanSpeed = 0.5;       // Speed for RTS camera panning (reduced from 2.0)
window.isRTSMode = false;             // Flag for RTS mode
window.rtsSelectedUnit = null;        // Currently selected unit in RTS mode
window.rtsSelectedUnits = [];         // Array for multiple unit selection

// Mouse sensitivity settings
window.mouseSensitivity = {
  firstPerson: 1.0,    // Sensitivity multiplier in first-person
  thirdPerson: 0.7,    // Sensitivity multiplier in third-person (slightly lower for smoother movement)
  freeCamera: 1.0,     // Sensitivity for free camera
  rtsView: 0.5,        // Sensitivity for RTS view (lower as it's more tactical)
  current: 1.0         // Current sensitivity based on view mode
};

// Add a global viewMode state variable
window.viewMode = 'firstPerson'; // Values: 'firstPerson', 'thirdPerson', 'freeCamera', 'rtsView'

// Initialize controls for the camera
window.initControls = function(camera, domElement) {
    console.log("Initializing PointerLockControls properly...");

    const controls = new THREE.PointerLockControls(camera, domElement);
    
    // We don't need a click listener here anymore - it's handled in game-engine.js

    controls.addEventListener('lock', () => {
        console.log("Pointer locked");
        window.isControlsEnabled = true;
        window.canJump = true;
        document.body.classList.add('controls-enabled');
    });
    
    controls.addEventListener('unlock', () => {
        console.log("Pointer unlocked");
        window.isControlsEnabled = false;
        document.body.classList.remove('controls-enabled');
        
        // When pointer unlocks, if not in RTS or Free Cam, reset view to first person
        if (window.isFirstPerson) {
            const controlsInfo = document.getElementById('controls-info');
            if (controlsInfo) {
                controlsInfo.style.display = 'block';
            }
        }
        // Always show cursor when unlocked, regardless of view mode
        document.body.style.cursor = 'auto';
    });

    // Use InputManager for all input handling
    window.inputManager.on('keydown', onKeyDown);
    window.inputManager.on('keyup', onKeyUp);
    
    // Mouse button handlers for classic third-person orbital controls
    window.inputManager.on('mousedown', (data) => {
        if (data.button === 2) { // Right mouse button
            window.rightMouseDown = true;
        } else if (data.button === 1) { // Middle mouse button (scroll wheel click)
            window.middleMouseDown = true;
        }
    });
    
    window.inputManager.on('mouseup', (data) => {
        if (data.button === 2) { // Right mouse button
            window.rightMouseDown = false;
        } else if (data.button === 1) { // Middle mouse button
            window.middleMouseDown = false;
        }
    });
    
    // Prevent context menu from appearing on right-click (keep as direct)
    document.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });

    // Use InputManager for mouse movement
    window.inputManager.on('mousemove', (data) => {
        if (document.pointerLockElement) {
            // Apply sensitivity adjustment to mouse movements
            const sensitivity = window.mouseSensitivity.current;
            const event = data.event;
            
            if (window.isFirstPerson && !window.isFreeCameraMode) {
                // First-person: Standard FPS mouse look - rotate with mouse movement
                
                // Apply rotation locally for immediate response
                const rotationX = data.movement.y * 0.002 * sensitivity; // Vertical rotation (pitch)
                const rotationY = data.movement.x * 0.002 * sensitivity; // Horizontal rotation (yaw)
                
                // Update local camera rotation immediately
                if (window.camera) {
                    // Update the camera's pitch (looking up/down)
                    window.firstPersonCameraPitch = window.firstPersonCameraPitch || 0;
                    window.firstPersonCameraPitch -= rotationX;
                    
                    // Clamp the pitch to prevent looking too far up or down
                    window.firstPersonCameraPitch = THREE.MathUtils.clamp(
                        window.firstPersonCameraPitch,
                        -Math.PI/2 + 0.1,  // Slightly less than straight down
                        Math.PI/2 - 0.1    // Slightly less than straight up
                    );
                    
                    // Update the player's rotation around Y axis
                    window.playerRotationY = window.playerRotationY || 0;
                    window.playerRotationY -= rotationY;
                    
                    // Apply the rotations to the camera
                    window.camera.quaternion.setFromEuler(new THREE.Euler(
                        window.firstPersonCameraPitch,
                        window.playerRotationY,
                        0,
                        'YXZ'  // Important for proper FPS controls
                    ));
                    
                    // Update player mesh rotation immediately for seamless transition to third-person
                    if (window.playerEntity && window.playerEntity.mesh) {
                        // Update both entity property and mesh rotation - BUT NOT POSITION
                        window.playerEntity.rotationY = window.playerRotationY;
                        
                        // IMPORTANT: Only update the Y rotation, don't affect position
                        window.playerEntity.mesh.rotation.y = window.playerRotationY;
                        
                        // Force immediate rotation update to server
                        if (window.sendInputUpdate) {
                            window.sendInputUpdate();
                        }
                    }
                }
            } else if (!window.isFirstPerson && !window.isFreeCameraMode) {
                // Third-person: Only rotate camera when right mouse button is held (classic behavior)
                if (window.rightMouseDown || window.middleMouseDown) {
                    // X movement orbits camera horizontally around player
                    window.thirdPersonCameraOrbitX += data.movement.x * window.thirdPersonCameraOrbitSpeed;
                    
                    // Y movement changes camera height/angle (with limits to prevent flipping)
                    window.thirdPersonCameraOrbitY -= data.movement.y * window.thirdPersonCameraOrbitSpeed;
                    window.thirdPersonCameraOrbitY = THREE.MathUtils.clamp(
                        window.thirdPersonCameraOrbitY,
                        window.thirdPersonCameraMinY,
                        window.thirdPersonCameraMaxY
                    );
                }
            } else if (window.isFreeCameraMode) {
                // Free camera mode: Standard FPS-style look with mouse
                window.freeCameraYaw -= data.movement.x * window.freeCameraRotationSpeed;
                window.freeCameraPitch -= data.movement.y * window.freeCameraRotationSpeed;
                
                // Limit pitch to avoid flipping
                window.freeCameraPitch = THREE.MathUtils.clamp(
                    window.freeCameraPitch,
                    -Math.PI / 2 + 0.1,  // Avoid looking straight down
                    Math.PI / 2 - 0.1    // Avoid looking straight up
                );
                
                // Apply rotation to camera using quaternions for proper rotation
                window.camera.quaternion.setFromEuler(new THREE.Euler(
                    window.freeCameraPitch,
                    window.freeCameraYaw,
                    0,
                    'YXZ'  // Important for proper FPS controls
                ));
            }
        }
    });
    
    // Use InputManager for mouse wheel
    window.inputManager.on('wheel', (data) => {
        // Only handle zoom in third-person mode and not affect the server state
        if (!window.isFirstPerson) {
            // Normalize wheel delta across browsers (positive = zoom in, negative = zoom out)
            const zoomAmount = -data.delta * window.thirdPersonCameraZoomSpeed;
            
            // Apply zoom to the camera distance
            window.thirdPersonCameraDistance = THREE.MathUtils.clamp(
                window.thirdPersonCameraDistance - zoomAmount,
                window.thirdPersonCameraMinDistance,
                window.thirdPersonCameraMaxDistance
            );
            
            console.log(`Third-person camera zoom: ${window.thirdPersonCameraDistance.toFixed(1)}`);
        }
    });

    return controls;
}

// Update mouse sensitivity based on current view mode
function updateMouseSensitivity() {
    if (window.viewMode === 'firstPerson') {
        window.mouseSensitivity.current = window.mouseSensitivity.firstPerson;
    } else if (window.viewMode === 'thirdPerson') {
        window.mouseSensitivity.current = window.mouseSensitivity.thirdPerson;
    } else if (window.viewMode === 'freeCamera') {
        window.mouseSensitivity.current = window.mouseSensitivity.freeCamera;
    } else if (window.viewMode === 'rtsView') {
        window.mouseSensitivity.current = window.mouseSensitivity.rtsView;
    }
    console.log(`Updated mouse sensitivity to ${window.mouseSensitivity.current} (${window.viewMode} mode)`);
}

// Function to get the forward direction based on camera orientation in third-person mode
window.getThirdPersonForwardDirection = function() {
    const angle = window.thirdPersonCameraOrbitX;
    return new THREE.Vector3(-Math.sin(angle), 0, -Math.cos(angle));
}

// Key down event handler - fix Q/E rotation to match new model orientation
function onKeyDown(event) {
    // Skip if we're in an input field or textarea
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
    }
    
    // Map key code to action
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            window.moveForward = true;
            window.inputState.keys.w = true;
            break;
            
        case 'ArrowLeft':
        case 'KeyA':
            window.moveLeft = true;
            window.inputState.keys.a = true;
            break;
            
        case 'ArrowDown':
        case 'KeyS':
            window.moveBackward = true;
            window.inputState.keys.s = true;
            break;
            
        case 'ArrowRight':
        case 'KeyD':
            window.moveRight = true;
            window.inputState.keys.d = true;
            break;
            
        case 'KeyQ':
            window.turnLeft = true;
            window.inputState.keys.q = true;
            
            // Apply direct rotation when in first-person mode for immediate feedback
            if (window.isFirstPerson && window.playerEntity) {
                // Rotate player left (counter-clockwise) - 0.1 radians is about 5.7 degrees
                window.playerRotationY = (window.playerRotationY || 0) + 0.1;
                
                // Update mesh rotation, but not position (IMPORTANT)
                if (window.playerEntity.mesh) {
                    // Only update the rotation.y, don't affect position
                    window.playerEntity.mesh.rotation.y = window.playerRotationY;
                    // Ensure entity property is updated
                    window.playerEntity.rotationY = window.playerRotationY;
                }
                
                // Also update camera to match new rotation
                if (window.camera) {
                    window.camera.quaternion.setFromEuler(new THREE.Euler(
                        window.firstPersonCameraPitch || 0,
                        window.playerRotationY,
                        0,
                        'YXZ'
                    ));
                }
            }
            break;
            
        case 'KeyE':
            window.turnRight = true;
            window.inputState.keys.e = true;
            
            // Apply direct rotation when in first-person mode for immediate feedback
            if (window.isFirstPerson && window.playerEntity) {
                // Rotate player right (clockwise) - 0.1 radians is about 5.7 degrees
                window.playerRotationY = (window.playerRotationY || 0) - 0.1;
                
                // Update mesh rotation, but not position (IMPORTANT)
                if (window.playerEntity.mesh) {
                    // Only update the rotation.y, don't affect position
                    window.playerEntity.mesh.rotation.y = window.playerRotationY;
                    // Ensure entity property is updated
                    window.playerEntity.rotationY = window.playerRotationY;
                }
                
                // Also update camera to match new rotation
                if (window.camera) {
                    window.camera.quaternion.setFromEuler(new THREE.Euler(
                        window.firstPersonCameraPitch || 0,
                        window.playerRotationY,
                        0,
                        'YXZ'
                    ));
                }
            }
            break;
            
        case 'Space':
            window.canJump = false; // Reset jump ability until ground collision
            window.inputState.keys.space = true;
            // Client-side jump for prediction - server will override with authority
            if (window.velocity) {
                window.velocity.y = Math.sqrt(window.jumpHeight * 2 * 9.8);
            }
            break;

        case 'KeyV':
            // Prevent possible duplicate V key events
            if (!window.isViewToggleKeyDown) {
                window.isViewToggleKeyDown = true;
                console.log("[V KEY] Toggling view from:", window.viewMode);
                window.toggleCameraView(); // Call the global toggleCameraView function
            }
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            window.shiftPressed = true;
            window.inputState.keys.shift = true;
            break;
    }
    
    // Force an immediate input update to minimize latency
    if (window.sendInputUpdate && 
        (event.code === 'KeyW' || event.code === 'KeyA' || 
         event.code === 'KeyS' || event.code === 'KeyD' || 
         event.code === 'KeyQ' || event.code === 'KeyE' || 
         event.code === 'Space')) {
        window.sendInputUpdate();
    }
}

// Key up event handler
function onKeyUp(event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            window.moveForward = false;
            window.inputState.keys.w = false;
            break;
            
        case 'ArrowLeft':
        case 'KeyA':
            window.moveLeft = false;
            window.inputState.keys.a = false;
            break;
            
        case 'ArrowDown':
        case 'KeyS':
            window.moveBackward = false;
            window.inputState.keys.s = false;
            break;
            
        case 'ArrowRight':
        case 'KeyD':
            window.moveRight = false;
            window.inputState.keys.d = false;
            break;
            
        case 'KeyQ':
            window.turnLeft = false;
            window.inputState.keys.q = false;
            break;
            
        case 'KeyE':
            window.turnRight = false;
            window.inputState.keys.e = false;
            break;
            
        case 'Space':
            window.inputState.keys.space = false;
            break;
        case 'KeyV':
            // Reset the lock to prevent duplicate events
            window.isViewToggleKeyDown = false;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            window.shiftPressed = false;
            window.inputState.keys.shift = false;
            break;
    }
    
    // Force an immediate input update to minimize latency
    if (window.sendInputUpdate && 
        (event.code === 'KeyW' || event.code === 'KeyA' || 
         event.code === 'KeyS' || event.code === 'KeyD' || 
         event.code === 'KeyQ' || event.code === 'KeyE' || 
         event.code === 'Space')) {
        window.sendInputUpdate();
    }
}

// Update controls - call this in the animation loop
window.updateControls = function(controls, delta) {
    // Special handling for RTS mode - don't require pointer lock
    if (window.isRTSMode) {
        updateRTSCameraMovement(delta);
        return;
    }

    // Handle gamepad input independently of pointer lock
    if (window.inputManager && window.inputManager.lastActiveInputType === 'gamepad') {
        // Gamepad movement
        if (window.moveForward) {
            controls.moveForward(window.moveSpeed * delta);
        }
        if (window.moveBackward) {
            controls.moveForward(-window.moveSpeed * delta);
        }
        if (window.moveLeft) {
            controls.moveRight(-window.moveSpeed * delta);
        }
        if (window.moveRight) {
            controls.moveRight(window.moveSpeed * delta);
        }
        if (window.turnLeft) {
            // Move diagonally forward-left
            const diagonalSpeed = window.moveSpeed * 0.7 * delta; // Scale down for diagonal
            controls.moveForward(diagonalSpeed);
            controls.moveRight(-diagonalSpeed);
        }
        if (window.turnRight) {
            // Move diagonally forward-right
            const diagonalSpeed = window.moveSpeed * 0.7 * delta; // Scale down for diagonal
            controls.moveForward(diagonalSpeed);
            controls.moveRight(diagonalSpeed);
        }

        // Apply gravity for gamepad control
        window.velocity.y -= 9.8 * delta;
        controls.getObject().position.y += window.velocity.y * delta;

        // Ground collision for gamepad
        if (controls.getObject().position.y < window.playerHeight) {
            window.velocity.y = 0;
            controls.getObject().position.y = window.playerHeight;
            window.canJump = true;
        }
        return; // Exit early for gamepad to avoid pointer lock checks
    }

    // For mouse/keyboard, require pointer lock
    if (!controls.isLocked) return;
    
    // If we're in free camera mode, handle movement without updating the server
    if (window.isFreeCameraMode) {
        updateFreeCameraMovement(delta);
        return;
    }

    // Only perform client-side movement prediction 
    // Actual position updates will be driven by the server
    
    // Handle directional movement - scaled by delta for consistent speed
    if (window.moveForward) controls.moveForward(window.moveSpeed * delta);
    if (window.moveBackward) controls.moveForward(-window.moveSpeed * delta);
    if (window.moveLeft) controls.moveRight(-window.moveSpeed * delta);
    if (window.moveRight) controls.moveRight(window.moveSpeed * delta);
    
    // Handle Q/E keys for diagonal movement (forward + turning)
    if (window.turnLeft) {
        // Move diagonally forward-left
        const diagonalSpeed = window.moveSpeed * 0.7 * delta; // Scale down for diagonal
        controls.moveForward(diagonalSpeed);
        controls.moveRight(-diagonalSpeed);
    }
    if (window.turnRight) {
        // Move diagonally forward-right
        const diagonalSpeed = window.moveSpeed * 0.7 * delta; // Scale down for diagonal
        controls.moveForward(diagonalSpeed);
        controls.moveRight(diagonalSpeed);
    }

    // Apply gravity
    window.velocity.y -= 9.8 * delta;
    controls.getObject().position.y += window.velocity.y * delta;

    // Ground collision
    if (controls.getObject().position.y < window.playerHeight) {
        window.velocity.y = 0;
        controls.getObject().position.y = window.playerHeight;
        window.canJump = true;
    }
}

// Handle free camera movement independent of player
function updateFreeCameraMovement(delta) {
    // Calculate movement speed with delta time for consistent speed
    const moveSpeed = window.freeCameraSpeed * delta * 60; // Base speed adjusted for frame rate
    
    // Create movement vectors using quaternion-based direction
    // This ensures movement always follows the camera's view direction
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(window.camera.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(window.camera.quaternion).normalize();
    
    // Remove any Y component to keep movement horizontal (along XZ plane) for WASD
    forward.y = 0;
    forward.normalize();
    right.y = 0;
    right.normalize();
    
    // Apply movement based on keys
    if (window.moveForward) {
        window.camera.position.addScaledVector(forward, moveSpeed);
    }
    if (window.moveBackward) {
        window.camera.position.addScaledVector(forward, -moveSpeed);
    }
    if (window.moveLeft) {
        window.camera.position.addScaledVector(right, -moveSpeed);
    }
    if (window.moveRight) {
        window.camera.position.addScaledVector(right, moveSpeed);
    }
    
    // Handle vertical movement (space and shift)
    const up = new THREE.Vector3(0, 1, 0);
    if (window.inputState.keys.space) {
        window.camera.position.addScaledVector(up, moveSpeed);
    }
    if (window.shiftPressed) { 
        window.camera.position.addScaledVector(up, -moveSpeed);
    }
}

// Handle RTS camera movement (WASD for panning, Q/E for zoom)
function updateRTSCameraMovement(delta) {
    if (!window.isRTSMode) return;
    
    // In RTS view, we directly manipulate the camera position
    // Use a slightly higher multiplier for consistent speed with delta adjustment
    const panSpeed = window.rtsCameraPanSpeed * delta * 60; // Adjusted calculation with lower base panSpeed
    
    // Apply camera movements based on WASD keys
    if (window.inputState.keys.w) {
        window.camera.position.z -= panSpeed;
    }
    if (window.inputState.keys.s) {
        window.camera.position.z += panSpeed;
    }
    if (window.inputState.keys.a) {
        window.camera.position.x -= panSpeed;
    }
    if (window.inputState.keys.d) {
        window.camera.position.x += panSpeed;
    }
    
    // Handle zoom with Q/E keys (changes camera height)
    const zoomSpeed = window.rtsCameraZoomSpeed * delta;
    
    if (window.inputState.keys.q) { // Q key - zoom in (lower height)
        window.rtsCameraHeight = Math.max(
            window.rtsCameraMinHeight, 
            window.rtsCameraHeight - zoomSpeed
        );
        window.camera.position.y = window.rtsCameraHeight;
    }
    if (window.inputState.keys.e) { // E key - zoom out (increase height)
        window.rtsCameraHeight = Math.min(
            window.rtsCameraMaxHeight, 
            window.rtsCameraHeight + zoomSpeed
        );
        window.camera.position.y = window.rtsCameraHeight;
    }
    
    // Ensure camera always looks straight down
    window.camera.quaternion.setFromEuler(new THREE.Euler(-Math.PI/2, 0, 0, 'YXZ'));
}

// Function to toggle between camera views
window.toggleCameraView = function() {
    // Add a guard to prevent double-toggling
    if (window.isViewToggleActive) {
        console.log("[TOGGLE] View toggle already in progress, ignoring");
        return;
    }
    
    // Set the guard to block duplicate calls
    window.isViewToggleActive = true;
    
    // Reset the guard after a short delay
    setTimeout(() => {
        window.isViewToggleActive = false;
    }, 300); // 300ms should be enough to prevent double-triggering

    const previousViewMode = window.viewMode;
    console.log("[TOGGLE] Current mode:", previousViewMode);
    
    if (window.viewMode === 'firstPerson') {
        window.viewMode = 'thirdPerson';
        window.isFirstPerson = false;
        window.isFreeCameraMode = false;
        window.isRTSMode = false;
        try {
            if (typeof window.switchToThirdPersonView === 'function') {
                window.switchToThirdPersonView();
                console.log("[DEBUG] Switched to third-person view");
            } else {
                console.error("[ERROR] switchToThirdPersonView function not found");
            }
        } catch (error) {
            console.error("[ERROR] Error switching to third-person view:", error);
            // Fall back to first-person if third-person fails
            window.viewMode = 'firstPerson';
            window.isFirstPerson = true;
        }
    } else if (window.viewMode === 'thirdPerson') {
        window.viewMode = 'freeCamera';
        window.isFirstPerson = false;
        window.isFreeCameraMode = true;
        window.isRTSMode = false;
        // Save player position for free camera starting point
        if (window.playerEntity && window.playerEntity.mesh) {
            const pos = window.playerEntity.mesh.position.clone();
            pos.y += 3; // Start slightly above the player
            window.camera.position.copy(pos);
        }
        try {
            if (typeof window.switchToFreeCameraView === 'function') {
                window.switchToFreeCameraView();
                console.log("[DEBUG] Switched to free camera view");
            } else {
                console.error("[ERROR] switchToFreeCameraView function not found");
            }
        } catch (error) {
            console.error("[ERROR] Error switching to free camera view:", error);
            // Fall back to first-person if free camera fails
            window.viewMode = 'firstPerson';
            window.isFirstPerson = true;
            window.isFreeCameraMode = false;
        }
    } else if (window.viewMode === 'freeCamera') {
        window.viewMode = 'rtsView';
        window.isFirstPerson = false;
        window.isFreeCameraMode = false;
        window.isRTSMode = true;
        try {
            if (typeof window.switchToRTSView === 'function') {
                window.switchToRTSView();
                console.log("[DEBUG] Switched to RTS view");
            } else {
                console.error("[ERROR] switchToRTSView function not found");
            }
        } catch (error) {
            console.error("[ERROR] Error switching to RTS view:", error);
            // Fall back to first-person if RTS fails
            window.viewMode = 'firstPerson';
            window.isFirstPerson = true;
            window.isRTSMode = false;
        }
    } else {
        window.viewMode = 'firstPerson';
        window.isFirstPerson = true;
        window.isFreeCameraMode = false;
        window.isRTSMode = false;
        try {
            if (typeof window.switchToFirstPersonView === 'function') {
                window.switchToFirstPersonView(previousViewMode); // Pass previous mode
                console.log("[DEBUG] Switched back to first-person view");
            } else {
                console.error("[ERROR] switchToFirstPersonView function not found");
            }
        } catch (error) {
            console.error("[ERROR] Error switching to first-person view:", error);
        }
    }
    
    // Update mouse sensitivity for the new view mode
    updateMouseSensitivity();
    
    // Update UI for new view mode
    updateViewModeUI();
    
    // Update view toggle button with current mode
    const viewToggleBtn = document.getElementById('view-toggle');
    if (viewToggleBtn) {
        if (window.viewMode === 'firstPerson') {
            viewToggleBtn.textContent = 'First-Person View';
        } else if (window.viewMode === 'thirdPerson') {
            viewToggleBtn.textContent = 'Third-Person View';
        } else if (window.viewMode === 'freeCamera') {
            viewToggleBtn.textContent = 'Free Camera View';
        } else {
            viewToggleBtn.textContent = 'RTS View';
        }
    }
    
    console.log("[TOGGLE] Changed from", previousViewMode, "to", window.viewMode);
    
    // Return to prevent recursion
    return window.viewMode;
};

// Function to update the UI based on view mode
function updateViewModeUI() {
    // Do NOT show click instructions/overlay when switching views
    // Removed direct manipulation to centralize control in game-engine.js
    // const instructions = document.getElementById('lock-instructions');
    // if (instructions) {
    //     instructions.style.display = 'none';
    // }
}

// Check if this controller should be processed by this client
function shouldProcessController(gamepadIndex) {
    // Get client ID from URL if in local multiplayer mode
    const urlParams = new URLSearchParams(window.location.search);
    const localMultiplayer = urlParams.get('localMultiplayer') === 'true';
    const clientGamepadIndex = parseInt(urlParams.get('gamepadIndex'));
    
    // In local multiplayer mode, only process the assigned controller
    if (localMultiplayer) {
        if (urlParams.get('inputType') === 'gamepad') {
            // This client should only process its assigned gamepad
            return gamepadIndex === clientGamepadIndex;
        } else if (urlParams.get('inputType') === 'keyboard') {
            // This client uses keyboard, don't process any gamepads
            return false;
        }
        // Client with no input assigned shouldn't process any controllers
        return false;
    }
    
    // In normal mode, check with localMultiplayer manager if available
    if (window.localMultiplayer && typeof window.localMultiplayer.shouldProcessController === 'function') {
        const clientId = window.clientId || 'default';
        return window.localMultiplayer.shouldProcessController(gamepadIndex, clientId);
    }
    
    // Default to allowing all controllers if no other checks apply
    return true;
}

// Update gamepad state
function updateGamepadState() {
    if (navigator.getGamepads) {
        const gamepads = navigator.getGamepads();
        for (let i = 0; i < gamepads.length; i++) {
            const gamepad = gamepads[i];
            
            // Skip if no gamepad or if this controller shouldn't be processed by this client
            if (!gamepad || !shouldProcessController(i)) {
                continue;
            }
            
            // Check if we're on the start screen
            const startScreen = document.querySelector('.play-button') || 
                document.querySelector('.start-button') || 
                document.querySelector('.click-to-play');
                
            if (startScreen) {
                // Check for any button press to start the game from the start screen
                const anyButtonPressed = gamepad.buttons.some(button => button.pressed);
                if (anyButtonPressed) {
                    console.log("Gamepad button pressed on start screen, starting game...");
                    startScreen.click();
                    return; // Don't process other inputs until the game starts
                }
            }
            
            // Process gamepad input for the selected controller
            if (useGamepad && selectedGamepadIndex === i) {
                processGamepadInput(gamepad);
            }
        }
    }
}

// Process input from a gamepad
function processGamepadInput(gamepad) {
    // Left stick horizontal axis (positive is right)
    leftStickX = applyDeadzone(gamepad.axes[0], stickDeadzone) * analoglookSensitivity;
    
    // Left stick vertical axis (positive is down)
    leftStickY = applyDeadzone(gamepad.axes[1], stickDeadzone) * analoglookSensitivity;
    
    // Right stick horizontal axis (positive is right)
    rightStickX = applyDeadzone(gamepad.axes[2], stickDeadzone) * analoglookSensitivity;
    
    // Right stick vertical axis (positive is down)
    rightStickY = applyDeadzone(gamepad.axes[3], stickDeadzone) * analoglookSensitivity;
    
    // D-pad - map these to inputs
    const dpadUp = gamepad.buttons[12] ? gamepad.buttons[12].pressed : false;
    const dpadDown = gamepad.buttons[13] ? gamepad.buttons[13].pressed : false;
    const dpadLeft = gamepad.buttons[14] ? gamepad.buttons[14].pressed : false;
    const dpadRight = gamepad.buttons[15] ? gamepad.buttons[15].pressed : false;
    
    // A button (Xbox) / X button (PlayStation)
    gamepadData.jump = gamepad.buttons[0] ? gamepad.buttons[0].pressed : false;
    
    // X button (Xbox) / Square button (PlayStation)
    gamepadData.action1 = gamepad.buttons[2] ? gamepad.buttons[2].pressed : false;
    
    // Y button (Xbox) / Triangle button (PlayStation)
    gamepadData.action2 = gamepad.buttons[3] ? gamepad.buttons[3].pressed : false;
    
    // B button (Xbox) / Circle button (PlayStation)
    gamepadData.action3 = gamepad.buttons[1] ? gamepad.buttons[1].pressed : false;
    
    // Left trigger
    gamepadData.leftTrigger = gamepad.buttons[6] ? gamepad.buttons[6].value : 0;
    
    // Right trigger
    gamepadData.rightTrigger = gamepad.buttons[7] ? gamepad.buttons[7].value : 0;
    
    // Left bumper
    gamepadData.leftBumper = gamepad.buttons[4] ? gamepad.buttons[4].pressed : false;
    
    // Right bumper
    gamepadData.rightBumper = gamepad.buttons[5] ? gamepad.buttons[5].pressed : false;
    
    // Start button
    gamepadData.start = gamepad.buttons[9] ? gamepad.buttons[9].pressed : false;
    
    // Select button
    gamepadData.select = gamepad.buttons[8] ? gamepad.buttons[8].pressed : false;
    
    // Map d-pad to movement as alternative to left stick
    if (dpadUp) leftStickY = -1;
    if (dpadDown) leftStickY = 1;
    if (dpadLeft) leftStickX = -1;
    if (dpadRight) leftStickX = 1;
    
    // Check for view toggle (Y button / Triangle button)
    if (gamepadData.action2 && !prevGamepadData.action2) {
        toggleView();
    }
    
    // Update movement input based on left stick
    inputVector.x = leftStickX;
    inputVector.z = leftStickY;
    
    // Normalize input vector if it's longer than 1
    if (inputVector.length() > 1) {
        inputVector.normalize();
    }
    
    // Update camera rotation based on right stick
    if (Math.abs(rightStickX) > 0.1 || Math.abs(rightStickY) > 0.1) {
        // Apply the right stick for camera rotation
        rotateCamera(rightStickX, rightStickY);
    }
    
    // Store the previous state
    prevGamepadData = { ...gamepadData };
}
