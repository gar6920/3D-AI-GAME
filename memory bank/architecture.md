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
  - Entry point for client-side code
  - Loads core modules and initializes the game engine
  - Sets up default player factory and statically loads the 'default' implementation.
  - Dynamically loads implementation-specific modules using the implementation manifest

- **controls.js:**
  - Handles player input (keyboard/mouse), manages different camera control schemes (PointerLock, Orbit, FreeCam, RTS panning/zoom).
  - Supports first-person, third person, free roam, and RTS view modes
  - Manages input handling for keyboard and mouse
  - Sends calculated rotation values to the server for player rotation.
  - Implements quaternion-based rotation for smooth local camera movement.
  - Applies direct rotation to player mesh for immediate visual feedback.
  - Distinguishes between rotation controls through mouse movement and keyboard (Q/E keys).
  - Run is default movement, Shift activates walking.

- **game-engine.js:**
  - Initializes the Three.js scene, renderer, and camera
  - Sets up player controls and world objects
  - Manages the animation loop for continuous rendering
  - Implements four distinct camera systems:
    - First-person view: Camera attached to player's head position, local rotation responds immediately to mouse.
    - Third-person view: Camera follows behind player with orbiting controls.
    - Free camera mode: Independent camera with WASD/QE movement and mouse look functionality.
    - RTS view mode: Top-down strategic view with panning, zoom, selection, and move commands.
  - Handles smooth camera transitions between view modes
  - Applies server-authoritative position to player meshes.
  - Provides proper orientation for the camera without affecting model rotation.
  - Calls player animation update logic.
  - Suppresses player movement/animation logic when in Free Camera or RTS modes.
  - Implements procedural terrain generation with canvas-based texture for natural ground appearance:
    - Renders a realistic grass floor without grid lines
    - Uses dynamic texture generation with HTML5 Canvas
    - Creates varied terrain appearance through procedural noise patterns
    - Applies random color variations for a more natural look
    - Optimizes performance with appropriate texture resolution and repetition

- **network-core.js:**
  - Establishes and maintains WebSocket connection to the server via Colyseus
  - Sends player input state (keys, rotation, viewMode) to the server
  - Processes state updates from the server
  - Creates/updates/removes visual representations of remote players based on server state.
  - Applies server-sent animation state (`currentAnimation`) to remote player models.
  - Handles player joining/leaving events
  - Manages Colyseus connection, state synchronization, player join/leave, entity creation/updates based on server state. Handles remote player interpolation.

- **Entity.js:**
  - Base class for all game entities
  - Provides core entity functionality (position, rotation, scale)
  - Defines interface for entity behaviors
  - Handles common entity lifecycle events

- **Player.js:**
  - Extends Entity for player-specific functionality
  - Contains the core animation system and model loading logic
  - Provides generic animation state tracking and state-to-animation name mapping
  - Handles mesh creation, visibility toggling based on camera mode
  - Manages the model loading workflow:
    - Creates placeholder mesh initially
    - Asynchronously loads specified GLB model
    - Sets up animation clips and mixer
    - Handles rotation synchronization for local and remote players
  - Provides an implementation-agnostic animation system with logical movement states:
    - Maps input state to animation states (idle, walk, run, jump, strafeLeft, strafeRight)
    - Includes smooth transition between animations
    - Handles implementation-specific animation name mapping via getAnimationName()
    - Updates animation state based on player input and movement

- **NPC.js:**
  - Extends Entity for non-player characters
  - Implements basic AI behaviors
  - Provides interface for implementation-specific NPC behaviors

- **EntityFactory.js:**
  - Factory pattern for creating entities
  - Registers entity types and their constructors
  - Used by both core platform and game implementations

- **collision.js:**
  - Handles collision detection and resolution
  - Provides interfaces for implementation-specific collision behaviors
  - Basic AABB collision detection system (primarily client-side checks for immediate feedback, server is authoritative).

- **player-ui.js:**
  - Manages common UI elements for player information
  - Provides hooks for implementation-specific UI components

### 3. Game Implementations (/client/js/implementations and /server/implementations)
Each game implementation extends the core platform with specific gameplay mechanics and visuals.

**Implementation Structure:**
- Client-side implementation code in /client/js/implementations/default/ (currently only 'default' exists)
- Server-side implementation code in /server/implementations/default/ (currently only 'default' exists)
- Each implementation includes an index.js manifest that declares modules to be loaded
- Implementation modules are loaded dynamically at runtime by the core platform

**Key implementation components:**
- **DefaultPlayer.js:**
  - Extends the core Player class with implementation-specific details
  - Specifies the model path ('assets/models/human_man.glb')
  - Defines model rotation (180° on Y-axis) to align with the camera
  - Maps generic animation states to specific animation names in the model:
    - 'idle' → 'Idle.002'
    - 'walk' → 'Walking.006'
    - 'run' → 'Running.006'
    - etc.
  - Keeps implementation clean by only containing model-specific details

- **DefaultEnvironment.js:**
  - Self-initializing module that detects when scene is available
  - Creates implementation-specific environmental objects
  - Loads and places 3D models like 'free_merc_hovercar.glb'
  - Positions objects at specific coordinates (hovercar at 15, 0, 20)
  - Applies appropriate rotation (45° for the hovercar)
  - Sets up shadows and other visual properties

- **index.js (Implementation Manifest):**
  - Declares which modules should be loaded for this implementation
  - Follows a convention-based approach for module loading
  - Core system automatically loads these modules at runtime

**Future Implementations:**
- Would follow similar patterns, extending the core components
- Each implementation will be contained in its own directory
- Will register custom entity factories and behaviors
- Maintain the same architecture with core/implementation separation

### 4. Main Engine (game-engine.js)
- Initializes the Three.js scene, renderer, and camera
- Sets up player controls and world objects
- Loads the 'default' game implementation statically.
- Manages view modes (first-person, third-person, free roam, RTS view)
- Updates visual components based on server state
- Handles synchronization between player rotation and camera orientation
- Implements procedural terrain generation with canvas-based texture for natural ground appearance:
  - Renders a realistic grass floor without grid lines
  - Uses dynamic texture generation with HTML5 Canvas
  - Creates varied terrain appearance through procedural noise patterns
  - Applies random color variations for a more natural look
  - Optimizes performance with appropriate texture resolution and repetition

### 5. Networking Architecture
**Technology:** Colyseus for WebSocket-based real-time multiplayer.

**Implementation Selection:**
- Implementation selection is handled via URL parameters (`?implementation=test1`)
- Each implementation has its own dedicated game room on the server
- Room names match implementation names (e.g., 'test1', 'default')
- Clients automatically connect to the appropriate room based on the selected implementation
- UI dropdown allows users to switch between available implementations
- Implementation-specific code and assets are loaded dynamically based on selection

**Implementation:**
- Server maintains authoritative game state using Colyseus Schema
- Player state includes position, velocity, pitch, rotationY, input state, currentAnimation.
- Client sends input state (including current rotation values) via `updateInput` message.
- Server calculates movement, rotation, and animation state based on input.
- Server applies direct rotation from client when provided.
- Server broadcasts delta updates.
- Client interpolates remote player positions and applies server rotation/animation state.

**Key Features:**
- Session persistence with reconnection support
- Room-based multiplayer with shared state
- Message-based communication for game events
- Schema-based state synchronization with type annotations
- Player list UI showing all connected players
- Automatic remote player creation and cleanup
- Smooth remote player movement interpolation
- Proper handling of player value updates and mesh recreation
- Resilient error handling for network disconnections
- Automatic cleanup of stale player instances

**Schema Implementation:**
- `GameState`: Holds maps for `players`, `entities`, `structures`.
- `Player`: Extends `BaseEntity`, includes `input` (InputState), `currentAnimation`, `pitch`, `rotationY`, `velocityY` etc.
- `InputState`: Holds `keys`, `mouseDelta.y`, `clientRotation`, `viewMode`.

**Player Synchronization:**
- Automatic creation of remote player instances with proper sessionId tracking
- Smooth position interpolation using Three.js lerping
- Proper cleanup of disconnected player instances
- Value-based mesh updates
- Efficient player collection management using Set data structure
- Proper separation of local and remote player handling
- Resilient error handling for edge cases
- Different rotation handling for local vs remote players

### 6. Building System
**Technology:** Three.js for rendering, Colyseus for server-side validation and synchronization.

**Implementation:**
- Server-authoritative structure placement system 
- Client-side preview with real-time validation feedback
- Built on Colyseus Schema for synchronized structure collections
- Toggle between game and building modes with keystroke (B key)
- Grid-based placement with 15° rotation increments (Q/E keys)
- Seamless operation across all camera modes

**Client Components:**
- Building mode UI overlay with structure selection menu
- Structure preview mesh with valid/invalid placement indicators
- Click-to-place functionality with server authorization
- Structure rotation controls (Q/E for 15° increments)
- Cross-camera mode compatibility (first-person, third-person, RTS)
- Interactive grid system for structure placement

**Server Components:**
- Structure schema extending BaseEntity
- Structure collection in GameState
- Server-side collision detection and validation
- Server broadcasting of structure changes to all clients
- Authoritative structure placement confirmation

**Structure Types:**
- Buildings: Base structures with customizable dimensions
- Walls: Thin structures with height/width customization
- Additional types can be added by extending the Structure schema

**Networking Flow:**
1. Client enters building mode and selects structure type
2. Client shows preview mesh at mouse pointer location
3. Client validates placement and shows green/red indicator
4. Client sends placement request to server on valid click
5. Server validates placement and checks for collisions
6. Server creates structure and broadcasts to all clients
7. All clients render the confirmed structure

**Key Features:**
- Complete cross-client synchronization of structures
- Real-time placement validation with visual feedback
- Seamless integration with all camera modes
- Full server authority for all structure placement
- Interactive preview system with structural rotation
- Grid-based placement with customizable sizing

## Game Startup Process

### Single-Player Mode
1. User visits the landing page (`public/index.html`)
2. Selects a game implementation from the dropdown
3. Clicks "Play Now" in the single-player section
4. Browser loads the game directly (`/game?implementation={selected}`)
5. Game initializes with the selected implementation in single-player mode

### Multiplayer Mode
1. User visits the landing page (`public/index.html`)
2. Selects a game implementation from the dropdown
3. Clicks "Play Now" in the multiplayer section
4. A modal dialog appears with two options:
   - "Download Launcher" - Downloads the Electron-based launcher application
   - "I already have the launcher" - Shows instructions to run the existing launcher
5. If downloading, the user installs and runs the launcher application
6. The launcher application:
   - Starts the local game server
   - Manages player count (1-4 players)
   - Creates the game window(s) in split-screen mode if multiple players
   - Handles controller assignment and input routing

## Directory Structure
```
3D AI Game/
├── assets/                 # Main game assets
│   ├── icons/              # UI icons and graphics
│   ├── models/             # 3D model files (.glb)
│   ├── textures/           # Texture files
│   └── sounds/             # Sound files
├── client/                 # Client-side code
│   ├── js/                 # JavaScript source files
│   │   ├── core/           # Core platform components
│   │   │   ├── main.js     # Entry point for client code
│   │   │   ├── controls.js # Input handling
│   │   │   ├── ...         # Other core modules
│   │   ├── implementations/ # Game implementation-specific code
│   │   │   ├── default/    # Default implementation
│   │   │   │   ├── DefaultPlayer.js   # Player implementation
│   │   │   │   ├── DefaultEnvironment.js # Environment setup
│   │   │   │   └── index.js # Implementation manifest
├── electron/               # Electron-based multiplayer launcher
│   ├── main.js             # Main Electron process
│   ├── launcher.html       # Launcher interface
│   ├── multiplayer.html    # Multiplayer manager interface
│   ├── preload.js          # Preload script for launcher window
│   ├── multiplayer-preload.js # Preload script for multiplayer window
│   └── game-preload.js     # Preload script for game windows
├── public/                 # Public facing web files
│   ├── index.html          # Landing page with game mode selection
│   └── styles/             # CSS stylesheets
├── server/                 # Server-side code
│   ├── core/               # Core server platform components
│   │   ├── index.js        # Server entry point and API routes
│   │   ├── server.js       # Colyseus server setup
│   │   └── ...             # Other server modules
│   ├── implementations/    # Server-side game implementations
│   │   └── default/        # Default server implementation
├── launch_game.bat         # Batch file to launch the game directly
├── register-protocol.bat   # Batch file to register the protocol handler
├── start_server            # Script to start the server
└── memory bank/            # Documentation and architecture files
    └── architecture.md     # This architecture documentation
```

## Project Structure (Simplified View)

```
/
├── client/                 # Client-side code
│   ├── css/
│   ├── js/
│   │   ├── core/           # Core client platform components (game-engine, controls, network, etc.)
│   │   ├── implementations/
│   │   │   └── default/    # Default game implementation (e.g., DefaultPlayer.js, DefaultEnvironment.js)
│   │   │       └── index.js # Implementation manifest declaring modules to load
│   │   └── lib/            # Additional JavaScript utilities
│   ├── assets/             # Game assets (textures, etc.)
│   │   └── models/         # 3D model assets (GLB files)
│   │       ├── human_man.glb # Player character model
│   │       ├── free_merc_hovercar.glb # Environment object model
│   │       └── modern_city_block.glb # Environment object model
│   ├── models/             # Additional model assets
│   └── index.html          # Main game HTML
├── server/                 # Server-side code
│   ├── core/               # Core server platform components (BaseRoom, schemas, etc.)
│   │   ├── index.js        # Server setup and Colyseus integration
│   │   ├── BaseRoom.js     # Base room implementation with player movement logic
│   │   └── schemas/        # Colyseus schemas (GameState, Player, etc.)
│   └── implementations/
│       └── default/        # Default server implementation (DefaultRoom.js)
├── public/                 # Public assets
├── node_modules/           # npm dependencies
├── package.json            # Project dependencies
├── package-lock.json       # Lock file for dependencies
├── start_server.bat        # Local server startup script (Windows)
├── update_compiled_code.bat # Utility script to generate compiled_code.txt
└── memory bank/            # Documentation (like this file)
    └── architecture.md     # This architecture documentation
```

## Data Flow

1.  **Initial Connection**: Client browser navigates to the root URL (`/`).
2.  **Redirect**: Server receives request for `/`, executes `res.redirect('/select')`.
3.  **Selection Page**: Client browser requests `/select`. Server serves `public/player_select.html`.
4.  **Player Choice**: User clicks a button on the selection page.
    *   **1 Player**: Browser navigates to `/game`.
    *   **2-4 Players**: Browser navigates to `/setup?players=N`.
5.  **Game Page Load**: 
    *   If `/game` was requested, server serves `client/index.html`.
    *   If `/setup` was requested, server serves `four_player_setup.html`, which then loads `/game` in iframes.
6.  **Client Initialization**: `client/index.html` loads necessary JS (`main.js`).
7.  **Server Connection**: Client connects to Server via WebSocket (Colyseus `network-core.js`).
8.  **Join Room**: Client joins the 'active' room (`DefaultRoom.js`).
9.  **State Sync**: Server sends initial `GameState` to Client. Player entities are created client-side (`network-core.js` using `EntityFactory`).
10. **Input**: Client sends input state (keys pressed, mouse movement, rotation) to Server (`controls.js` -> `network-core.js` -> `BaseRoom.js`).
11. **Server Processing**: Server updates player state based on input, performs physics/collision checks (`BaseRoom.js` or `DefaultRoom.js`).
12. **State Broadcast**: Server broadcasts delta updates of the `GameState` to all clients.
13. **Client Update**: Client receives state updates, interpolates remote player positions, updates local visuals (`network-core.js`).
14. **Building**:
    *   Client enters build mode, sends placement request (`game-engine.js` -> `network-core.js`).
    *   Server validates, updates `GameState.structures`, broadcasts change (`BaseRoom.js`).
    *   Clients render the new structure (`network-core.js`).
15. **RTS Commands**:
    *   Client selects units, issues move command (`game-engine.js`/`rts-view.js` -> `network-core.js`).
    *   Server receives command, updates target position for player entities (`BaseRoom.js`).
    *   Server state updates cause units to move on all clients.

## Player Architecture

The player model system uses several key architecture components working together:

1. **Core/Implementation Separation:**
   - **Core Player.js:** Contains generic functionality needed by all player implementations:
     - Model loading workflow (placeholder → async GLB loading)
     - Animation system with mixer setup and playback
     - Generic animation state mapping (idle, walk, run, etc.)
     - Camera mode-based visibility
     - Position and rotation updates
   - **Implementation DefaultPlayer.js:** Contains only model-specific details:
     - Model path ('assets/models/human_man.glb')
     - Model rotation (180° on Y-axis to align with camera)
     - Specific animation name mappings ('idle' → 'Idle.002', etc.)

2. **Model Loading Process:**
   - Creates invisible placeholder mesh immediately
   - Asynchronously loads specified GLB model
   - Creates a container hierarchy for proper rotation
   - Sets up animation mixer and clips
   - Applies implementation-specific transformations (rotation, scale)
   - Replaces placeholder with model once loaded

3. **Animation System:**
   - Input state → Animation state mapping in core
   - Animation state → Specific animation clip name in implementation
   - Smooth transitions between animations with crossfade
   - Suppresses animations in camera-only modes (FreeCamera, RTS)
   - Handles fallback animations if specific ones not found

4. **Rotation Handling:**
   - For local player:
     - Mouse movement and Q/E keys directly update `playerRotationY` and mesh rotation
     - Camera views are properly aligned with mesh rotation
     - Rotation values are sent to server via `clientRotation` in input updates
   - For remote players:
     - Server state `rotationY` is used to determine target rotation
     - Smooth interpolation is applied for natural movement
     - Distinct handling prevents rotation conflicts

## Environment Objects

The environment system adds implementation-specific 3D objects to the scene:

1. **Self-Initializing Module:**
   - DefaultEnvironment.js auto-detects when the scene is available
   - Sets up a watcher that polls for scene availability
   - Initializes environment objects when scene is ready
   - Includes safety timeout to prevent infinite waiting

2. **Implementation-Specific Objects:**
   - Adds the hovercar model at position (15, 0, 20) with 45° rotation
   - Properly configures shadows for all objects
   - Loads models using THREE.GLTFLoader with proper error handling
   - Could be expanded to include additional environment objects

3. **Convention-Based Loading:**
   - Environment modules are declared in the implementation's index.js
   - Core automatically loads all declared modules at runtime
   - Maintains clean separation between core and implementation code

## Terrain Generation

The procedural terrain system creates a natural-looking ground:

1. **Canvas-Based Texture Generation:**
   - Uses HTML5 Canvas to dynamically generate textures
   - Creates random variations in grass color and pattern
   - Applies subtle noise patterns for a natural appearance
   - Replaces the original grid-based floor with a seamless texture

2. **Performance Optimization:**
   - Uses appropriate texture resolution for performance
   - Implements texture repetition for larger areas
   - Balances visual quality with rendering performance

3. **Appearance:**
   - Natural grass coloration with subtle variations
   - No visible grid lines or artificial patterns
   - Realistic ground appearance fitting the game's style

## Notes & Current State

- Player model (`human_man.glb`) loading and basic movement animations (Idle, Walk, Run, Jump, Strafe) are functional.
- Animation state is synchronized between server and clients.
- Run/Walk inversion (Run default, Shift=Walk) is implemented.
- View modes (FPS, TPS, FreeCam, RTS) function, and player input/animations are correctly suppressed in non-player-control modes.
- Local development can be started using `start_server.bat` or `npm run dev`.
- Player rotation system now correctly handles both local and remote player rotations with proper model orientation.
- Model directionality aligns with camera views through a container/model hierarchy system.
- Terrain rendering uses procedural canvas-based texture generation for natural-looking grass without grid lines.
- Environment objects (hovercar, city blocks) are dynamically loaded by implementation-specific modules.
- Core/implementation separation is maintained throughout the codebase.