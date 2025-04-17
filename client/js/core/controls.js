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
        // If pointer is locked, this event provides data.movement (used by InputManager.onMouseMove)
        // If pointer is NOT locked, this still fires for UI interaction, but we don't rotate.
        
        // Handle third-person orbit IF NOT pointer locked and right mouse down
        // (Pointer locked third-person orbit uses updateControls logic)
        if (!document.pointerLockElement && (window.rightMouseDown || window.middleMouseDown) && !window.isFirstPerson && !window.isFreeCameraMode) {
                // Use direct event data for unlocked orbit
                const deltaX = data.movement.x;
                const deltaY = data.movement.y;
                
                // X movement orbits camera horizontally around player
                window.thirdPersonCameraOrbitX += deltaX * window.thirdPersonCameraOrbitSpeed;
                
                // Y movement changes camera height/angle (with limits to prevent flipping)
                window.thirdPersonCameraOrbitY -= deltaY * window.thirdPersonCameraOrbitSpeed;
                window.thirdPersonCameraOrbitY = THREE.MathUtils.clamp(
                    window.thirdPersonCameraOrbitY,
                    window.thirdPersonCameraMinY,
                    window.thirdPersonCameraMaxY
                );
        }
        // Free camera rotation is handled in updateControls when locked
        // First person rotation is handled in updateControls when locked
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
        
        // Add Escape key handler to exit gameplay
        case 'Escape':
            console.log("[ESC KEY] Setting shouldShowLockOverlay flag and exiting pointer lock");
            window.shouldShowLockOverlay = true;
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
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
    // Determine active input type
    const activeInputType = window.inputManager ? window.inputManager.getActiveInputType() : 'keyboardMouse';

    // --- Rotation Handling (Applies if pointer locked OR gamepad active) ---
    let applyRotation = (activeInputType === 'gamepad' || document.pointerLockElement);
    let deltaX = 0;
    let deltaY = 0;

    if (applyRotation) {
        // Get the accumulated delta from InputManager (contains mouse AND/OR gamepad stick input)
        const accumulatedDelta = window.inputManager.getMouseDelta();
        deltaX = accumulatedDelta.x;
        deltaY = accumulatedDelta.y;

        // *** ADD SCALING FOR GAMEPAD INPUT ***
        if (activeInputType === 'gamepad') {
            const gamepadScaleFactor = 15; // Back to a more reasonable value
            deltaX *= gamepadScaleFactor;
            deltaY *= gamepadScaleFactor;
            console.log(`[Controls] Scaled Gamepad Delta: x=${deltaX.toFixed(2)}, y=${deltaY.toFixed(2)}`);
        }
        // *** END SCALING ***

        // IMPORTANT: Reset InputManager's delta immediately after reading
        // (Moved after potential build mode handling)
        window.inputManager.mouseDelta.x = 0;
        window.inputManager.mouseDelta.y = 0;
        // Sync this cleared delta to serverInputState as well
        window.inputManager.serverInputState.mouseDelta.x = 0;
        window.inputManager.serverInputState.mouseDelta.y = 0;

        // Apply sensitivity
        const sensitivity = window.mouseSensitivity.current;
        const lookSensitivityFactor = 0.002; // Base sensitivity factor

        // Apply rotation based on view mode
        if (window.isFirstPerson && !window.isFreeCameraMode) {
            const rotationX = deltaY * lookSensitivityFactor * sensitivity; // Pitch
            const rotationY = deltaX * lookSensitivityFactor * sensitivity; // Yaw
            
            // Log before applying rotation
            console.log(`[Controls Update FP] Before Rotate: deltaX=${deltaX.toFixed(3)}, deltaY=${deltaY.toFixed(3)}, rotationX=${rotationX.toFixed(3)}, rotationY=${rotationY.toFixed(3)}, curPitch=${window.firstPersonCameraPitch?.toFixed(3)}, curYaw=${window.playerRotationY?.toFixed(3)}`);

            window.firstPersonCameraPitch = window.firstPersonCameraPitch || 0;
            window.firstPersonCameraPitch -= rotationX;
            window.firstPersonCameraPitch = THREE.MathUtils.clamp(
                window.firstPersonCameraPitch, -Math.PI/2 + 0.1, Math.PI/2 - 0.1
            );
            
            window.playerRotationY = window.playerRotationY || 0;
            window.playerRotationY -= rotationY;
            
            // Log after calculating new rotation
            console.log(`[Controls Update FP] After Calc: newPitch=${window.firstPersonCameraPitch.toFixed(3)}, newYaw=${window.playerRotationY.toFixed(3)}`);

            // Apply to camera
            window.camera.quaternion.setFromEuler(new THREE.Euler(
                window.firstPersonCameraPitch, window.playerRotationY, 0, 'YXZ'
            ));
            
            // Apply to player mesh for third-person transition
            if (window.playerEntity && window.playerEntity.mesh) {
                window.playerEntity.rotationY = window.playerRotationY;
                window.playerEntity.mesh.rotation.y = window.playerRotationY;
            }
            // Log after applying to camera/mesh
            console.log(`[Controls Update FP] Applied: Camera Quat W=${window.camera.quaternion.w.toFixed(3)}, Mesh Y=${window.playerEntity?.mesh?.rotation.y.toFixed(3)}`);
        } else if (!window.isFirstPerson && !window.isFreeCameraMode) { // Third-person
             // Only apply third-person orbit from stick/locked mouse if appropriate
             if (activeInputType === 'gamepad' || (document.pointerLockElement && (window.rightMouseDown || window.middleMouseDown)) ) { 
                 // Log before applying orbit
                 const prevOrbitX = window.thirdPersonCameraOrbitX;
                 const prevOrbitY = window.thirdPersonCameraOrbitY;
                 window.thirdPersonCameraOrbitX += deltaX * window.thirdPersonCameraOrbitSpeed;
                 window.thirdPersonCameraOrbitY -= deltaY * window.thirdPersonCameraOrbitSpeed;
                 window.thirdPersonCameraOrbitY = THREE.MathUtils.clamp(
                     window.thirdPersonCameraOrbitY, window.thirdPersonCameraMinY, window.thirdPersonCameraMaxY
                 );
                 // Log after applying orbit
                 console.log(`[Controls Update TP Orbit] deltaX=${deltaX.toFixed(3)}, deltaY=${deltaY.toFixed(3)}, OrbitX: ${prevOrbitX.toFixed(3)} -> ${window.thirdPersonCameraOrbitX.toFixed(3)}, OrbitY: ${prevOrbitY.toFixed(3)} -> ${window.thirdPersonCameraOrbitY.toFixed(3)}`);
             }
        } else if (window.isFreeCameraMode) { // Free Camera
            window.freeCameraYaw -= deltaX * window.freeCameraRotationSpeed;
            window.freeCameraPitch -= deltaY * window.freeCameraRotationSpeed;
            window.freeCameraPitch = THREE.MathUtils.clamp(
                window.freeCameraPitch, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1
            );
            window.camera.quaternion.setFromEuler(new THREE.Euler(
                window.freeCameraPitch, window.freeCameraYaw, 0, 'YXZ'
            ));
        }
    }
    // --- End Rotation Handling ---

    // Special handling for RTS mode - no rotation needed here
    if (window.isRTSMode) {
        updateRTSCameraMovement(delta);
        return;
    }
    
    // --- Movement Handling --- 
    // Note: Gamepad movement flags (window.moveForward etc.) are set by InputManager
    // Keyboard movement flags are set by onKeyDown/Up

    // We can use the same movement logic regardless of input type, based on the global flags
    let actualMoveSpeed = window.moveSpeed * delta;
    if (window.shiftPressed) {
         actualMoveSpeed *= 1.5; // Sprint
    }

    // Calculate movement direction based on flags
    let moveDirection = new THREE.Vector3(0, 0, 0);
    if (window.moveForward) moveDirection.z -= 1;
    if (window.moveBackward) moveDirection.z += 1;
    if (window.moveLeft) moveDirection.x -= 1;
    if (window.moveRight) moveDirection.x += 1;
    moveDirection.normalize(); // Prevent faster diagonal movement

    // Apply movement relative to camera orientation ONLY in first person
    if (window.isFirstPerson) {
         // Get forward and right vectors relative to the camera's Y rotation
         const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0,1,0), window.playerRotationY);
         const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), window.playerRotationY);

         // Combine directions
         let finalMove = new THREE.Vector3();
         finalMove.addScaledVector(forward, moveDirection.z);
         finalMove.addScaledVector(right, moveDirection.x);
         finalMove.normalize();

         // Apply final movement scaled by speed
         controls.getObject().position.addScaledVector(finalMove, actualMoveSpeed);

    } else if (!window.isFirstPerson && !window.isFreeCameraMode) { // Third-person
         // Movement is relative to the camera's horizontal orbit angle
         const angle = window.thirdPersonCameraOrbitX;
         const forward = new THREE.Vector3(-Math.sin(angle), 0, -Math.cos(angle));
         const right = new THREE.Vector3(-Math.cos(angle), 0, Math.sin(angle));

         let finalMove = new THREE.Vector3();
         finalMove.addScaledVector(forward, moveDirection.z);
         finalMove.addScaledVector(right, moveDirection.x);
         finalMove.normalize();
         
         controls.getObject().position.addScaledVector(finalMove, actualMoveSpeed);
    }
    // Free camera movement is handled separately in updateFreeCameraMovement if needed

    // --- Vertical Movement (Gravity/Jump) --- 
    // Apply gravity (always active unless on ground)
    window.velocity.y -= 9.8 * delta;
    controls.getObject().position.y += window.velocity.y * delta;

    // Ground collision
    if (controls.getObject().position.y < window.playerHeight) {
        window.velocity.y = 0;
        controls.getObject().position.y = window.playerHeight;
        window.canJump = true;
    }
    
    // --- Deprecated Logic --- 
    // This block is now replaced by the unified movement logic above
    /*
    // Handle gamepad input independently of pointer lock
    if (activeInputType === 'gamepad') {
        // Gamepad movement - Use global movement flags set by InputManager
        // These actions should work regardless of pointer lock state
        // ... (old gamepad movement logic removed) ...
        
        // IMPORTANT: Explicitly exit pointer lock if gamepad is active
        if (document.pointerLockElement) {
            console.log("[Controls] Exiting pointer lock because gamepad is active.");
            document.exitPointerLock();
        }
        
        // return; // Exit early for gamepad to avoid keyboard/mouse logic - REMOVED
    }
    */

    // This block is also replaced by the unified movement logic above
    /*
    // Keyboard/Mouse input - requires pointer lock
    if (document.pointerLockElement === document.body) {
        // Only perform client-side movement prediction 
        // Actual position updates will be driven by the server
        // ... (old KBM movement logic removed) ...
    } else {
        // If pointer isn't locked and using keyboard/mouse, reset velocity
        // This prevents drifting when focus is lost
        // Note: Gravity/Ground Collision now happens outside this block
        // window.velocity.x = 0;
        // window.velocity.z = 0;
    }
    */
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
    
    // Set a flag to prevent overlay display during transition
    window.inViewTransition = true;
    console.log("[TOGGLE] Set inViewTransition flag to prevent overlay flashing");
    
    // Reset view transition flag after delay (should match our other timeouts)
    setTimeout(() => {
        window.inViewTransition = false;
        console.log("[TOGGLE] Reset inViewTransition flag");
    }, 300);
    
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
