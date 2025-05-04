// 3D Game Platform - Game Engine
// Handles 3D scene, rendering, game loop, and core gameplay

// --- Imports ---
// Assuming THREE is available globally or via import map from CDN
// If using CDN directly without module loading for THREE, these might not be needed or might need different paths
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'; 
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
// import Stats from 'three/examples/jsm/libs/stats.module.js'; 
 
// Core local modules (adjust paths if necessary)
// import { InputManager } from './InputManager.js'; // InputManager seems to be loaded globally via script tag in HTML
// import { ActionManager } from './ActionManager.js'; // ActionManager seems to be loaded globally via script tag in HTML
// import { Player } from './Player.js';
// import { NPC } from './NPC.js';
// import { setupWorldEnvironment } from './world-environment.js';
// import { setupMultiplayer } from './network-core.js';
// import { PlayerUIManager } from './player-ui.js';
// import { ControlsManager } from './controls.js';
// import { UIManager } from './UIManager.js';
// import { OperatorManager } from './OperatorManager.js';
// import { BuildingModeManager } from './BuildingModeManager.js';
// import { PointerLockManager } from './PointerLockManager.js';
// import { ModelLoader } from './ModelLoader.js';
// --------------- 
 
// Debug support
const DEBUG = false; // Set to false to disable debug messages

function debug(message, isError = false) {
    if (!DEBUG) return;
    
    // Log to console only when debug is enabled
    if (isError) {
        console.error(`[ERROR] ${message}`);
    } else {
        console.log(`[DEBUG] ${message}`);
    }
}

// Game variables
let scene, camera, renderer, controls;
let player;  // Player object
let playerValue = 1;

// Player rotation and camera variables (initialized to prevent NaN values)
window.playerRotationY = 0;
window.firstPersonCameraPitch = 0;

// Add operator tracking without redeclaring variables
let heldOperator = null;
let lastOperatorSpawn = 0;

// Rotation variables for Q/E keys
let rotationQuaternion = new THREE.Quaternion();
let worldUp = new THREE.Vector3(0, 1, 0);
let rotationAxis = new THREE.Vector3();

// Global view mode tracking
window.isFirstPerson = true;  // Start in first-person view
window.isFreeCameraMode = false; // Not in free camera mode initially
window.playerPosition = null; // Store player position for returning from free camera mode

// HUD elements
const gameHUD = document.getElementById('game-hud');

// Global variables and UI elements
let viewToggleBtn = null; // Global reference for the view toggle button

// Initialize networking variables
let lastSentPosition = new THREE.Vector3();
let lastSentRotation = 0;
let positionUpdateInterval = 1000 / 30; // ms between position updates
let lastPositionUpdate = 0;
let inputUpdateInterval = 1000 / 30; // 30Hz input updates
let lastInputUpdate = 0;

// Add variables for input throttling
window.inputThrottleMs = 16; // Send inputs roughly every frame (60fps = 16.67ms)
window.lastInputTime = 0;

// Array to store animation callbacks
window.animationCallbacks = [];

// <<< ADDED >>>
// Global flag to control collider visibility
window.showSelectionColliders = false; 
// <<< END ADDED >>>

// Function to register callbacks to be executed during the animation loop
window.registerAnimationCallback = function(callback) {
    if (typeof callback === 'function' && !window.animationCallbacks.includes(callback)) {
        window.animationCallbacks.push(callback);
        console.log("Registered animation callback:", callback.name || "anonymous");
        return true;
    }
    return false;
};

// Function to unregister a callback from the animation loop
window.unregisterAnimationCallback = function(callback) {
    const index = window.animationCallbacks.indexOf(callback);
    if (index !== -1) {
        window.animationCallbacks.splice(index, 1);
        console.log("Unregistered animation callback:", callback.name || "anonymous");
        return true;
    }
    return false;
};

// Initialize physics variables and flags
function initPhysics() {
    try {
        debug('Initializing physics');
        
        // Basic physics setup
        window.velocity = new THREE.Vector3(0, 0, 0);
        window.direction = new THREE.Vector3(0, 0, 0);
        window.canJump = false;
        
        // Setup movement flags
        window.moveForward = false;
        window.moveBackward = false;
        window.moveLeft = false;
        window.moveRight = false;
        window.turnLeft = false;
        window.turnRight = false;
        
        // Setup rotation utilities
        window.worldUp = new THREE.Vector3(0, 1, 0);
        window.rotationAxis = new THREE.Vector3();
        window.rotationQuaternion = new THREE.Quaternion();
        
        debug('Physics initialized successfully');
    } catch (error) {
        debug(`Error initializing physics: ${error.message}`, true);
    }
}

// Initialize the floor
function initFloor() {
    try {
        debug('Creating floor');
        
        const floorSize = 400;
        const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
        
        // Create a simple procedural texture using canvas
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Base color
        ctx.fillStyle = '#3a7a3a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add some random noise for texture
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 3 + 1;
            
            // Randomly select lighter or darker green for variation
            if (Math.random() > 0.5) {
                ctx.fillStyle = 'rgba(80, 130, 80, 0.2)'; // lighter
            } else {
                ctx.fillStyle = 'rgba(40, 70, 40, 0.2)'; // darker
            }
            
            ctx.fillRect(x, y, size, size);
        }
        
        // Create texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(8, 8);
        
        // Create material with the texture
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            map: texture,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        floor.name = 'ground';
        scene.add(floor);
        
        debug('Floor created successfully with simplified procedural texture');
    } catch (error) {
        debug(`Error creating floor: ${error.message}`, true);
    }
}

// Initialize the game
window.onload = function() {
    debug('Window loaded, initializing game...');
    
    // Add view toggle button
    addViewToggleButton();
    
    // Create a dummy OperatorManager if not defined (for default implementation)
    if (typeof OperatorManager === 'undefined') {
        window.OperatorManager = class OperatorManager {
            constructor() {
                this.operators = {};
            }
            
            createOperator() { return null; }
            updateOperator() {}
            removeOperator() {}
            createOperatorFromServer() { return { group: new THREE.Group() }; }
            updateOperatorFromServer() {}
            removeOperatorByServerId() {}
        };
    }
    
    // Initialize with window.viewMode and window.isFirstPerson set to first-person
    window.viewMode = 'firstPerson';
    window.isFirstPerson = true;
    window.isFreeCameraMode = false; // Not in free camera mode initially
    window.playerLoaded = false; // Track if player has been created
    
    // Note: The 'v' keypress listener has been removed as it's handled in controls.js
    
    init();
};

// Add view toggle button to switch between first and third person
function addViewToggleButton() {
    try {
        // Create button if it doesn't exist
        viewToggleBtn = document.getElementById('view-toggle');
        
        if (!viewToggleBtn) {
            viewToggleBtn = document.createElement('button');
            viewToggleBtn.id = 'view-toggle';
            viewToggleBtn.textContent = 'First-Person View';  // Default view mode
            viewToggleBtn.style.position = 'absolute';
            viewToggleBtn.style.bottom = '20px';
            viewToggleBtn.style.right = '20px';
            viewToggleBtn.style.zIndex = '100';
            viewToggleBtn.style.padding = '8px 12px';
            viewToggleBtn.style.backgroundColor = 'rgba(0,0,0,0.6)';
            viewToggleBtn.style.color = 'white';
            viewToggleBtn.style.border = 'none';
            viewToggleBtn.style.borderRadius = '4px';
            viewToggleBtn.style.cursor = 'pointer';
            document.body.appendChild(viewToggleBtn);
            
            // Store the button element globally for access by InputManager
            window.viewToggleButton = viewToggleBtn;
        }
        
        // Instead of direct event listener, register a delegate that InputManager will handle
        // This will be processed by a UI event handler in InputManager
        if (window.inputManager) {
            window.inputManager.registerUIElement('view-toggle', 'click', function() {
                console.log("[BUTTON] Manually toggling view mode from:", window.viewMode);
                window.toggleCameraView();
            });
        } else {
            console.error("InputManager not available when adding view toggle button");
        }
        
        debug('View toggle button added');
    } catch (error) {
        debug(`Error adding view toggle button: ${error.message}`, true);
    }
}

// Toggle between first-person, third-person and free camera view functions have been moved to controls.js

// First-person setup
// Add 'previousViewMode' parameter to handle delayed locking if needed
window.switchToFirstPersonView = function(previousViewMode) {
    // Set transition flag to prevent overlay flashing during view change
    window.inViewTransition = true;
    console.log('[GameEngine] Set inViewTransition flag to prevent overlay flashing in FPS transition');
    
    // Reset the flag after a delay (matching other transitions)
    setTimeout(() => {
        window.inViewTransition = false;
        // console.log('[GameEngine] Reset inViewTransition flag');
    }, 300);
    
    // Hide player's mesh in first-person
    if (window.playerEntity && window.playerEntity.mesh) {
        window.playerEntity.mesh.visible = false;
    }
    
    // Hide selection rings in first-person view
    if (window.rtsSelectionRings) {
        window.rtsSelectionRings.forEach(ring => {
            if (ring) ring.visible = false;
        });
    }
    
    // Reset free camera variables
    window.freeCameraYaw = 0;
    window.freeCameraPitch = 0;
    
    // Hide RTS cursor when switching to first-person view
    if (document.getElementById('rts-cursor')) {
        document.getElementById('rts-cursor').style.display = 'none';
    }
    
    // Get active input type
    const activeInputType = window.inputManager ? window.inputManager.getActiveInputType() : 'keyboardMouse';

    // Reset cursor styles based on input type
    if (activeInputType === 'keyboardMouse') {
        document.body.style.cursor = 'none'; 
        renderer.domElement.style.cursor = 'none'; // Hide cursor immediately for FPS feel
    } else { // Gamepad
        document.body.style.cursor = 'default';
        renderer.domElement.style.cursor = 'default';
    }
    document.documentElement.style.cursor = document.body.style.cursor; // Sync with body
    
    // Define the lock function - only locks if keyboard/mouse is active
    const attemptLock = () => {
        if (activeInputType === 'keyboardMouse') {
            if (controls && !controls.isLocked) {
                console.log('[GameEngine] Attempting to lock controls in switchToFirstPersonView (Keyboard/Mouse)');
                controls.lock();
            } else if (controls && controls.isLocked) {
                console.log('[GameEngine] Controls already locked in switchToFirstPersonView');
            }
        } else {
            console.log('[GameEngine] Not locking controls in switchToFirstPersonView (Gamepad)');
        }
    };

    // Delay lock if coming from a mode that explicitly exits lock (RTS/FreeCam)
    if (previousViewMode === 'rtsView' || previousViewMode === 'freeCamera') {
        console.log('[GameEngine] Delaying lock attempt (100ms) after switching from RTS/FreeCam.');
        setTimeout(attemptLock, 100); // Delay 100ms
    } else {
        // If coming from third-person (or initial load), attempt lock immediately
        console.log('[GameEngine] Attempting lock immediately after switching from', previousViewMode);
        attemptLock(); 
    }
    
    // Set camera position based on the available player information
    // Try multiple sources to ensure we always have a position
    let playerX = 0, playerY = 0, playerZ = 0, rotationY = 0, pitch = 0;
    
    // First check server state if available
    if (window.room && window.room.state && window.room.state.players) {
        const playerState = window.room.state.players.get(window.room.sessionId);
        if (playerState) {
            playerX = playerState.x;
            playerY = playerState.y;
            playerZ = playerState.z;
            rotationY = playerState.rotationY || 0;
            pitch = playerState.pitch || 0;
        }
    }
    // Fallback to local player object if server state not available
    else if (window.playerEntity && window.playerEntity.mesh) {
        playerX = window.playerEntity.mesh.position.x;
        playerY = window.playerEntity.mesh.position.y;
        playerZ = window.playerEntity.mesh.position.z;
        rotationY = window.playerEntity.mesh.rotation.y || 0;
    }
    
    // Position camera at player's head
    if (window.camera) {
        window.camera.position.set(
            playerX,
            playerY + (window.playerHeight || 2.0),
            playerZ
        );
        
        // Set camera rotation using quaternions to prevent gimbal lock
        window.camera.quaternion.setFromEuler(new THREE.Euler(
            pitch,
            rotationY,
            0,
            'YXZ'  // Important for proper FPS controls
        ));
        
        // Update controls position if available
        if (controls) {
            controls.getObject().position.copy(window.camera.position);
        }
        
        // Force an immediate render to show the new view
        if (window.renderer && window.scene) {
            window.renderer.render(window.scene, window.camera);
        }
    }
    
    // If we were in free camera mode, tell the server we're back
    if (window.isFreeCameraMode) {
        window.isFreeCameraMode = false;
        if (window.sendInputUpdate) {
            window.sendInputUpdate();
        }
    }
    
    console.log("Switched to first-person view. Camera at:", window.camera.position);
};

// Third-person setup
window.switchToThirdPersonView = function() {
    // Show player's mesh in third-person
    if (window.playerEntity && window.playerEntity.mesh) {
        window.playerEntity.mesh.visible = true;
    }
    
    // Hide selection rings in third-person view
    if (window.rtsSelectionRings) {
        window.rtsSelectionRings.forEach(ring => {
            if (ring) ring.visible = false;
        });
    }
    
    // Hide RTS cursor when switching to third-person view
    if (document.getElementById('rts-cursor')) {
        document.getElementById('rts-cursor').style.display = 'none';
    }
    
    // Always show cursor in third person (even if using keyboard/mouse for orbit)
    document.body.style.cursor = 'default';
    document.documentElement.style.cursor = 'default';
    renderer.domElement.style.cursor = 'default';
    
    // Check input type before locking pointer
    const activeInputType = window.inputManager ? window.inputManager.getActiveInputType() : 'keyboardMouse';
    if (activeInputType === 'keyboardMouse') {
        if (controls && !controls.isLocked) {
            console.log("[GameEngine] Locking pointer for third-person view (Keyboard/Mouse)");
            controls.lock();
        }
    } else {
        console.log("[GameEngine] Not locking pointer for third-person view (Gamepad)");
        // Ensure pointer is unlocked if switching to third-person with gamepad
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }
    
    // Reset orbit angles if they don't exist
    window.thirdPersonCameraOrbitX = window.thirdPersonCameraOrbitX || 0;
    window.thirdPersonCameraOrbitY = window.thirdPersonCameraOrbitY || 0.5;
    
    // Make sure player state exists
    if (window.room && window.room.state && window.room.state.players) {
        const playerState = window.room.state.players.get(window.room.sessionId);
        if (playerState) {
            // Position camera based on player's current position/rotation
            const offsetX = window.thirdPersonCameraDistance * Math.sin(playerState.rotationY) * Math.cos(window.thirdPersonCameraOrbitY);
            const offsetZ = window.thirdPersonCameraDistance * Math.cos(playerState.rotationY) * Math.cos(window.thirdPersonCameraOrbitY);
            const offsetY = window.thirdPersonCameraDistance * Math.sin(window.thirdPersonCameraOrbitY);
            
            // Immediately position camera with offset for immediate visual feedback
            window.camera.position.set(
                playerState.x + offsetX,
                playerState.y + window.thirdPersonCameraHeight + offsetY,
                playerState.z + offsetZ
            );
            
            // Set camera to look at player
            const lookTarget = new THREE.Vector3(
                playerState.x, 
                playerState.y + window.thirdPersonCameraHeight * 0.8, // Look at upper body
                playerState.z
            );
            
            // Create look direction and rotation
            const direction = new THREE.Vector3().subVectors(lookTarget, window.camera.position).normalize();
            const quaternion = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, -1),
                direction
            );
            
            // Apply rotation to camera immediately
            window.camera.quaternion.copy(quaternion);
            
            // Force an immediate render to update the view
            if (window.renderer && window.scene) {
                window.renderer.render(window.scene, window.camera);
            }
        }
    }
    
    console.log("Switched to third-person view. Camera at:", window.camera.position);
};

// Free camera setup
window.switchToFreeCameraView = function() {
    // Store current camera position for when we return
    window.playerPosition = camera.position.clone();
    window.isFreeCameraMode = true;
    
    // Show player mesh since we're viewing from outside
    if (window.playerEntity && window.playerEntity.mesh) {
        window.playerEntity.mesh.visible = true;
    }
    
    // Hide selection rings in free camera view
    if (window.rtsSelectionRings) {
        window.rtsSelectionRings.forEach(ring => {
            if (ring) ring.visible = false;
        });
    }
    
    // Hide RTS cursor when switching to free camera view
    if (document.getElementById('rts-cursor')) {
        document.getElementById('rts-cursor').style.display = 'none';
    }
    
    // Always show cursor in free camera mode
    document.body.style.cursor = 'default';
    document.documentElement.style.cursor = 'default';
    renderer.domElement.style.cursor = 'default';
    
    // Check input type before locking pointer
    const activeInputType = window.inputManager ? window.inputManager.getActiveInputType() : 'keyboardMouse';
    if (activeInputType === 'keyboardMouse') {
        if (controls && !controls.isLocked) {
            console.log("[GameEngine] Locking pointer for free camera view (Keyboard/Mouse)");
            controls.lock();
        }
    } else {
        console.log("[GameEngine] Not locking pointer for free camera view (Gamepad)");
        // Ensure pointer is unlocked if switching to free camera with gamepad
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }
    
    // Disable normal player controls but keep pointer lock active if needed for mouse look
    controls.enabled = false; // May need adjustment if lock isn't used
    
    // Initialize free camera movement speed
    window.freeCameraSpeed = 0.5;
    
    console.log("Switched to free camera view");
};

// RTS view setup
window.switchToRTSView = function() {
    // Sync RTS active flags
    if (!window.isRTSMode) window.isRTSMode = true; // ensure flag
    window.isRTSViewActive = true;
    // Show player mesh since we're viewing from above
    if (window.playerEntity && window.playerEntity.mesh) {
        window.playerEntity.mesh.visible = true;
    }
    
    // Show selection rings in RTS view if there are selected units
    if (window.rtsSelectionRings) {
        window.rtsSelectionRings.forEach(ring => {
            if (ring) ring.visible = true;
        });
    }
    
    // For RTS view, we need to see the cursor and keep it unlocked
    if (controls && controls.isLocked) {
        controls.unlock();
    }
    controls.enabled = false;
    
    // Set a timeout to ensure we stay unlocked if the browser is slow to respond
    setTimeout(() => {
        // Double check that we're still in RTS mode
        if (window.isRTSMode && controls && controls.isLocked) {
            controls.unlock();
        }
    }, 100);
    
    // Initialize RTS selection box variables
    window.rtsSelectionBoxActive = false;
    window.rtsSelectionStartX = 0;
    window.rtsSelectionStartY = 0;
    window.rtsSelectionEndX = 0;
    window.rtsSelectionEndY = 0;
    
    // Create selection box element if it doesn't exist
    if (!document.getElementById('rts-selection-box')) {
        const selectionBox = document.createElement('div');
        selectionBox.id = 'rts-selection-box';
        selectionBox.style.position = 'fixed';
        selectionBox.style.border = '2px solid #00ff00';
        selectionBox.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
        selectionBox.style.pointerEvents = 'none';
        selectionBox.style.display = 'none';
        selectionBox.style.zIndex = '9998'; // Just below cursor
        document.body.appendChild(selectionBox);
    }
    
    // Add specific RTS mode keyboard listener
    if (!window.rtsKeyboardListenerAdded) {
        // Setup keydown handler for RTS mode
        window.inputManager.on('keydown', (event) => {
            if (!window.isRTSMode) return;
            
            // Log key presses in RTS mode for debugging
            console.log("RTS Mode Key Pressed:", event.code);
            
            switch (event.code) {
                case 'KeyW':
                    window.inputState.keys.w = true;
                    console.log("W key pressed in RTS mode");
                    break;
                case 'KeyA':
                    window.inputState.keys.a = true;
                    console.log("A key pressed in RTS mode");
                    break;
                case 'KeyS':
                    window.inputState.keys.s = true;
                    console.log("S key pressed in RTS mode");
                    break;
                case 'KeyD':
                    window.inputState.keys.d = true;
                    console.log("D key pressed in RTS mode");
                    break;
                case 'KeyQ':
                    window.inputState.keys.q = true;
                    console.log("Q key pressed in RTS mode");
                    break;
                case 'KeyE':
                    window.inputState.keys.e = true;
                    console.log("E key pressed in RTS mode");
                    break;
            }
        });
        
        // Setup keyup handler for RTS mode
        window.inputManager.on('keyup', (event) => {
            if (!window.isRTSMode) return;
            
            switch (event.code) {
                case 'KeyW':
                    window.inputState.keys.w = false;
                    break;
                case 'KeyA':
                    window.inputState.keys.a = false;
                    break;
                case 'KeyS':
                    window.inputState.keys.s = false;
                    break;
                case 'KeyD':
                    window.inputState.keys.d = false;
                    break;
                case 'KeyQ':
                    window.inputState.keys.q = false;
                    break;
                case 'KeyE':
                    window.inputState.keys.e = false;
                    break;
            }
        });
        
        console.log("RTS keyboard handlers set up through InputManager");
        
        window.rtsKeyboardListenerAdded = true;
    }
    
    // Set initial camera position - start above the player
    let playerX = 0, playerZ = 0;
    
    // Try to get player position from server or local object
    if (window.room && window.room.state && window.room.state.players) {
        const playerState = window.room.state.players.get(window.room.sessionId);
        if (playerState) {
            playerX = playerState.x;
            playerZ = playerState.z;
        }
    }
    // Fallback to local player object
    else if (window.playerEntity && window.playerEntity.mesh) {
        playerX = window.playerEntity.mesh.position.x;
        playerZ = window.playerEntity.mesh.position.z;
    }
    
    // Position camera above player
    window.camera.position.set(playerX, window.rtsCameraHeight, playerZ);
    
    // Set camera to look straight down
    window.camera.quaternion.setFromEuler(new THREE.Euler(-Math.PI/2, 0, 0, 'YXZ'));
    
    // Force an immediate render to update the view
    if (window.renderer && window.scene) {
        window.renderer.render(window.scene, window.camera);
    }
    
    // Add RTS cursor unless it already exists
    if (!document.getElementById('rts-cursor')) {
        createRTSCursor();
    }
    
    // Show our custom RTS cursor and hide system cursor
    const rtsCursor = document.getElementById('rts-cursor');
    rtsCursor.style.display = 'block';
    rtsCursor.style.transform = 'translate(-50%, -50%)';
    
    // Get current mouse position from system
    const mouseX = window.lastMouseX || window.innerWidth / 2;
    const mouseY = window.lastMouseY || window.innerHeight / 2;
    
    // Position cursor at current mouse position
    rtsCursor.style.left = mouseX + 'px';
    rtsCursor.style.top = mouseY + 'px';
    
    // Apply cursor hiding to all relevant elements
    document.body.style.cursor = 'none';
    document.documentElement.style.cursor = 'none';
    renderer.domElement.style.cursor = 'none';
    
    // Hide pointer lock instructions if they're visible
    const instructions = document.getElementById('lock-instructions');
    if (instructions) {
        instructions.style.display = 'none';
    }
    
    console.log("Switched to RTS view");
    
    // Add global click handler for RTS selection
    if (!window._rtsGlobalClickAdded) {
        window._rtsGlobalClickAdded = true;
        document.addEventListener('click', (evt) => {
            if (!window.isRTSMode) return;
            // Only handle left button
            if (evt.button !== 0) return;
            // Update rtsMouse for raycasting
            window.rtsMouse = {
                x: (evt.clientX / window.innerWidth) * 2 - 1,
                y: -(evt.clientY / window.innerHeight) * 2 + 1
            };
            console.log('[RTS DEBUG] Global click handler firing selectUnitInRTSMode');
            selectUnitInRTSMode();
        });
    }
}

// Handle mouse movement for free camera
function onMouseMove(event) {
    // In RTS mode, handle selection box if active
    if (window.isRTSMode) {
        if (window.rtsSelectionBoxActive) {
            window.rtsSelectionEndX = event.clientX;
            window.rtsSelectionEndY = event.clientY;
            updateSelectionBox();
        }
        
        // Ensure pointer lock is off and just update our custom cursor
        if (controls && controls.isLocked) {
            controls.unlock();
        }
        
        // Update our custom cursor position
        if (document.getElementById('rts-cursor')) {
            updateRTSCursorPosition(event);
        }
        return;
    }
    
    if (!window.controls || !window.controls.isLocked) return;
    
    // Store mouse movement for input state
    window.inputState.mouseDelta.x += event.movementX;
    window.inputState.mouseDelta.y += event.movementY;
    
    if (window.isFreeCameraMode) {
        // Initialize Euler angles if they don't exist
        if (!window.freeCameraEuler) {
            window.freeCameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');
        }
        
        // Update rotation with mouse movement
        const rotationSpeed = 0.002;
        
        // Update yaw (left/right) and pitch (up/down)
        window.freeCameraEuler.y -= event.movementX * rotationSpeed;
        window.freeCameraEuler.x = Math.max(
            -Math.PI/2,
            Math.min(Math.PI/2,
                window.freeCameraEuler.x - event.movementY * rotationSpeed
            )
        );
        
        // Keep roll (z-axis) at 0 to prevent tilting
        window.freeCameraEuler.z = 0;
        
        // Apply rotation to camera, maintaining upright orientation
        camera.quaternion.setFromEuler(window.freeCameraEuler);
    }
    
    // In RTS mode, camera rotation with mouse is disabled
    // as the camera always looks straight down
}

// Handle keyboard movement for free camera
function updateFreeCameraMovement() {
    if (!window.isFreeCameraMode) return;
    
    const speed = window.freeCameraSpeed;
    const moveVector = new THREE.Vector3();
    
    // Get camera's forward and right vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    
    // WASD movement
    if (window.inputState.keys.w) moveVector.add(forward.multiplyScalar(speed));
    if (window.inputState.keys.s) moveVector.sub(forward);
    if (window.inputState.keys.a) moveVector.sub(right);
    if (window.inputState.keys.d) moveVector.add(right);
    
    // Up/Down movement with Q/E
    if (window.inputState.keys.q) moveVector.y += speed;
    if (window.inputState.keys.e) moveVector.y -= speed;
    
    // Apply movement
    camera.position.add(moveVector.multiplyScalar(speed));
}

// Position camera behind player for third-person view - more responsive
window.updateThirdPersonCamera = function() {
    if (!window.room || !window.room.state || !window.room.state.players) return;
    
    const playerState = window.room.state.players.get(window.room.sessionId);
    if (!playerState) return;
    
    // Calculate offset based on orbit angles
    const offsetX = window.thirdPersonCameraDistance * Math.sin(window.thirdPersonCameraOrbitX) * Math.cos(window.thirdPersonCameraOrbitY);
    const offsetZ = window.thirdPersonCameraDistance * Math.cos(window.thirdPersonCameraOrbitX) * Math.cos(window.thirdPersonCameraOrbitY);
    const offsetY = window.thirdPersonCameraDistance * Math.sin(window.thirdPersonCameraOrbitY);
    
    // Calculate target camera position
    const targetX = playerState.x + offsetX;
    const targetY = playerState.y + window.thirdPersonCameraHeight + offsetY;
    const targetZ = playerState.z + offsetZ;
    
    // Use faster lerp for more responsive camera movement
    const lerpFactor = 0.3; // Higher = more responsive
    
    // Apply smooth but responsive camera movement
    window.camera.position.x = THREE.MathUtils.lerp(window.camera.position.x, targetX, lerpFactor);
    window.camera.position.y = THREE.MathUtils.lerp(window.camera.position.y, targetY, lerpFactor);
    window.camera.position.z = THREE.MathUtils.lerp(window.camera.position.z, targetZ, lerpFactor);
    
    // Instant position correction if too far away (prevents extreme lag)
    const distSq = Math.pow(window.camera.position.x - targetX, 2) +
                   Math.pow(window.camera.position.y - targetY, 2) +
                   Math.pow(window.camera.position.z - targetZ, 2);
                   
    if (distSq > 25) { // About 5 units away - immediately snap to correct position
        window.camera.position.set(targetX, targetY, targetZ);
    }
    
    // Point camera at player
    const lookTarget = new THREE.Vector3(
        playerState.x, 
        playerState.y + window.thirdPersonCameraHeight * 0.8, // Look at upper body
        playerState.z
    );
    
    // Create look direction and rotation
    const direction = new THREE.Vector3().subVectors(lookTarget, window.camera.position).normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, -1),
        direction
    );
    
    // Apply rotation to camera immediately for responsive look
    window.camera.quaternion.copy(quaternion);
    
    // Ensure player mesh is visible in third-person view
    if (window.playerEntity && window.playerEntity.mesh) {
        window.playerEntity.mesh.visible = true;
    }
};

// Main initialization function
function init() {
    try {
        debug('Initializing game');
        
        // Create the scene first
        initScene();
        
        // Initialize physics variables and flags
        initPhysics();
        
        // Create the camera
        debug('Creating camera');
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        // Only initialize with temporary position - actual position will be set when player is created
        camera.position.set(0, 0, 0);
        window.camera = camera; // Make globally available
        
        // Setup renderer
        debug('Setting up renderer');
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.gammaFactor = 2.2;
        
        // Add renderer to document
        document.body.appendChild(renderer.domElement);
        window.renderer = renderer;
        
        // Initialize the floor
        initFloor();

        // Explicitly set camera mode before initializing controls
        window.isFirstPerson = true;  

        // Setup controls for player movement
        setupPointerLockControls();
        
        // Player will be created after clicking "Click to play"
        
        // Add resize event listener (keep this as direct listener since it's not an input)
        window.addEventListener('resize', onWindowResize, false);
        
        // Handle page visibility changes to reset input state when tab is not active
        // (keep this as direct listener since it's not an input)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Reset input state when tab loses focus
                window.moveForward = false;
                window.moveBackward = false;
                window.moveLeft = false;
                window.moveRight = false;
                window.turnLeft = false;
                window.turnRight = false;
                window.inputState.keys = { 
                    w: false, a: false, s: false, d: false, 
                    space: false, q: false, e: false, shift: false 
                };
                // Force an immediate input update
                if (window.sendInputUpdate) {
                    window.sendInputUpdate();
                }
            }
        });
        
        // Make sure global variables are properly declared
        window.scene = scene;
        window.camera = camera;
        window.renderer = renderer;
        window.controls = controls;
        
        // Expose sendInputUpdate to window for access from other modules
        window.sendInputUpdate = sendInputUpdate;
        
        // Create the gameEngine object and assign core components
        const gameEngine = {
            scene: scene,
            camera: camera,
            renderer: renderer,
            controls: controls,
            // Add other necessary managers if they exist globally or are created here
            // Example: Assuming InputManager and UIManager are set up elsewhere on window
            inputManager: window.inputManager, 
            uiManager: window.uiManager,
            networkInterface: window.networkInterface // Assuming networkInterface is set up
        };

        // Assign the created object to the global window scope
        window.gameEngine = gameEngine;
        console.log("Assigned gameEngine object to window:", window.gameEngine);

        // Start the animation loop
        requestAnimationFrame(animate);
        
        debug('Game successfully initialized');

        // Signal that the game engine is fully initialized and ready
        // Use setTimeout to ensure assignment completes before event fires
        setTimeout(() => {
            console.log("GameEngine fully initialized. Firing ready event (after timeout).");
            window.dispatchEvent(new CustomEvent('gameEngineReady'));
        }, 0);
    } catch (error) {
        debug(`Full initialization error: ${error.message}`, true);
        console.error('Full initialization error:', error);
    }
}

// Initialize the scene
function initScene() {
    try {
        debug('Creating scene');
        
        // Create the scene
        scene = new THREE.Scene();
        
        // Make scene globally available
        window.scene = scene;
        
        // Set background color
        scene.background = new THREE.Color(0x87CEEB); // Sky blue
        
        // Add fog for depth perception - COMMENTED OUT client-side terrain setting
        // scene.fog = new THREE.Fog(0x87CEEB, 10, 100);
        
        // Add proper lighting with reduced intensity
        // Ambient light - provides overall illumination to the scene
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Reduced from 0.8
        scene.add(ambientLight);
        
        // Directional light - mimics sunlight
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6); // Reduced from 1.0
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);
        
        // Hemisphere light - for natural outdoor lighting (sky/ground gradient)
        const hemisphereLight = new THREE.HemisphereLight(0xddeeff, 0x3e2200, 0.4); // Reduced from 0.7
        scene.add(hemisphereLight);
        
        // Initialize operator manager and make it globally available
        operatorManager = new OperatorManager(scene);
        window.operatorManager = operatorManager;
        
        // --- NPC Management Integration ---
        NPC.setScene(scene); // Provide the scene reference to the NPC class
        window.createNpcVisual = NPC.createNpcVisual; // Expose static method globally
        window.removeNpcVisual = NPC.removeNpcVisual; // Expose static method globally
        // ---------------------------------

        debug('Scene created successfully');
    } catch (error) {
        debug(`Error creating scene: ${error.message}`, true);
    }

    // <<< Initialize DefaultEnvironmentManager AFTER scene is created >>>
    if (window.defaultEnvironmentManager && typeof window.defaultEnvironmentManager.initialize === 'function') {
        console.log('[game-engine] Scene created, calling defaultEnvironmentManager.initialize...');
        window.defaultEnvironmentManager.initialize(scene);
    } else {
        console.warn('[game-engine] defaultEnvironmentManager not found or initialize method missing.');
    }
    // <<< END >>>

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
}

// Setup PointerLock controls
function setupPointerLockControls() {
    debug('Setting up PointerLock controls');
    
    try {
        controls = window.initControls(camera, renderer.domElement);
        
        let instructions = document.getElementById('lock-instructions');
        
        if (!instructions) {
            console.warn('Lock instructions element not found, creating one');
            instructions = document.createElement('div');
            instructions.id = 'lock-instructions';
            instructions.style.position = 'absolute';
            instructions.style.width = '100%';
            instructions.style.height = '100%';
            instructions.style.top = '0';
            instructions.style.left = '0';
            instructions.style.display = 'flex';
            instructions.style.flexDirection = 'column';
            instructions.style.justifyContent = 'center';
            instructions.style.alignItems = 'center';
            instructions.style.color = '#ffffff';
            instructions.style.textAlign = 'center';
            instructions.style.backgroundColor = 'rgba(0,0,0,0.5)';
            instructions.style.cursor = 'pointer';
            instructions.style.zIndex = '1000';
            instructions.innerHTML = '<p>Click to play</p>';
            document.body.appendChild(instructions);
        }

        // Add an id to the instructions element for InputManager
        instructions.id = 'lock-instructions';

        // Add click event to the entire document
        if (window.inputManager) {
            // Register the lock-instructions element for click handling
            window.inputManager.registerUIElement('lock-instructions', 'click', () => {
                // Don't lock pointer if in RTS mode
                if (window.isRTSMode) {
                    return;
                }
                controls.lock();
            });
            
            console.log("Registered click handler for pointer lock with InputManager");
        } else {
            // Fallback to direct event listener if InputManager not available
            console.warn("Using direct event listener for pointer lock - InputManager not available");
            // Note: We still need to create this listener, but when InputManager becomes available,
            // we'll prefer using that instead
        }

        // Handle pointer lock change explicitly
        function onPointerLockChange() {
            const isLocked = document.pointerLockElement === renderer.domElement || 
                           document.mozPointerLockElement === renderer.domElement ||
                           document.webkitPointerLockElement === renderer.domElement;

            // Ensure instructions element exists
            const instructions = document.getElementById('lock-instructions');
            if (!instructions) {
                console.error("#lock-instructions element not found in onPointerLockChange");
                return; 
            }
            
            // Get active input type for logic below
            const activeInputType = window.inputManager ? window.inputManager.getActiveInputType() : 'keyboardMouse';

            if (isLocked) {
                debug('Pointer is locked - Hiding instructions');
                console.log('[GameEngine] Pointer is locked - Hiding instructions overlay.'); 
                instructions.style.display = 'none'; // Always hide when locked
                document.body.style.cursor = 'none'; // Hide system cursor when locked
                
                // ** Call startGameLogic here instead of direct initialization **
                startGameLogic(); 
                
            } else { // Pointer is unlocked
                document.body.style.cursor = 'default'; // Always show system cursor when unlocked
                
                // Log current state to debug overlay visibility issues
                // console.log('[GameEngine] Pointer unlock state:', {
                //     activeInputType,
                //     isRTSMode: window.isRTSMode,
                //     isBuildingMode: window.isBuildingMode,
                //     shouldShowLockOverlay: window.shouldShowLockOverlay
                // });
                
                // Only show instructions overlay if:
                // 1. Using keyboard/mouse AND
                // 2. Not in RTS or Building mode AND
                // 3. Either shouldShowLockOverlay is true (set by ESC) OR we're not in special view modes AND
                // 4. Not currently in a view transition
                if (activeInputType === 'keyboardMouse') {
                    if (window.shouldShowLockOverlay) {
                        // ESC was pressed - show overlay regardless of mode
                        console.log('[GameEngine] Showing instructions due to ESC key (shouldShowLockOverlay=true)');
                        instructions.style.display = 'flex';
                        // Reset the flag after use
                        window.shouldShowLockOverlay = false;
                    } 
                    else if (!window.isRTSMode && !window.isBuildingMode && !window.inViewTransition) {
                        // Standard case - not in a special mode, not in transition, show overlay
                        console.log('[GameEngine] Showing instructions - normal unlock, not in special mode');
                        instructions.style.display = 'flex';
                    }
                    else {
                        // In a special mode or during transition, don't show overlay
                        if (window.inViewTransition) {
                            console.log('[GameEngine] Not showing instructions - in view transition');
                        } else {
                            console.log('[GameEngine] Not showing instructions - in special mode');
                        }
                        instructions.style.display = 'none';
                    }
                    
                    // Add a one-time click listener to the canvas to re-acquire lock
                    // Ensure listener isn't added multiple times if already present
                    renderer.domElement.removeEventListener('click', attemptLockOnClick);
                    renderer.domElement.addEventListener('click', attemptLockOnClick, { once: true });
                } else { // Gamepad is active
                    console.log('[GameEngine] Pointer unlocked & Gamepad active - Hiding instructions.');
                    instructions.style.display = 'none'; // Keep instructions hidden if gamepad is active
                }
            }
        }

        // Handle pointer lock change through InputManager
        if (window.inputManager) {
            const pointerLockEvents = ['pointerlockchange', 'mozpointerlockchange', 'webkitpointerlockchange'];
            
            // Create a function that InputManager can register
            window.handlePointerLockChange = onPointerLockChange;
            
            // We don't actually register these with InputManager because:
            // 1. These document events don't fit the event categories in InputManager
            // 2. These are system/browser events not user inputs
            // Just keep them as direct event listeners
            document.addEventListener('pointerlockchange', onPointerLockChange, false);
            document.addEventListener('mozpointerlockchange', onPointerLockChange, false);
            document.addEventListener('webkitpointerlockchange', onPointerLockChange, false);
            
            console.log("Pointer lock event handlers configured");
        } else {
            console.error("InputManager not available for pointer lock handlers");
            
            // Fallback to direct event listeners
            document.addEventListener('pointerlockchange', onPointerLockChange, false);
            document.addEventListener('mozpointerlockchange', onPointerLockChange, false);
            document.addEventListener('webkitpointerlockchange', onPointerLockChange, false);
        }

        scene.add(controls.getObject());
        window.isFirstPerson = true;

        debug('PointerLock controls setup complete');
    } catch (error) {
        debug(`Error setting up PointerLock controls: ${error.message}`, true);
    }
}

// Update player movement physics with more responsive server sync
function updatePlayerPhysics(delta) {
    if (!controls || !scene || !controls.isLocked) return;
    
    const controlsObject = controls.getObject();
    
    // Get current player state from server if available
    if (window.room && window.room.state && window.room.state.players) {
        const player = window.room.state.players.get(window.room.sessionId);
        if (player) {
            // Update the player's position based on the server position
            // Higher lerpFactor means more responsive but potentially less smooth
            const lerpFactor = 0.3; // Increased for more responsive movement
            
            // Smoothly interpolate to the server position
            controlsObject.position.x = THREE.MathUtils.lerp(
                controlsObject.position.x, 
                player.x, 
                lerpFactor
            );
            
            controlsObject.position.z = THREE.MathUtils.lerp(
                controlsObject.position.z, 
                player.z, 
                lerpFactor
            );
            
            // Use server Y position for jumping/falling
            controlsObject.position.y = THREE.MathUtils.lerp(
                controlsObject.position.y, 
                player.y, 
                lerpFactor * 2  // Faster vertical correction
            );
            
            // If there's a significant desync, instantly correct position
            const distanceSquared = 
                Math.pow(controlsObject.position.x - player.x, 2) + 
                Math.pow(controlsObject.position.z - player.z, 2);
                
            if (distanceSquared > 5) { // Lowered threshold for quicker corrections
                controlsObject.position.x = player.x;
                controlsObject.position.z = player.z;
                controlsObject.position.y = player.y;
            }
            
            // Update the player's velocity
            window.velocity.y = player.velocityY;
            
            // Update player entity position and scale to match player value
            if (typeof updatePlayerEntity === 'function') {
                updatePlayerEntity(player.value);
            }
            
            // Update player info in UI if available
            if (window.playerUI && typeof window.playerUI.updatePlayerListUI === 'function') {
                window.playerUI.updatePlayerListUI();
            }
            
            // Force camera to update based on view mode for immediate feedback
            if (window.isFirstPerson && !window.isFreeCameraMode) {
                window.updateFirstPersonCamera();
            } else if (!window.isFreeCameraMode) {
                window.updateThirdPersonCamera();
            }
        }
    } else {
        // Use client-side physics for prediction if server data not available
        // Apply gravity
        window.velocity.y -= 9.8 * delta;
        controlsObject.position.y += window.velocity.y * delta;
        
        // Basic ground collision
        if (controlsObject.position.y < 1) {
            window.velocity.y = 0;
            controlsObject.position.y = 1;
            window.canJump = true;
        }
    }
}

// initialize your global visuals safely if not done already
window.visuals = window.visuals || { players: {}, operators: {}, staticEntities: {} };

// Animation loop
function animate(currentTime) {
    requestAnimationFrame(animate);
    
    if (!window.prevTime) window.prevTime = performance.now();
    if (!currentTime) currentTime = performance.now();
    
    const delta = Math.min((currentTime - window.prevTime) / 1000, 0.1);
    window.prevTime = currentTime;
    
    // --- Process Input First --- 
    if (window.inputManager) {
        window.inputManager.update(delta);
    }
    // --- End Input Processing ---

    // Handle different camera modes
    if (window.isFreeCameraMode) {
        // Update free camera movement
        updateFreeCameraMovement();
    } else if (window.isRTSMode) {
        // Update RTS camera movement - call directly instead of through updateControls
        updateRTSCameraMovement(delta);
    } else if ( (controls && controls.isLocked) || (window.inputManager && window.inputManager.getActiveInputType() === 'gamepad') ) { 
        // Normal controls update for first/third person (Pointer Locked OR Gamepad Active)
        window.updateControls(controls, delta);
        // Only update player physics prediction if locked (server sync handles otherwise)
        if (controls && controls.isLocked) {
             updatePlayerPhysics(delta);
        }
    }
    
    // Update player state from server
    if (window.room && window.room.state && window.room.state.players) {
        const playerState = window.room.state.players.get(window.room.sessionId);
        if (playerState) {
            // Update player mesh
            if (window.playerEntity && window.playerEntity.mesh) {
                window.playerEntity.mesh.position.set(playerState.x, playerState.y, playerState.z);
                window.playerEntity.mesh.rotation.y = playerState.rotationY;
                window.playerEntity.mesh.visible = window.isFreeCameraMode || window.isRTSMode || !window.isFirstPerson;
            }
            
            // Only update camera for first/third person modes
            if (!window.isFreeCameraMode && !window.isRTSMode) {
                if (window.isFirstPerson) {
                    window.updateFirstPersonCamera();
                } else {
                    window.updateThirdPersonCamera();
                }
            }
        }
    }
    
    // Execute all registered animation callbacks
    if (window.animationCallbacks && window.animationCallbacks.length > 0) {
        // Add debug logging every few seconds
        if (!window._lastCallbacksLog || currentTime - window._lastCallbacksLog > 5000) {
            window._lastCallbacksLog = currentTime;
            console.log(`Animation callbacks: ${window.animationCallbacks.length} registered`, 
                window.animationCallbacks.map(cb => cb.name || 'anonymous'));
        }
        
        for (let i = 0; i < window.animationCallbacks.length; i++) {
            try {
                const callback = window.animationCallbacks[i];
                // Skip inputManager.update as it's called explicitly earlier
                if (callback === window.inputManager?.update) {
                    continue; 
                }
                // Execute other callbacks
                callback(delta);
            } catch (error) {
                console.error("Error in animation callback:", error);
            }
        }
    }
    
    // Explicitly call updateRemotePlayers to ensure other players are always rendered
    if (typeof window.updateRemotePlayers === 'function') {
        window.updateRemotePlayers(delta); // Pass delta time
    }
    
    // <<< ADDED: Update local player animations & mixer >>>
    if (window.playerEntity && typeof window.playerEntity.update === 'function') {
        window.playerEntity.update(delta); // Update mixer
    }
    if (window.playerEntity && typeof window.playerEntity.updateAnimationBasedOnState === 'function') {
        window.playerEntity.updateAnimationBasedOnState(); // Update animation based on input
    }
    // <<< END ADDED >>>
    
    // ---> ADDED: Update Building Mode Manager <--- 
    if (window.buildingModeManager && typeof window.buildingModeManager.update === 'function') {
        window.buildingModeManager.update(delta);
    }
    
    // --- Update NPCs ---
    if (window.NPC && window.NPC.npcs) {
        window.NPC.npcs.forEach(npc => {
            if (npc && typeof npc.update === 'function') {
                npc.update(delta); // Call the instance update method (for animations)
            }
        });
    }
    // -------------------

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function sendInputUpdate() {
    // Don't send updates if we're in free camera mode or RTS mode or if player isn't loaded yet
    if (window.isFreeCameraMode || window.isRTSMode || !window.playerLoaded) {
        return;
    }
    
    if (window.room) {
        const now = performance.now();
        if ((now - window.lastInputTime) > window.inputThrottleMs) {
            window.lastInputTime = now;
            
            // Make sure all key states are properly set before sending
            const keyStates = {
                w: window.moveForward,
                a: window.moveLeft, 
                s: window.moveBackward,
                d: window.moveRight,
                space: window.inputState.keys.space || false,
                q: window.turnLeft || window.inputState.keys.q || false,
                e: window.turnRight || window.inputState.keys.e || false,
                shift: window.shiftPressed || false
            };
            
            // Update the global input state to ensure everything is in sync
            window.inputState.keys = keyStates;
            
            // Get player rotation from mesh if available (most accurate source)
            let rotationY = 0;
            let pitch = 0;
            
            // IMPORTANT: Use the most accurate source of rotation data
            // For local players, direct mesh rotation is most reliable
            if (typeof window.playerRotationY !== 'undefined' && !isNaN(window.playerRotationY)) {
                // Use global value as established by mouse/keyboard controls
                rotationY = window.playerRotationY;
                pitch = typeof window.firstPersonCameraPitch !== 'undefined' && !isNaN(window.firstPersonCameraPitch) 
                      ? window.firstPersonCameraPitch : 0;
            } 
            // If we have a playerEntity, use its rotation
            else if (window.playerEntity && window.playerEntity.mesh && 
                    typeof window.playerEntity.mesh.rotation.y !== 'undefined' && 
                    !isNaN(window.playerEntity.mesh.rotation.y)) {
                rotationY = window.playerEntity.mesh.rotation.y;
            }
            
            // Send the updated input state to server
            window.room.send("updateInput", {
                keys: keyStates,
                mouseDelta: {
                    x: window.isFirstPerson ? window.inputState.mouseDelta.x : 0,
                    y: window.isFirstPerson ? window.inputState.mouseDelta.y : 0
                },
                viewMode: window.isFirstPerson ? "first-person" : "third-person",
                thirdPersonCameraAngle: window.thirdPersonCameraOrbitX,
                // Send direct rotation values for immediate application on server
                clientRotation: {
                    rotationY: rotationY,
                    pitch: pitch
                }
            });
            
            // Debug logging for rotation
            if (keyStates.q || keyStates.e || window.inputState.mouseDelta.x !== 0) {
                console.log("Rotation sent to server:", rotationY, 
                    "Mesh rotation:", window.playerEntity?.mesh?.rotation.y,
                    "playerRotationY:", window.playerRotationY);
            }
            
            // Reset mouse delta after sending
            window.inputState.mouseDelta.x = 0;
            window.inputState.mouseDelta.y = 0;
        }
    }
}

setInterval(sendInputUpdate, 1000 / 30);

window.thirdPersonCameraDistance = 8; // Increased from 5
window.thirdPersonCameraOrbitX = 0;
window.thirdPersonCameraOrbitY = 0.5; // Default vertical angle (radians)

// Update third-person camera position based on orbit angles
function updateThirdPersonCameraPosition() {
    if (!window.room || !window.room.state || !window.room.state.players) return;
    
    const playerState = window.room.state.players.get(window.room.sessionId);
    if (!playerState) return;
    
    // Get camera reference
    const camera = window.camera;
    
    // Calculate theta (horizontal orbit angle) and phi (vertical orbit angle)
    const theta = window.thirdPersonCameraOrbitX;
    const phi = window.thirdPersonCameraOrbitY;
    
    // Calculate camera position based on spherical coordinates
    const distance = window.thirdPersonCameraDistance;
    const offsetX = distance * Math.sin(theta) * Math.cos(phi);
    const offsetY = distance * Math.sin(phi);
    const offsetZ = distance * Math.cos(theta) * Math.cos(phi);
    
    // Calculate camera position relative to player
    const cameraPosition = new THREE.Vector3(
        playerState.x + offsetX,
        playerState.y + window.playerHeight / 2 + offsetY,
        playerState.z + offsetZ
    );
    
    // Set camera position
    camera.position.copy(cameraPosition);
    
    // Use our helper function to fix orientation
    setThirdPersonCameraOrientation(
        camera,
        cameraPosition,
        new THREE.Vector3(playerState.x, playerState.y, playerState.z)
    );
}

// Make updateFirstPersonCamera globally accessible
window.updateFirstPersonCamera = function() {
    if (!window.room || !window.room.state || !window.room.state.players) return;
    
    const playerState = window.room.state.players.get(window.room.sessionId);
    if (!playerState) return;
    
    // Update camera position to be exactly at player position with head height
    if (window.camera && controls) {
        // Position camera exactly at player position with head height
        window.camera.position.set(
            playerState.x,
            playerState.y + (window.playerHeight || 2.0),
            playerState.z
        );
        
        // Apply proper rotation using player's server-side rotation values
        // and any local camera pitch changes for immediate feedback
        const pitch = typeof window.firstPersonCameraPitch !== 'undefined'
            ? window.firstPersonCameraPitch
            : (playerState.pitch || 0);
            
        const rotationY = typeof window.playerRotationY !== 'undefined'
            ? window.playerRotationY
            : (playerState.rotationY || 0);

        // Log the rotation values being used
     //   console.log(`[Update FP Cam] Using Pitch: ${pitch.toFixed(3)}, Yaw: ${rotationY.toFixed(3)} (From playerRotY: ${typeof window.playerRotationY !== 'undefined'}, playerStateRotY: ${playerState.rotationY?.toFixed(3)})`);
            
        // We no longer need to add Math.PI to rotation because the model is rotated already
        window.camera.quaternion.setFromEuler(new THREE.Euler(
            pitch,
            rotationY,
            0,
            'YXZ' // Important for proper FPS rotation order
        ));
        
        // Update controls position if available
        if (controls.getObject) {
            controls.getObject().position.copy(window.camera.position);
        }
        
        // Make sure the player mesh is invisible in first-person, but update its position
        if (window.playerEntity && window.playerEntity.mesh) {
            window.playerEntity.mesh.visible = false;
            
            // IMPORTANT: Update position from server state to match movement
            // This avoids rotation affecting position
            window.playerEntity.mesh.position.set(playerState.x, playerState.y, playerState.z);
            
            // Keep rotation updated for seamless transition to third-person
            window.playerEntity.rotationY = rotationY;
            window.playerEntity.mesh.rotation.y = rotationY;
        }
    }
};

// Handle view-specific camera updates
function updateThirdPersonCamera() {
    // Get player state
    const playerState = window.room.state.players.get(window.room.sessionId);
    if (!playerState) return;
    
    // Third-person: Position camera behind player with smooth follow
    
    // First, update the camera orbit angle to match the player's rotation
    // This makes the camera follow behind the player when they rotate with Q and E
    window.thirdPersonCameraOrbitX = playerState.rotationY;
    
    // Calculate ideal camera position based on orbit angles
    const theta = window.thirdPersonCameraOrbitX;
    const phi = window.thirdPersonCameraOrbitY;
    
    // Calculate camera position based on spherical coordinates
    const distance = window.thirdPersonCameraDistance;
    const offsetX = distance * Math.sin(theta) * Math.cos(phi);
    const offsetY = distance * Math.sin(phi);
    const offsetZ = distance * Math.cos(theta) * Math.cos(phi);
    
    // Target position (slightly above player's head)
    const lookAtPosition = new THREE.Vector3(
        playerState.x, 
        playerState.y + window.thirdPersonCameraHeight * 0.8, // Look at upper body
        playerState.z
    );
    
    // Set camera position
    const targetCameraPos = new THREE.Vector3(
        playerState.x + offsetX,
        playerState.y + offsetY + window.playerHeight * 0.5,
        playerState.z + offsetZ
    );
    
    // Smooth camera movement
    camera.position.lerp(targetCameraPos, 0.2);
    
    // Fix camera orientation
    setThirdPersonCameraOrientation(camera, lookAtPosition, playerState);
    
    // Show player mesh in third-person and ensure position is updated from server
    if (window.playerEntity && window.playerEntity.mesh) {
        window.playerEntity.mesh.visible = true;
        
        // CRUCIAL: Update position from server state WITHOUT changing rotation
        // This avoids having rotation affect position
        const currentRotation = window.playerEntity.mesh.rotation.y;
        
        // Update position from server state
        window.playerEntity.mesh.position.set(playerState.x, playerState.y, playerState.z);
        
        // Restore rotation or apply server rotation as needed
        // If local player, we want to keep our current rotation
        // For remote players, DefaultPlayer.update() will handle rotation interpolation
    }
}

// Mouse down event handler
function onMouseDown(event) {
    // For RTS mode, handle without pointer lock
    if (window.isRTSMode) {
        // Left button: start selection box or select unit
        if (event.button === 0) {
            // Start selection box
            window.rtsSelectionBoxActive = true;
            window.rtsSelectionStartX = event.clientX;
            window.rtsSelectionStartY = event.clientY;
            window.rtsSelectionEndX = event.clientX;
            window.rtsSelectionEndY = event.clientY;
            
            // Show selection box
            updateSelectionBox();
        }
        // Right button: move selected unit(s)
        else if (event.button === 2) {
            moveSelectedUnits();
        }
        return;
    }
    
    // Original behavior for other modes (which require pointer lock)
    if (!document.pointerLockElement) return;
    
    // Left button: 0, Middle: 1, Right: 2
    if (event.button === 2) {
        window.rightMouseDown = true;
    } else if (event.button === 1) {
        window.middleMouseDown = true;
    }
}

// Mouse up event handler
function onMouseUp(event) {
    // For RTS mode, handle specially
    if (window.isRTSMode) {
        // Left button: complete selection box
        if (event.button === 0 && window.rtsSelectionBoxActive) {
            window.rtsSelectionBoxActive = false;
            
            // Hide selection box
            const selectionBox = document.getElementById('rts-selection-box');
            if (selectionBox) {
                selectionBox.style.display = 'none';
            }
            
            // Get final selection area
            window.rtsSelectionEndX = event.clientX;
            window.rtsSelectionEndY = event.clientY;
            
            // If selection area is very small, treat as a single click
            const selectionWidth = Math.abs(window.rtsSelectionEndX - window.rtsSelectionStartX);
            const selectionHeight = Math.abs(window.rtsSelectionEndY - window.rtsSelectionStartY);
            
            if (selectionWidth < 5 && selectionHeight < 5) {
                // Single click - select individual unit
                selectUnitInRTSMode();
            } else {
                // Box selection - select all units in box
                selectUnitsInBoxRTSMode();
            }
        }
        
        // Just ensure cursor is still visible
        if (document.getElementById('rts-cursor')) {
            document.getElementById('rts-cursor').style.display = 'block';
            
            // Update cursor position for consistency
            updateRTSCursorPosition(event);
        }
        return;
    }
    
    // Standard handling for other modes
    if (event.button === 2) {
        window.rightMouseDown = false;
    } else if (event.button === 1) {
        window.middleMouseDown = false;
    }
}

// Mouse move event handler for RTS mode selection box
function onMouseMove(event) {
    // In RTS mode, handle selection box if active
    if (window.isRTSMode) {
        if (window.rtsSelectionBoxActive) {
            window.rtsSelectionEndX = event.clientX;
            window.rtsSelectionEndY = event.clientY;
            updateSelectionBox();
        }
        
        // Ensure pointer lock is off and just update our custom cursor
        if (controls && controls.isLocked) {
            controls.unlock();
        }
        
        // Update our custom cursor position
        if (document.getElementById('rts-cursor')) {
            updateRTSCursorPosition(event);
        }
        return;
    }
    
    if (!window.controls || !window.controls.isLocked) return;
    
    // Store mouse movement for input state
    window.inputState.mouseDelta.x += event.movementX;
    window.inputState.mouseDelta.y += event.movementY;
    
    if (window.isFreeCameraMode) {
        // Initialize Euler angles if they don't exist
        if (!window.freeCameraEuler) {
            window.freeCameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');
        }
        
        // Update rotation with mouse movement
        const rotationSpeed = 0.002;
        
        // Update yaw (left/right) and pitch (up/down)
        window.freeCameraEuler.y -= event.movementX * rotationSpeed;
        window.freeCameraEuler.x = Math.max(
            -Math.PI/2,
            Math.min(Math.PI/2,
                window.freeCameraEuler.x - event.movementY * rotationSpeed
            )
        );
        
        // Keep roll (z-axis) at 0 to prevent tilting
        window.freeCameraEuler.z = 0;
        
        // Apply rotation to camera, maintaining upright orientation
        camera.quaternion.setFromEuler(window.freeCameraEuler);
    }
    
    // In RTS mode, camera rotation with mouse is disabled
    // as the camera always looks straight down
}

// Perform unit selection in RTS mode using raycasting
function selectUnitInRTSMode(clickX = null, clickY = null) {
    if (!window.isRTSMode) return;
    // Ensure arrays exist
    window.rtsSelectedUnits = window.rtsSelectedUnits || [];
    window.rtsSelectionBoxes = window.rtsSelectionBoxes || [];

    // Ensure pointer is unlocked in RTS mode
    if (controls && controls.isLocked) {
        controls.unlock();
    }

    // Determine screen coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    let cursorX, cursorY;
    if (clickX !== null && clickY !== null) {
        cursorX = clickX;
        cursorY = clickY;
    } else {
        const cursor = document.getElementById('rts-cursor');
        if (!cursor) return;
        cursorX = parseInt(cursor.style.left);
        cursorY = parseInt(cursor.style.top);
    }

    // Build a ray from camera through cursor
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
        ((cursorX - rect.left) / rect.width) * 2 - 1,
        -((cursorY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(mouse, window.camera);

    // Rebuild selectable mesh cache to ensure newly loaded meshes are accounted for
    rebuildSelectableMeshCache();
    
    // <<< Filter selectable meshes to ONLY include colliders >>>
    const colliderMeshes = window._rtsSelectableMeshes.filter(mesh => mesh.userData && mesh.userData.isCollider === true);
    console.log(`[RTS Select Raycast] Targeting ${colliderMeshes.length} collider meshes for intersection.`);
    // <<<
    
    // Raycast only against selectable entity meshes for precision
    // <<< Use the filtered list >>>
    const intersects = raycaster.intersectObjects(colliderMeshes, true); 

    // <<< Log Intersections >>>
    if (intersects.length > 0) {
        console.log(`[RTS Select Raycast] Hit ${intersects.length} objects. First hit:`, intersects[0].object, `Distance: ${intersects[0].distance}, userData:`, intersects[0].object.userData);
    } else {
        console.log("[RTS Select Raycast] No intersections with selectable meshes.");
    }
    // <<<

    const isShiftPressed = window.inputManager ? window.inputManager.isKeyPressed('shift') : false;
    if (!isShiftPressed) clearAllSelections();

    if (intersects.length === 0) {
        console.log('[RTS Select] Nothing selectable under cursor (after intersect check)');
        return;
    }

    // <<< Log before calling getEntityFromIntersect >>>
    console.log(`[RTS Select] Calling getEntityFromIntersect with object:`, intersects[0].object);
    // <<<
    const entity = getEntityFromIntersect(intersects[0].object);
    
    // <<< Log result of getEntityFromIntersect >>>
    console.log(`[RTS Select] getEntityFromIntersect returned:`, entity);
    // <<<
    
    if (!entity) {
        console.log('[RTS Select] Intersected hierarchy without entity link (after getEntityFromIntersect)');
        return;
    }

    // Toggle selection if Shift pressed and already selected
    const alreadySelected = window.rtsSelectedUnits.includes(entity);
    if (alreadySelected && isShiftPressed) {
        // Deselect
        removeSelectionBoxForUnit(entity);
        window.rtsSelectedUnits = window.rtsSelectedUnits.filter(e => e !== entity);
        console.log('[RTS Select] Deselected entity', entity.name || entity.id);
        refreshRTSSelectionPanel();
        return;
    }

    if (!alreadySelected) {
        window.rtsSelectedUnits.push(entity);
        highlightSelectedUnit(entity);
        console.log('[RTS Select] Selected entity', entity.name || entity.id);
    }
    // After processing selection, refresh UI panel
    refreshRTSSelectionPanel();
}

// Utility: find primary mesh inside an object (first Mesh child or self)
function getPrimaryMesh(obj) {
    if (!obj) return null;
    if (obj.isMesh && !obj.userData.isCollider) return obj;
    let found = null;
    obj.traverse(child => {
        if (!found && child.isMesh && !child.userData.isCollider) {
            found = child;
        }
    });
    return found;
}

// Refresh the left-side selection panel using playerUI
function refreshRTSSelectionPanel() {
    if (!window.playerUI || !window.playerUI.updateSelectionPanel) return;
    const entitiesPayload = (window.rtsSelectedUnits || []).map(u => ({
        id: u.id,
        name: u.name || u.id,
        health: u.health,
        maxHealth: u.maxHealth
    }));
    window.playerUI.updateSelectionPanel({ entities: entitiesPayload });
}

// Create / update selection box for an entity (green outline)
function createSelectionBoxForUnit(unit) {
    if (!unit || !unit.mesh || unit._selectionBox) return;

    const targetMesh = getPrimaryMesh(unit.mesh);
    if (!targetMesh) return;

    // Ensure geometry bounding box is computed for tight fit
    if (targetMesh.geometry && !targetMesh.geometry.boundingBox) {
        targetMesh.geometry.computeBoundingBox();
    }

    // Compute tight bounding box (geometry-based, fallback to world)
    let size = new THREE.Vector3();
    let center = new THREE.Vector3();
    if (targetMesh.geometry && targetMesh.geometry.boundingBox) {
        const gBox = targetMesh.geometry.boundingBox;
        gBox.getSize(size);
        gBox.getCenter(center);
        size.multiply(targetMesh.scale);
        center.multiply(targetMesh.scale);
        targetMesh.updateWorldMatrix(true, false);
        center.applyMatrix4(targetMesh.matrixWorld);
    } else {
        const worldBox = new THREE.Box3().setFromObject(targetMesh);
        worldBox.getSize(size);
        worldBox.getCenter(center);
    }

    // Build green outline
    const geom = new THREE.BoxGeometry(size.x, size.y, size.z);
    const edges = new THREE.EdgesGeometry(geom);
    const mat = new THREE.LineBasicMaterial({ color: 0x00ff00, depthTest: false });
    const outline = new THREE.LineSegments(edges, mat);
    outline.position.copy(center);
    outline.quaternion.copy(targetMesh.getWorldQuaternion(new THREE.Quaternion()));
    outline.renderOrder = 9999;
    mat.depthWrite = false;

    scene.add(outline);

    outline.userData._size = size.clone();
    unit._selectionBox = outline;
    window.rtsSelectionBoxes.push({ helper: outline, entity: unit });
}

// Remove existing selection box for a unit
function removeSelectionBoxForUnit(unit) {
    if (!unit || !unit._selectionBox) return;
    const outline = unit._selectionBox;
    scene.remove(outline);
    if (outline.geometry) outline.geometry.dispose();
    if (outline.material) outline.material.dispose();
    window.rtsSelectionBoxes = (window.rtsSelectionBoxes || []).filter(obj => obj.helper !== outline);
    delete unit._selectionBox;
}

// Update selection outline positions each frame
function animateSelectionBoxes(delta) {
    if (!window.rtsSelectionBoxes || window.rtsSelectionBoxes.length === 0) return;
    window.rtsSelectionBoxes.forEach(item => {
        const { helper, entity } = item;
        if (!helper || !entity || !entity.mesh) return;

        const targetMesh = getPrimaryMesh(entity.mesh);
        if (!targetMesh) return;

        // Recalculate bounding box (geometry-based)
        let size = new THREE.Vector3();
        let center = new THREE.Vector3();
        if (targetMesh.geometry && targetMesh.geometry.boundingBox) {
            const gBBox2 = targetMesh.geometry.boundingBox;
            gBBox2.getSize(size);
            gBBox2.getCenter(center);
            size.multiply(targetMesh.scale);
            center.multiply(targetMesh.scale);
            targetMesh.updateWorldMatrix(true, false);
            center.applyMatrix4(targetMesh.matrixWorld);
        } else {
            const worldBBox2 = new THREE.Box3().setFromObject(targetMesh);
            worldBBox2.getSize(size);
            worldBBox2.getCenter(center);
        }

        helper.position.copy(center);
        helper.quaternion.copy(targetMesh.getWorldQuaternion(new THREE.Quaternion()));

        const currentSize = helper.userData._size || { x: 0, y: 0, z: 0 };
        if (Math.abs(currentSize.x - size.x) > 0.01 || Math.abs(currentSize.y - size.y) > 0.01 || Math.abs(currentSize.z - size.z) > 0.01) {
            if (helper.geometry) helper.geometry.dispose();
            helper.geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x, size.y, size.z));
            helper.userData._size = size.clone();
        }
    });
}

// After selection changes, refresh UI
function highlightSelectedUnit(unit) {
    createSelectionBoxForUnit(unit);
    refreshRTSSelectionPanel();
}

function clearAllSelections() {
    if (window.rtsSelectedUnits && window.rtsSelectedUnits.length > 0) {
        window.rtsSelectedUnits.forEach(u => removeSelectionBoxForUnit(u));
    }
    window.rtsSelectedUnits = [];
    refreshRTSSelectionPanel();
}

// Register once
if (!window._rtsSelectionBoxAnimRegistered && typeof window.registerAnimationCallback === 'function') {
    window.registerAnimationCallback(animateSelectionBoxes);
    window._rtsSelectionBoxAnimRegistered = true;
}

// Move selected units to clicked position in RTS mode
function moveSelectedUnits() {
    if (!window.isRTSMode) return;
    
    // Ensure pointer is unlocked in RTS mode
    if (controls && controls.isLocked) {
        controls.unlock();
    }
    
    // Only proceed if we have selected units
    if (!window.rtsSelectedUnits || window.rtsSelectedUnits.length === 0) {
        console.log("[RTS] No units selected to move");
        return;
    }
    
    // Get the current mouse position
    const cursor = document.getElementById('rts-cursor');
    if (!cursor) return;
    
    // Get cursor position and renderer bounds
    const rect = renderer.domElement.getBoundingClientRect();
    const cursorX = parseInt(cursor.style.left);
    const cursorY = parseInt(cursor.style.top);
    
    // Create a raycaster for the cursor position
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // Calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = ((cursorX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((cursorY - rect.top) / rect.height) * 2 + 1;
    
    // Update the raycaster with the camera and mouse position
    raycaster.setFromCamera(mouse, window.camera);
    
    // Get all objects we can move onto (usually just the floor)
    const floor = scene.children.find(child => 
        child instanceof THREE.Mesh && 
        child.rotation.x === -Math.PI / 2
    );
    
    const moveTargets = [floor];
    
    // Perform the raycast
    const intersects = raycaster.intersectObjects(moveTargets, false);
    
    // If we hit the floor, move the selected units there
    if (intersects.length > 0) {
        const targetPosition = intersects[0].point;
        
        // Create a move command and send it to the server
        if (window.room) {
            // Send move command for each selected unit
            window.rtsSelectedUnits.forEach(unit => {
                window.room.send("moveCommand", {
                    x: targetPosition.x,
                    z: targetPosition.z,
                    unitId: unit.id || unit.mesh.id // Include unit ID if we have multiple units
                });
            });
            
            // Visual feedback - create a temporary marker at the clicked position
            createMoveMarker(targetPosition);
            
            console.log("[RTS] Moving units to:", targetPosition);
        }
    }
    
    // Ensure cursor is up to date after move command
    requestAnimationFrame(() => {
        updateRTSCursorPosition({
            clientX: window.lastMouseX || window.innerWidth / 2,
            clientY: window.lastMouseY || window.innerHeight / 2
        });
    });
}

// Create a visual marker for move commands
function createMoveMarker(position) {
    // Create a simple circular marker
    const markerGeometry = new THREE.CircleGeometry(0.5, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    
    // Position slightly above the ground to prevent z-fighting
    marker.position.set(position.x, 0.01, position.z);
    marker.rotation.x = -Math.PI / 2; // Rotate to be flat on the ground
    
    scene.add(marker);
    
    // Add a slight pulsing animation
    let pulseTime = 0;
    
    function animateMarker(delta) {
        pulseTime += delta;
        
        // Pulse the opacity
        marker.material.opacity = 0.7 * (0.5 + 0.5 * Math.sin(pulseTime * 5));
        
        // Scale down over time
        const scale = Math.max(0.1, 1 - pulseTime);
        marker.scale.set(scale, scale, scale);
        
        // Remove when animation completes
        if (pulseTime > 1) {
            window.unregisterAnimationCallback(animateMarker);
            scene.remove(marker);
            marker.geometry.dispose();
            marker.material.dispose();
        }
    }
    
    // Register the animation
    window.registerAnimationCallback(animateMarker);
}

// Create a custom cursor for RTS mode
function createRTSCursor() {
    // Create a div element for our custom cursor
    const cursor = document.createElement('div');
    cursor.id = 'rts-cursor';
    
    // Set style for the cursor
    cursor.style.position = 'fixed';
    cursor.style.width = '32px';
    cursor.style.height = '32px';
    cursor.style.pointerEvents = 'none'; // Prevent the cursor from intercepting clicks
    cursor.style.zIndex = '9999'; // Ensure cursor is on top of everything
    // SVG with crosshair cursor design - exact center is the intersection point
    cursor.style.backgroundImage = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'><circle cx=\'16\' cy=\'16\' r=\'14\' fill=\'none\' stroke=\'white\' stroke-width=\'2\'/><circle cx=\'16\' cy=\'16\' r=\'2\' fill=\'white\'/><path d=\'M16 8 L16 2\' stroke=\'white\' stroke-width=\'2\'/><path d=\'M16 30 L16 24\' stroke=\'white\' stroke-width=\'2\'/><path d=\'M8 16 L2 16\' stroke=\'white\' stroke-width=\'2\'/><path d=\'M30 16 L24 16\' stroke=\'white\' stroke-width=\'2\'/></svg>")';
    cursor.style.backgroundSize = 'contain';
    cursor.style.display = 'none'; // Initially hidden
    
    // Position the cursor so its center is at the mouse position
    cursor.style.left = '0';
    cursor.style.top = '0';
    cursor.style.transform = 'translate(-50%, -50%)';
    
    // Add cursor element to the document
    document.body.appendChild(cursor);
    
    // Initialize cursor at center of screen
    updateRTSCursorPosition({
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2
    });
    
    // Use InputManager for mouse movement to update custom cursor position
    window.inputManager.on('mousemove', updateRTSCursorPosition);
    
    return cursor;
}

// Update the RTS cursor position
function updateRTSCursorPosition(event) {
    // Normalize event - handle both direct DOM events and InputManager wrapper events
    const clientX = event.clientX !== undefined ? event.clientX : 
                   (event.position ? event.position.x : window.innerWidth / 2);
    const clientY = event.clientY !== undefined ? event.clientY : 
                   (event.position ? event.position.y : window.innerHeight / 2);
    
    // Store last mouse position for reference
    window.lastMouseX = clientX;
    window.lastMouseY = clientY;
    
    const cursor = document.getElementById('rts-cursor');
    if (!cursor) return;
    
    // Only update cursor position if it's visible (RTS mode)
    if (cursor.style.display === 'none') return;
    
    // Update cursor position to follow mouse exactly
    // Position is set so the center of the cursor is at the mouse position
    cursor.style.left = clientX + 'px';
    cursor.style.top = clientY + 'px';
    
    // Make sure transform is applied for centering
    cursor.style.transform = 'translate(-50%, -50%)';
    
    // When in RTS mode, update ray cast for hover effects
    if (window.isRTSMode) {
        // Pass normalized event to hover function
        updateRTSHoverEffects({clientX, clientY});
    }
}

// Update hover effects for RTS mode
function updateRTSHoverEffects(event) {
    // Get normalized coordinates
    const clientX = event.clientX !== undefined ? event.clientX : 
                   (event.position ? event.position.x : window.lastMouseX);
    const clientY = event.clientY !== undefined ? event.clientY : 
                   (event.position ? event.position.y : window.lastMouseY);
    
    // Create a raycaster for mouse position
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const rect = renderer.domElement.getBoundingClientRect();
    
    // Calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    
    // Update the raycaster with the camera and mouse position
    raycaster.setFromCamera(mouse, window.camera);
    
    // Get all selectable objects
    const selectableObjects = [];
    
    // Add the player's mesh
    if (window.playerEntity && window.playerEntity.mesh) {
        selectableObjects.push(window.playerEntity.mesh);
    }
    
    // For future: Add other selectable units, buildings, etc.
    
    // Perform the raycast
    const intersects = raycaster.intersectObjects(selectableObjects, true);
    
    const cursor = document.getElementById('rts-cursor');
    
    // If hovering over a selectable object, change cursor
    if (intersects.length > 0) {
        // Change cursor to selection cursor (green highlight)
        cursor.style.backgroundImage = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'><circle cx=\'16\' cy=\'16\' r=\'14\' fill=\'none\' stroke=\'%2300ff00\' stroke-width=\'2\'/><circle cx=\'16\' cy=\'16\' r=\'2\' fill=\'%2300ff00\'/><path d=\'M16 8 L16 2\' stroke=\'%2300ff00\' stroke-width=\'2\'/><path d=\'M16 30 L16 24\' stroke=\'%2300ff00\' stroke-width=\'2\'/><path d=\'M8 16 L2 16\' stroke=\'%2300ff00\' stroke-width=\'2\'/><path d=\'M30 16 L24 16\' stroke=\'%2300ff00\' stroke-width=\'2\'/></svg>")';
    } else {
        // Reset to default cursor (white)
        cursor.style.backgroundImage = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'><circle cx=\'16\' cy=\'16\' r=\'14\' fill=\'none\' stroke=\'white\' stroke-width=\'2\'/><circle cx=\'16\' cy=\'16\' r=\'2\' fill=\'white\'/><path d=\'M16 8 L16 2\' stroke=\'white\' stroke-width=\'2\'/><path d=\'M16 30 L16 24\' stroke=\'white\' stroke-width=\'2\'/><path d=\'M8 16 L2 16\' stroke=\'white\' stroke-width=\'2\'/><path d=\'M30 16 L24 16\' stroke=\'white\' stroke-width=\'2\'/></svg>")';
    }
}

// Update the display of the selection box
function updateSelectionBox() {
    const selectionBox = document.getElementById('rts-selection-box');
    if (!selectionBox) return;
    
    // Calculate box coordinates
    const left = Math.min(window.rtsSelectionStartX, window.rtsSelectionEndX);
    const top = Math.min(window.rtsSelectionStartY, window.rtsSelectionEndY);
    const width = Math.abs(window.rtsSelectionEndX - window.rtsSelectionStartX);
    const height = Math.abs(window.rtsSelectionEndY - window.rtsSelectionStartY);
    
    // Update box position and size
    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
    
    // Show the box
    selectionBox.style.display = 'block';
}

// Select all units within the selection box
function selectUnitsInBoxRTSMode() {
    // Get the renderer bounds for coordinate conversion
    const rect = renderer.domElement.getBoundingClientRect();
    
    // Convert box coordinates to normalized device coordinates (-1 to 1)
    const left = Math.min(window.rtsSelectionStartX, window.rtsSelectionEndX);
    const right = Math.max(window.rtsSelectionStartX, window.rtsSelectionEndX);
    const top = Math.min(window.rtsSelectionStartY, window.rtsSelectionEndY);
    const bottom = Math.max(window.rtsSelectionStartY, window.rtsSelectionEndY);
    
    // Get an array of all selectable units in the scene
    const selectableUnits = [];
    
    // Add the player's unit
    if (window.playerEntity && window.playerEntity.mesh) {
        selectableUnits.push(window.playerEntity);
    }
    
    // TODO: Add other selectable units (allied units) when they're implemented
    
    // Clear previous selections
    clearAllSelections();
    
    // Check each unit to see if it's in the selection box
    selectableUnits.forEach(unit => {
        if (!unit.mesh) return;
        
        // Project unit position to screen coordinates
        const position = new THREE.Vector3();
        position.copy(unit.mesh.position);
        
        // Convert 3D position to screen position
        position.project(window.camera);
        
        // Convert to pixel coordinates
        const screenX = ((position.x + 1) / 2) * rect.width + rect.left;
        const screenY = ((-position.y + 1) / 2) * rect.height + rect.top;
        
        // Check if the unit is inside the selection box
        if (screenX >= left && screenX <= right && screenY >= top && screenY <= bottom) {
            // Add to selection
            window.rtsSelectedUnits.push(unit);
            
            // Apply visual highlight
            highlightSelectedUnit(unit);
            
            console.log("[RTS] Added unit to selection:", unit);
        }
    });
    
    console.log("[RTS] Total units selected:", window.rtsSelectedUnits.length);
    refreshRTSSelectionPanel();
}

// Fix the setThirdPersonCameraOrientation function to only control the camera, not player rotation
function setThirdPersonCameraOrientation(camera, lookAtPosition, playerState) {
    // Point camera at player - this only affects the camera, not the player model
    const direction = new THREE.Vector3().subVectors(lookAtPosition, camera.position).normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, -1),
        direction
    );
    
    // Apply rotation to camera immediately for responsive look
    camera.quaternion.copy(quaternion);
}

// Define the function to attempt locking
const attemptLockOnClick = () => {
    console.log('[GameEngine] Lock instructions clicked, attempting to lock pointer...'); 
    
    // Ensure input type is set to keyboard/mouse because the user clicked
    if (window.inputManager) {
        window.inputManager.setActiveInputType('keyboardMouse');
    }
    
    // Check if we should lock (not in RTS mode, not using gamepad)
    if (!window.isRTSMode) {
        if (window.inputManager && window.inputManager.getActiveInputType() === 'keyboardMouse') {
            if (controls && !controls.isLocked) {
                controls.lock();
                const instructions = document.getElementById('lock-instructions');
                if (instructions) {
                    instructions.style.display = 'none'; // Hide instructions after successful lock
                }
            }
        } else {
            console.log('[GameEngine] Lock attempt skipped: Gamepad is active or InputManager not ready.');
        }
    } else {
        console.log('[GameEngine] Lock attempt skipped: Currently in RTS mode.');
    }
    
    // Listener is automatically removed because we use { once: true }
};

// Flag to ensure core game logic runs only once
window.gameLogicStarted = false;

// Function to create the local player entity
function createLocalPlayer() {
    if (window.playerLoaded) {
        console.log("Local player already created.");
        return;
    }
    
    try {
        console.log("Creating local player entity...");
        // Use the globally defined factory function from main.js
        if (typeof window.createPlayerEntity === 'function') {
            window.playerEntity = window.createPlayerEntity(scene, true); // true for local player
            window.player = window.playerEntity; // Maintain compatibility
            window.playerLoaded = true;
            
            // Set initial visibility based on the STARTING view mode
            // Important: window.viewMode should be set before this runs (usually 'firstPerson' by default)
            if (window.playerEntity && window.playerEntity.mesh) {
                 window.playerEntity.mesh.visible = (window.viewMode !== 'firstPerson');
                 console.log(`Set initial player mesh visibility based on viewMode ('${window.viewMode}'): ${window.playerEntity.mesh.visible}`);
            }
            console.log("Local player entity created successfully.", window.playerEntity);
        } else {
            console.error("createPlayerEntity function not found! Cannot create player.");
        }
    } catch (error) {
        console.error("Error creating local player entity:", error);
    }
}

// Function to initialize networking and start core game logic
function startGameLogic() {
    if (window.gameLogicStarted) {
        console.log("Core game logic already started.");
        return;
    }
    window.gameLogicStarted = true;
    console.log("Starting core game logic (Player Creation & Networking)...");

    // 1. Create the Local Player
    createLocalPlayer();

    // 2. Initialize Networking
    if (typeof initNetworking === 'function') {
        console.log("Initializing networking...");
        initNetworking().then((roomInstance) => {
            if (roomInstance) {
                window.gameRoom = roomInstance;
                window.room = roomInstance;
                console.log("Networking initialized successfully, room joined.");
                // Start sending updates only after networking is ready
                // Consider starting interval here or after a confirmation from server
                // setInterval(sendInputUpdate, 1000 / 30); 
            } else {
                 console.error("Networking initialization failed to return a room instance.");
            }
            // Set initial view after networking (may depend on server state)
            if (window.switchToFirstPersonView) {
                window.switchToFirstPersonView(); // Default to first person
            }
        }).catch((error) => {
            debug(`Networking initialization error: ${error.message}`, true);
            console.error("Networking initialization error:", error);
        });
    } else {
        debug('initNetworking function not found. Local play only.', true);
        console.warn('initNetworking function not found. Local play only.');
        // Still need to set the view even for local play
         if (window.switchToFirstPersonView) {
            window.switchToFirstPersonView(); // Default to first person
        }
    }
    
    // 3. Start animation loop if not already running
    if (!window.isAnimating) {
        window.isAnimating = true;
        console.log("Starting animation loop from startGameLogic.");
        animate(performance.now()); // Pass initial timestamp
    }
}

// Cache of meshes that belong to selectable entities (player, NPCs, buildings)
window._rtsSelectableMeshes = window._rtsSelectableMeshes || [];

function rebuildSelectableMeshCache() {
    console.log("[SelectCache] Rebuilding selectable mesh cache..."); // <<< Added Log
    window._rtsSelectableMeshes = [];
    let count = 0; // <<< Added counter
    scene.traverse(obj => {
        // <<< Log candidate object >>>
        // console.log(`[SelectCache Traverse] Checking obj: ${obj.name} (type: ${obj.type}, isMesh: ${obj.isMesh}), userData:`, obj.userData);
        
        if (!obj.isMesh) return;
        if (obj.name === 'ground' || obj.material?.userData?.ignoreRTS) {
            // console.log(`[SelectCache Traverse] Ignoring ground or ignoreRTS mesh: ${obj.name}`); // <<< Added Log
            return; // skip floor or flagged meshes
        }
        if (obj.userData && obj.userData.entity) {
             // <<< Log added object and if it's a collider >>>
             console.log(`[SelectCache] Adding mesh to cache: ${obj.name || '(no name)'} (UUID: ${obj.uuid}), isCollider: ${!!obj.userData.isCollider}, EntityID: ${obj.userData.entity.id}`);
             // <<<
            window._rtsSelectableMeshes.push(obj);
            count++; // <<< Increment counter
        }
    });
    console.log(`[SelectCache] Rebuild complete. Added ${count} meshes.`); // <<< Added Log
}

// Call rebuild once after scene ready
if (!window._rtsSelectableCacheBuilt && typeof scene !== 'undefined') {
    rebuildSelectableMeshCache();
    window._rtsSelectableCacheBuilt = true;
}

// Helper: ascend object hierarchy to find linked entity
function getEntityFromIntersect(intersectObj) {
    // <<< Log entry >>>
    console.log(`[getEntityFromIntersect] Checking object:`, intersectObj);
    // <<<
    let o = intersectObj;
    while (o) {
        // <<< Log current object in loop >>>
        console.log(`[getEntityFromIntersect] Looping... current 'o':`, o, `userData:`, o.userData);
        // <<<
        if (o.userData && o.userData.entity) {
            // <<< Log entity found >>>
            console.log(`[getEntityFromIntersect] Found entity! Returning:`, o.userData.entity);
            // <<<
            return o.userData.entity;
        }
        o = o.parent;
    }
    // <<< Log not found >>>
    console.log(`[getEntityFromIntersect] Reached root without finding entity.`);
    // <<<
    return null;
}

// <<< ADDED >>>
// Function to update the visibility of all selection colliders
window.updateColliderVisibility = function() {
    const visibility = window.showSelectionColliders;
    console.log(`Setting collider visibility to: ${visibility}`);
    window.scene.traverse(obj => {
        // Check specifically for the flag added by addSelectionColliderFromEntity
        if (obj.userData && obj.userData.isCollider === true) { 
            // <<< Log when a collider is found >>>
            console.log(`[UpdateVisibility] Found collider (UUID: ${obj.uuid}, Visible: ${obj.visible}) for entity: ${obj.userData.entity?.id}. Setting visibility to: ${visibility}`);
            // <<<
            obj.visible = visibility;
            // Optional: Log the entity ID for confirmation
            // if (obj.userData.entity) {
            //     console.log(`  - Collider for ${obj.userData.entity.id}: ${visibility}`);
            // }
        }
    });
};
// <<< END ADDED >>>
