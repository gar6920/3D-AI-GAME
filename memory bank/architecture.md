# 3D AI Game Platform - Architecture

## Overview
The 3D AI Game Platform is a modular, multiplayer 3D web game built with Three.js (client) and Colyseus (Node.js server). The architecture is designed for flexibility, supporting multiple implementations and modular entity/NPC definitions.

---

## Server Structure (`/server`)

### Core Logic (`/server/core`)
- **index.js**: Main server entry; starts Colyseus, loads implementations, registers rooms.
- **BaseRoom.js**: Abstract base for all room types (handles state, updates, player join/leave).
- **schemas/**: Colyseus schemas for game state, entities, players, etc.
  - `BaseGameRoom.js`: Core room logic for the default implementation. Loads modular NPC definitions, handles dynamic reset (city destruction & deferred respawn), and timer-based game cycle.
  - `BaseEntity.js`, `Player.js`, `GameState.js`, etc.: Define server-side state for all entities and players.
  - **GameConfigSchema.js**: Defines game configuration schema including a dynamic `mapSize` value, sourced from the active implementation’s `getMapSize()` (default returns 1000), enabling flexible map dimensions.

### Implementations (`/server/implementations`)
- **default/**: The default game implementation.
  - **npcs.js**: Exports `npcDefinitions` array. Each entry defines an NPC/entity (id, type, position, behavior, etc.).
  - **index.js**: Implementation manifest.
- Add new implementations as new subdirectories with their own `npcs.js` and logic.

### Key Features
- Modular entity/NPC creation: Entities are defined per implementation in `npcs.js` and loaded dynamically by the room.
- All entity behavior (animation, movement, state) can be defined in the modular definitions.
- Server is authoritative for all state and entity updates.
- Dynamic reset logic: `BaseGameRoom.resetGame` clears all NPC entities on city center destruction and flags deferred respawn for the next cycle.
- Physics-driven player movement using Ammo.js: input keys and jump apply rigid-body velocities, ensuring smooth and responsive movement.
- Bodies are configured with zero friction and rolling friction, angular rotation locked, and deactivation disabled to prevent unwanted sliding and sleeping.
- Server authoritative rotation: no server-side yaw override; rotation is controlled by client via synced rotationY and pitch.
- Horizontal velocity is zeroed immediately when no movement input is present, eliminating residual sliding.

---

### Recent Architectural Changes

#### Removal of City Wall Segments
- The city wall segments, which previously surrounded the city center as discrete structure entities, have been removed from the default implementation.
- This change simplifies the city layout, reduces unnecessary collision checks, and streamlines both gameplay and server logic.
- All wall-related structure definitions and associated placement logic were deleted from `/server/implementations/default/structures.js` and related files.

#### Auto-Collider Implementation at Server Start
- A new auto-collider system was implemented in `BaseGameRoom._initPhysics()`.
- At server start, the system scans all static structure models (GLB files) and automatically calculates accurate collider shapes based on the model geometry.
- Collider data is cached and assigned to each structure definition before any structures are spawned in the game world.
- This ensures that colliders are always consistent with the actual model size and scale, eliminating manual collider configuration and reducing bugs related to scaling mismatches.
- The auto-collider is only generated at server start; if a structure's scale or model changes at runtime, additional logic would be needed to update its collider accordingly.

---

## Client Structure (`/client`)

### Core Platform (`/client/js/core`)
- **main.js**: Entry point; loads core and implementation modules, initializes managers.
- **game-engine.js**: Sets up Three.js renderer, scene, camera, main loop, and generates the floor geometry using the server-provided `mapSize`.
- **network-core.js**: Handles Colyseus networking, joining/leaving rooms, syncing state, fetches `mapSize` from the server, and triggers dynamic floor regeneration.
- **EntityFactory.js**: Registers and instantiates all entity types (core and implementation-specific).
- **Entity.js**, **Player.js**, **NPC.js**: Base classes for all game objects.
- **controls.js**: Camera and input control logic for all view modes.
- **InputManager.js**: Captures all raw input (keyboard, mouse, gamepad) and exposes state/events.
- **ActionManager.js**: Maps input to semantic actions, context-aware.
- **player-ui.js**: Manages player UI, controller toggles, and HUD.

### Implementations (`/client/js/implementations`)
- **Default/**: Default client-side implementation.
  - `npcs/`, `entities/`: Implementation-specific entity classes for the default game.
  - `index.js`: Manifest for loading implementation modules.

### Assets
- **/client/assets/models/**: 3D models (GLTF, GLB) for use in the game.

---

## Entity & NPC Modularity
- All server-side NPC/entity definitions are modular and implementation-specific, defined in `/server/implementations/[impl]/npcs.js`.
- The server loads these definitions at room creation, ensuring only the desired entities are created.
- Behaviors (movement, animation state, etc.) are attached per entity in the definition.
- The client uses `EntityFactory` to instantiate matching visual/game objects for each entity type.

### **Unified Structure & Building Pipeline (2025 Update)**

#### Implementation-Agnostic Static Structure Spawning
- The server core now supports implementation-agnostic static structure spawning.
- Each implementation can export a `getStructureDefinitions()` function from its `/server/implementations/[impl]/index.js`.
- At room creation, the server will call this function (if present) to load all static and buildable structures.
- Structures are added to the authoritative game state in `this.state.structures` and synced to clients.

#### How to Define Structures (Buildings and Non-Buildings)
- All structures (including buildings and non-building props) are defined in `/server/implementations/[impl]/structures.js` as objects in the exported `structureDefinitions` array.
- **Required fields for each structure:**
    - `id`: Unique identifier (e.g., `city_building_center`)
    - `structureType`: Type/category (e.g., `'building'`, `'decor'`, `'wall'`)
    - `modelId`: Model filename (without `.glb`, e.g., `city_building`)
    - `modelPath`: Path to the GLB model (e.g., `assets/models/city_building.glb`)
    - `position`: `{ x, y, z }` object for world placement
    - `rotationY`: Yaw in radians
    - `scale`: Visual scale multiplier
    - `buildable`: `true` if players can place this structure, `false` for static world props

#### Static vs. Buildable Structures
- **Static structures** (`buildable: false`): Spawned automatically at room creation and always present in the world (e.g., city buildings, world props).
- **Buildable structures** (`buildable: true`): Appear in the player's build menu and can be placed by players during gameplay. Not spawned by default.

#### Steps to Add a New Structure or Building
1. Place your `.glb` model in `/client/assets/models/` (the filename should match your `modelId`).
2. Add a new object to the `structureDefinitions` array in `/server/implementations/[impl]/structures.js` with all required fields.
    - For a static structure, set `buildable: false` and set its `position` to where you want it to appear by default.
    - For a buildable structure, set `buildable: true`. Its default `position` can be `{ x: 0, y: 0, z: 0 }` since placement is determined by the player.
3. (Optional) Export a `getStructureDefinitions()` function from your `/server/implementations/[impl]/index.js` that returns the array (already set up in the default implementation).
4. Restart the server and client. The structure will appear according to its type.

#### Example Structure Definitions
```js
// Example static building (always present)
{
  id: "city_building_center",
  structureType: "building",
  modelId: "city_building",
  modelPath: "assets/models/city_building.glb",
  position: { x: 0, y: 0, z: 0 },
  rotationY: 0,
  scale: 10,
  buildable: false // Not buildable by players
},
// Example buildable prop (player can place)
{
  id: "hover_cube",
  structureType: "cube",
  modelId: "hover_cube",
  modelPath: "assets/models/hover_cube.glb",
  position: { x: 0, y: 0, z: 0 },
  rotationY: 0,
  scale: 1,
  buildable: true // Will appear in build menu
}
```
- You can add as many structures as you want, with any mix of static and buildable types.
- All logic for what is buildable is controlled by the `buildable` field in the definition.
- No changes to client code are required when adding or updating structures—everything is data-driven from the implementation folder.

- **Model documentation:** For each new model, add an entry to `/client/assets/models/README.md` with details (animations, file size, mapping, etc.) to keep assets organized and onboarding easy.

---

### **How to Add a New Structure/Building (Current System)**

Static world props, buildings, and structures must be defined in `/server/implementations/[impl]/structures.js` (not `npcs.js`).

1.  **Model File (`client/assets/models/`):**
    *   Place the GLB model file (e.g., `city_building.glb`) in this directory. The filename here is referenced in `modelPath`.

2.  **Server Definition (`server/implementations/default/structures.js`):**
    *   **Add/Modify Entry:** Add a new object to the `structureDefinitions` array for each **instance** you want to create.
    *   **`id`:** Assign a unique instance identifier (e.g., `city_building_center`).
    *   **`structureType`:** Set to `'building'` (or `'wall'`, `'decor'`, etc. as appropriate).
    *   **`modelPath`:** Specify the full path to the model (e.g., `assets/models/city_building.glb`).
    *   **`position`:** Set as an object: `{ x, y, z }`.
    *   **`rotationY`:** Yaw in radians.
    *   **`scale`:** Size multiplier (e.g., `10` for 10x larger).
    *   **`buildable`:** `false` for static world props, `true` if players can place it in Building Mode.

    **Example:**
    ```js
    {
      id: "city_building_center",
      structureType: "building",
      modelPath: "assets/models/city_building.glb",
      position: { x: 0, y: 0, z: 0 },
      rotationY: 0,
      scale: 10,
      buildable: false
    }
    ```

3.  **Client Code:**
    *   **No Changes Needed:** Structures are spawned and rendered automatically based on the server definition.

4.  **Run:** Restart the server (`./start_server`) and connect with the client. The new structure/building should appear at its defined location, using the specified model and scale.

---

### **How to Add a New NPC/Entity (Current System)**

The system is designed for easily adding new Non-Player Characters (NPCs) or other interactive entities by defining them on the server. Multiple instances of the same *type* of NPC can be created using the same model and behavior logic but placed at different locations.

1.  **Model File (`client/assets/models/`):**
    *   Place the GLB model file (e.g., `robokeeper1.glb`, `new_monster.glb`) in this directory. The filename here serves as the **`modelId`**.

2.  **Server Definition (`server/implementations/default/npcs.js`):**
    *   **Add/Modify Entry:** Add a new object to the `npcDefinitions` array for each **instance** you want to create.
    *   **`id`:** Assign a unique instance identifier (e.g., `robokeeper_guard2`, `monster_alpha`). This is the entity's unique ID in the game state.
    *   **`type`:** Set to `'npc'` (or `'entity'` for non-interactive objects).
    *   **`modelId`:** Specify the filename (without `.glb`) of the model to use (e.g., `'robokeeper1'`, `'new_monster'`). This allows multiple definitions (`id`s) to share the same visual model.
    *   **Position/Rotation:** Set initial `x`, `y`, `z`, and `rotationY`.
    *   **`state`:** Initial animation state (e.g., `'Idle'`, `'Walk'`). Must match a key in the `animationMap`.
    *   **`animationMap`:** (Optional) Define or reuse an object mapping animation clip names from the GLB file to standardized names (e.g., `{ 'Animation|Idle': 'Idle', 'Animation|Walk': 'Walk' }`). If omitted or empty, the NPC will have no animations. You can define these maps as constants in the file for reuse.
    *   **`behavior`:** (Optional) Assign a behavior function (defined elsewhere in the file) that dictates the NPC's logic (movement, state changes). This function receives the entity state, delta time, and room state. You can define reusable behavior functions.

3.  **Client Code (`client/js/core/NPC.js`):**
    *   **No Changes Needed (Typically):** The core `NPC.js` is designed to be generic. It uses the `modelId` from the server state to load the correct model (`assets/models/${modelId}.glb`). It also uses the `animationMap` from the server state to set up animations. Standard scaling and post-processing are applied.
    *   **(Rare) Custom Logic:** Only if a specific model requires unique client-side handling (complex setup, unusual structure) would you potentially need to modify or extend `NPC.js` or create a dedicated client class (though the goal is to avoid this via robust server definitions).

4.  **Run:** Restart the server (`./start_server`) and connect with the client. The new NPC instance(s) should appear at their defined locations, using the specified model, animations, and behaviors.

**Example:** You could define `robokeeper1` and `robokeeper_guard2` both using `modelId: 'robokeeper1'`, `animationMap: robokeeperAnimationMap`, and `behavior: robokeeperBehavior`, but with different `id`s and positions.

This approach allows creating diverse NPC populations and variations by reusing assets and logic, configured entirely through the server-side `npcs.js` definitions.

**Note:** Some NPCs (like `robot_shark1`) may require custom or simplified post-load processing due to model/visibility quirks. See `NPC.js` for details.

**Animation:** NPCs will play their animation corresponding to their `state` property. The server must update the `state` property to trigger animation changes. The client listens for state changes via Colyseus `.listen` handlers for real-time updates.

---

## NPC Definition and Spawning

Adding new NPCs or interactive entities involves defining their properties on the server and ensuring the client can load the corresponding model.

### 1. Server-Side Definition (`server/implementations/<implementation_name>/npcs.js`)

-   Each implementation (e.g., `default`) has an `npcs.js` file containing an array named `npcDefinitions`.
-   Each object in this array defines one NPC or entity instance.
-   **Required Properties:**
    -   `id`: A unique string identifier for this specific instance (e.g., `robokeeper1`, `hover_cube`).
    -   `type`: String indicating the category (e.g., `'npc'`, `'entity'`).
    -   `modelId`: String specifying the base name of the model file (e.g., `robokeeper1`, `hover_cube`). The client will load `assets/models/<modelId>.glb`.
    -   `x`, `y`, `z`: *Flat* numeric properties defining the initial world position.
    -   `rotationY`: *Flat* numeric property for initial yaw rotation (in radians).
    -   `state`: Initial state string (e.g., `'Idle'`), used for animation triggering.
    -   `animationMap`: An object mapping animation names from the GLB file to standardized names (e.g., `{ 'Armature|mixamo.com|Layer0': 'Idle', 'Armature|mixamo.com|Layer1': 'Walk' }`). This map is synchronized to the client.
    -   `behavior`: A JavaScript function `(entity, room)` or `(entity, deltaTime, roomState)` that gets called periodically on the server to update the NPC's state, position, etc. It can return an object with properties to update (e.g., `{ x: newX, state: 'Walking' }`).

-   **Important:** The initial position and rotation **must** be defined using the flat properties (`x`, `y`, `z`, `rotationY`). Nested `position: {x, y, z}` or `rotation: {y}` objects are **not** currently supported by the spawning logic in `BaseGameRoom.js`.

### 2. Client-Side Model (`client/assets/models/`)

-   A corresponding GLB model file must exist in `client/assets/models/`. The filename (without extension) must exactly match the `modelId` specified in the server definition (e.g., `hover_cube.glb` for `modelId: 'hover_cube'`).

### 3. Spawning Process (`server/core/schemas/BaseGameRoom.js`)

-   When a room starts (`initializeImplementation`), it reads the `npcDefinitions` for its implementation.
-   For each definition, it creates a `BaseEntity` state object.
-   It copies the properties (`id`, `type`, `modelId`, `x`, `y`, `z`, `rotationY`, `state`, `animationMap`, `behavior`) from the definition directly onto the `BaseEntity` instance.
-   This `BaseEntity` is added to the room's `state.entities` map, synchronizing it to all connected clients.

### 4. Client-Side Handling (`client/js/core/NPC.js` and `EntityManager.js`)

-   The `EntityManager` detects when a new entity with `type: 'npc'` appears in the room state.
-   It creates an instance of the `NPC` class.
-   The `NPC` class constructor uses the `modelId` from the synchronized state to load the correct GLB file (`assets/models/<modelId>.glb`).
-   It uses the synchronized `animationMap` to set up the available animations.
-   It listens for changes to the entity's `state` property and plays the corresponding mapped animation.

By following this structure, adding new NPCs should primarily involve:
1.  Creating/placing the GLB model.
2.  Adding a correctly structured definition object to the appropriate `npcs.js` file.

This minimizes the need to modify core files like `BaseGameRoom.js` or `NPC.js` for standard NPC additions.

---

## Auto-Collider Implementation

- Integrated NodeIO from `@gltf-transform/core` to automatically compute bounding boxes for static structures on server startup.
- Current auto-collider produced an oversized bounding box for `city_building_center`, causing the user to reject the recent edits.
- Goal: Automatically generate accurate collision boxes for all `.glb` models at server start, with correct scale and mesh alignment, while maintaining server authority over collision detection and physics setup.

---

## Structures & Building Mode
### Server Definitions
- In `/server/implementations/default/structures.js`, define a `structureDefinitions` array of objects with:
  - `id`, `structureType`, `modelPath`, `position`, `rotationY`, `scale`, `buildable`
- These definitions sync to clients via `room.state.structureDefinitions`.

### Client Building Mode
- `network-core.js`’s `setupRoomListeners` hooks `state.structureDefinitions` and calls `BuildingModeManager.initializeStructureListeners(room)`.
- `BuildingModeManager.loadStructureTypes()` filters by `buildable` and populates `structureTypes`.
- `renderStructureButtons()` dynamically rebuilds UI buttons for each buildable structure.
- Previews load GLTFs via `createPreviewModels()`, and placements use `placeCurrentStructure()`.

### Adding New Structures
1. Place the `.glb` model in `client/assets/models/` (filename = `modelId`).
2. Add a buildable entry in `/server/implementations/default/structures.js`.
3. Restart server/client: new structure appears in the build menu.

## Multiplayer Room Management
- Colyseus rooms are created dynamically. By default, all clients join the same room until full (configurable, e.g. 100 players per room).
- Each room has its own set of entities, players, and state.

---

## Input System
- Dual controller support: keyboard/mouse and gamepad, with UI toggle and exclusive control.
- InputManager and ActionManager provide a centralized, extensible input pipeline.

---

## Extending/Modifying
- To add new NPCs/entities: Edit or add to `/server/implementations/[impl]/npcs.js` and provide client-side visual/entity class if needed.
- To add new implementations: Copy the structure of `default/` in both server and client, and register in the manifests.

---

## Summary
This architecture enables rapid prototyping and modular game design. Entities and behaviors are defined per implementation, and the system is designed for maintainability, extensibility, and multiplayer scalability.