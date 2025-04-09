# 3D AI Game Platform - Architecture

## Overview
3D AI Game is a modular 3D web-based game platform built with Three.js and Colyseus, utilizing a client-server architecture for multiplayer functionality. Players control customizable characters and interact with a colorful 3D environment. The platform is designed to support various game implementations.

## Core Components

### 1. Server (server/core/server.js)
**Technology:** Built with Node.js and Colyseus.

**Responsibilities:**
- Manages game rooms and player connections/disconnections
- Maintains the authoritative game state (including position, rotation, and current animation)
- Processes player inputs (e.g., movement keys, mouse look for rotation)
- Broadcasts state updates to all connected clients
- Handles entity spawning and lifecycle management
- Statically loads the 'default' implementation (Note: dynamic loading via env var is not yet implemented).
- Validates and manages structure placement in the building system
- Handles RTS movement commands by setting target positions
- Determines appropriate animation state based on player input/status

**Key Features:**
- Room-based multiplayer with session persistence
- State synchronization using Colyseus schema
- Server-authoritative position and rotation tracking
- Server-determined animation state synchronization
- Dynamic entity spawning system
- Statically loads the 'default' implementation (Note: dynamic loading via env var is not yet implemented).
- Server-validated building placement system

### 2. Client Core Platform (/client/js/core)
The core platform provides foundational functionality that all game implementations can leverage.

**Key components:**
- **main.js:**
  - Entry point for client-side code, loaded with `defer`.
  - Listens for `DOMContentLoaded` to start initialization.
  - Inside `DOMContentLoaded`, instantiates core managers (`window.inputManager`, `window.actionManager`) ensuring classes loaded synchronously from `<head>` are ready.
  - Dispatches a `managersReady` custom event to signal manager availability.
  - Calls `initGame()` to proceed with asynchronous loading of other modules.
  - Uses dynamic `import()` or `loadScript()` (current implementation uses `loadScript`) to load core modules (`game-engine.js`, etc.) and implementation modules.
  - Calls `initGameEngine()` after core/implementation modules are loaded.
  - Within `initGameEngine()`, calls `inputManager.registerUpdateCallback()` after `game-engine.js` is loaded.

- **controls.js:**
  - Manages different camera control schemes (PointerLock, Orbit, FreeCam, RTS panning/zoom).
  - Supports first-person, third person, free roam, and RTS view modes
  - Applies player rotation based on input (likely sourced from `InputManager`/`ActionManager` state).
  - Implements quaternion-based rotation for smooth local camera movement.
  - Run is default movement, Shift activates walking.
  - **Note:** Camera logic and view mode switching reside here, triggered by actions from `ActionManager` or direct events.

- **Refactored Input System:**
  - Implements a modular, extensible input handling architecture through `InputManager` and `ActionManager`.
  - **InputManager.js** (`window.inputManager`):
    - Loaded synchronously in `<head>` to ensure class definition is available early.
    - Instantiated in `main.js` after `DOMContentLoaded`.
    - Exclusively captures all raw keyboard (`keydown`, `keyup`) and mouse (`mousedown`, `mouseup`, `mousemove`, `click`, `wheel`) events from the DOM.
    - Tracks the state of keys and mouse buttons (`this.keys`, `this.mouseButtons`).
    - Provides `serverInputState` object used by `network-core.js`.
    - Provides an event system (`on`, `off`, `dispatchEvent`) for other modules to subscribe to specific input events or custom events (like `managersReady`).
    - Manages UI interactions via `registerUIElement` and `unregisterUIElement`, ensuring UI clicks are handled centrally.
    - Provides helper methods like `isKeyPressed`, `getMousePosition`.
    - Its `update()` method (handling gamepad camera logic) is registered with the main animation loop via `registerUpdateCallback()`, called by `main.js` after `game-engine.js` loads.
  - **ActionManager.js** (`window.actionManager`):
    - Loaded synchronously in `<head>`.
    - Instantiated in `main.js` after `InputManager`.
    - Translates raw inputs received from `InputManager` into semantic game actions (e.g., 'move_forward', 'jump', 'toggle_building') based on registered bindings.
    - Maintains awareness of the current game context (e.g., 'firstPerson', 'building', 'rtsView') to potentially alter action behavior.
    - Provides an event system (`onAction`, `offAction`) for game components to react to actions instead of raw input.
  - **GameIntegration.js**:
    - Waits for the `managersReady` event.
    - Connects existing game systems (like view toggling, building mode toggling) to the new action-based architecture by subscribing to actions via `ActionManager.onAction` within its `setupGameIntegration` function.
  - Benefits:
    - **Centralized Input Capture:** All raw DOM input goes through `InputManager`.
    - **Context-Aware Actions:** Enables different input behaviors in different game modes.
    - **Improved Separation of Concerns:** Input capture, action mapping, and game logic are distinct.
    - **Maintainable Event Handling:** Eliminates scattered `addEventListener` calls for inputs.

- **game-engine.js:**
  - Initializes the Three.js scene, renderer, and camera (`initScene`).
  - Calls `window.defaultEnvironmentManager.initialize(scene)` immediately after scene creation.
  - Sets up player controls and world objects.
  - Defines `window.registerAnimationCallback` used by `InputManager`.
  - Manages the animation loop (`requestAnimationFrame`) calling registered callbacks.
  - Implements four distinct camera systems (FPS, TPS, FreeCam, RTS).
  - Handles smooth camera transitions between view modes.
  - Applies server-authoritative position to player meshes.
  - Provides proper orientation for the camera without affecting model rotation.
  - Calls player animation update logic.
  - Suppresses player movement/animation logic when in Free Camera or RTS modes.
  - Implements procedural terrain generation with canvas-based texture.

- **network-core.js:**
  - Establishes and maintains WebSocket connection (Colyseus).
  - Sends player input state (sourced directly from `InputManager.serverInputState`) to the server.
  - Processes state updates from the server.
  - Creates/updates/removes visual representations of remote players.
  - Applies server-sent animation state (`currentAnimation`) to remote player models (checking `remotePlayer.animationsLoaded` first).
  - Handles player joining/leaving events.
  - Calls `window.buildingModeManager.initializeStructureListeners(room)` after the initial room state is received (`onStateChange.once`).
  - Includes a dummy handler for `structurePlaced` messages to suppress warnings.

- **BuildingModeManager.js** (`window.buildingModeManager`):
  - Instance created globally.
  - Waits for the `managersReady` event before calling its `init()` method.
  - `init()` sets up UI listeners via `InputManager`.
  - Implements a class-based encapsulation of the building mode functionality.
  - Manages the UI elements for building mode.
  - Handles structure placement logic based on `InputManager` mouse events.
  - `initializeStructureListeners(room)` method is called by `network-core.js` to set up Colyseus state listeners (`structures.onAdd`, etc.).

- **Entity.js:** Base class for game entities.
- **Player.js:**
    - Extends Entity.
    - Handles model loading workflow (placeholder -> async GLB -> swap).
    - Includes `animationsLoaded` flag set after animations are processed.
    - Manages animation system (mixer, actions, state mapping).
- **NPC.js:** Extends Entity for non-player characters.
- **EntityFactory.js:** Factory for creating entities.
- **collision.js:** Basic collision detection.
- **player-ui.js** (`window.playerUI`):
    - Instance created globally.
    - Waits for the `managersReady` event before calling its `init()` method.
    - Manages common player UI elements (like player list).

### 3. Game Implementations (/client/js/implementations and /server/implementations)
Each game implementation extends the core platform with specific gameplay mechanics and visuals.

**Implementation Structure:**
- Client-side: `/client/js/implementations/default/`
- Server-side: `/server/implementations/default/`
- Loaded dynamically via `main.js` based on URL param or default.

**Key implementation components:**
- **DefaultPlayer.js:** Extends `Player.js`, specifies model path, rotation, animation name mappings.
- **DefaultEnvironment.js:**
    - Refactored into `DefaultEnvironmentManager` class.
    - Instance created globally (`window.defaultEnvironmentManager`).
    - `initialize(scene)` method called by `game-engine.js` after scene creation.
    - Creates implementation-specific environment objects (hovercar).
- **index.js (Implementation Manifest):** Declares modules for dynamic loading.

### Data Flow

1.  **HTML Load**: Browser loads `index.html`.
2.  **Sync Scripts**: `<head>` scripts for `InputManager.js`, `ActionManager.js` execute, defining classes globally.
3.  **DOM Ready**: `DOMContentLoaded` event fires.
4.  **Managers Init (`main.js`)**: 
    - `DOMContentLoaded` listener runs.
    - Instantiates `window.inputManager`, `window.actionManager`.
    - Dispatches `managersReady` event.
    - Calls `initGame()`.
5.  **Dependent Modules Wait (`player-ui.js`, `BuildingModeManager.js`, `GameIntegration.js` etc.)**: These scripts load (via `defer` or dynamic `loadScript`). Their setup logic waits for the `managersReady` event.
6.  **Core Loading (`initGame` -> `loadCoreModules` etc.)**: `main.js` loads core JS modules asynchronously.
7.  **Managers Ready Listeners**: When `managersReady` fires, listeners in dependent modules run their respective initialization code (e.g., `playerUI.init()`, `buildingModeManager.init()`).
8.  **Engine Init (`initGameEngine`)**: 
    - `main.js` calls `initGameEngine()` after core modules load.
    - `game-engine.js` (loaded by `loadScript`) executes.
    - `initScene()` creates `window.scene`.
    - `game-engine.js` calls `window.defaultEnvironmentManager.initialize(scene)`.
    - `game-engine.js` finishes setup and potentially starts animation loop or waits for network.
9.  **Network Connection (`network-core.js`)**: Connects to Colyseus.
10. **Join Room**: Client joins room.
11. **Initial State**: Server sends initial state. `network-core.js`'s `onStateChange.once` runs:
    - Creates local player.
    - Calls `buildingModeManager.initializeStructureListeners(room)`.
    - Calls `inputManager.registerUpdateCallback()` (if `game-engine.js` already loaded and defined `registerAnimationCallback`).
12. **Game Loop Starts**: Animation loop runs (`game-engine.js`).
13. **Input**: 
    - `InputManager` captures raw input.
    - `ActionManager` translates to actions.
    - Game components react to actions.
    - `network-core.js` sends `InputManager.serverInputState`.
14. **Server Processing**: Server updates state based on input.
15. **State Broadcast**: Server sends delta updates.
16. **Client Update**: `network-core.js` receives updates, updates visuals, `BuildingModeManager`'s state listeners update structures.

## Input Handling and State Synchronization

This section describes how user input (mouse, keyboard, gamepad) is processed and synchronized, particularly focusing on camera control.

**Core Component:** `client/js/core/InputManager.js`

*   **Centralized Management:** `InputManager` is responsible for capturing raw input events (keyboard presses, mouse movements, gamepad polling) and maintaining the canonical input state.
*   **Input Types:** It tracks the `lastActiveInputType` (keyboard/mouse or gamepad) to manage behavior differences.
*   **Keyboard/Buttons:** Key and button presses are mapped to a boolean state object (`this.keys`).
*   **Mouse Camera Control (Pointer Lock):**
    *   When pointer lock is active (`document.pointerLockElement` is true), `InputManager.onMouseMove` directly accumulates `event.movementX/Y` into its internal `this.mouseDelta` and `this.serverInputState.mouseDelta`.
    *   The `controls.js` `mousemove` callback (which *only* runs when pointer lock is active) reads the movement data passed by `InputManager` to apply local camera rotation.
*   **Gamepad Camera Control (Simulated Pointer Lock):**
    *   When the gamepad is active and pointer lock is *not* active, `InputManager.update` reads the right stick position.
    *   If the stick is outside the deadzone, it calculates equivalent `movementX/Y` values.
    *   These values are written to the internal `this.mouseDelta` and `this.serverInputState.mouseDelta`, simulating mouse movement.
*   **State Synchronization (`syncToGlobalState`):**
    *   Called within `InputManager.update`, this method copies the processed input state (key states and the calculated `mouseDelta`) from `InputManager`'s internal state (`this.keys`, `this.mouseDelta`) to the global `window.inputState` object (`window.inputState.keys`, `window.inputState.mouseDelta`).
*   **Delta Reset Logic:**
    *   Crucially, `InputManager.update` resets the internal `this.mouseDelta` and `this.serverInputState.mouseDelta` to zero *at the end* of its execution cycle. This ensures each frame starts with a clean delta, preventing accumulation issues from the previous frame.
    *   (Previously Fixed Issue): An earlier implementation reset delta based on pointer lock state at the *start* of `update`, which led to issues when pointer lock was active or when `sendInputUpdate` ran before `InputManager.update`.

**Consuming Components:**

*   **`client/js/core/game-engine.js` (`sendInputUpdate`):**
    *   Reads the final input state (including `mouseDelta`) from the global `window.inputState`.
    *   Uses this state to prepare and send network updates to the server.
    *   Resets the global `window.inputState.mouseDelta` *after* sending the update.
    *   (Previously Fixed Issue): Ensuring `InputManager.update` (and thus `syncToGlobalState`) runs *before* `sendInputUpdate` in the main animation loop prevents `sendInputUpdate` from reading stale delta values from the previous frame.
*   **`client/js/core/controls.js` (`mousemove` callback):**
    *   When pointer lock is active, this callback receives movement data from `InputManager`.
    *   It uses this data *only* to apply local camera rotation.
    *   (Previously Fixed Issue): Removed redundant code that was also accumulating delta into `window.inputState.mouseDelta` within this callback.

## Project Structure (Simplified View)

```
/
├── client/                 # Client-side code
│   ├── css/
│   ├── js/
│   │   ├── core/           # Core client platform components (InputManager, ActionManager, game-engine, Player, etc.)
│   │   ├── implementations/
│   │   │   └── default/    # Default game implementation (e.g., DefaultPlayer.js, DefaultEnvironmentManager.js)
│   │   │       └── index.js # Implementation manifest declaring modules to load
│   ├── assets/             # Game assets (models, textures, etc.)
│   └── index.html          # Main game HTML
├── server/                 # Server-side code
│   ├── core/               # Core server platform components (BaseRoom, schemas, etc.)
│   └── implementations/
│       └── default/        # Default server implementation (DefaultRoom.js)
├── public/                 # Public assets (currently unused? player_select.html moved?)
├── node_modules/
├── package.json
├── package-lock.json
├── memory bank/
│   └── architecture.md     # This architecture documentation
└── ... (launch scripts etc.)