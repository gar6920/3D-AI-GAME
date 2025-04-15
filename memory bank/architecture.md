# 3D AI Game Platform - Architecture

## Overview
The 3D AI Game Platform is a modular, multiplayer 3D web game built with Three.js (client) and Colyseus (Node.js server). The architecture is designed for flexibility, supporting multiple implementations and modular entity/NPC definitions.

---

## Server Structure (`/server`)

### Core Logic (`/server/core`)
- **index.js**: Main server entry; starts Colyseus, loads implementations, registers rooms.
- **BaseRoom.js**: Abstract base for all room types (handles state, updates, player join/leave).
- **schemas/**: Colyseus schemas for game state, entities, players, etc.
  - `DefaultRoom.js`: Main room logic for the default implementation. Loads modular entity/NPC definitions from the active implementation.
  - `BaseEntity.js`, `Player.js`, `GameState.js`, etc.: Define server-side state for all entities and players.

### Implementations (`/server/implementations`)
- **default/**: The default game implementation.
  - **npcs.js**: Exports `npcDefinitions` array. Each entry defines an NPC/entity (id, type, position, behavior, etc.).
  - **index.js**: Implementation manifest.
- Add new implementations as new subdirectories with their own `npcs.js` and logic.

### Key Features
- Modular entity/NPC creation: Entities are defined per implementation in `npcs.js` and loaded dynamically by the room.
- All entity behavior (animation, movement, state) can be defined in the modular definitions.
- Server is authoritative for all state and entity updates.

---

## Client Structure (`/client`)

### Core Platform (`/client/js/core`)
- **main.js**: Entry point; loads core and implementation modules, initializes managers.
- **game-engine.js**: Sets up Three.js renderer, scene, camera, and main loop.
- **network-core.js**: Handles Colyseus networking, joining/leaving rooms, syncing state, and entity creation/destruction.
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

### **How to Add a New NPC (Current System)**

1. **Model File:** Place the NPC's GLB model file (e.g., `new_npc1.glb`) in `client/assets/models/`. The filename MUST exactly match the `entityId` you will define in the next step.
2. **Server Definition:** Add a new entry to the `npcDefinitions` array in `server/implementations/default/npcs.js`. Define its unique `id` (matching the model filename), `type: 'npc'`, initial `position`, `rotation`, and `state` (usually 'Idle').
3. **Client Code:** No code changes should be needed *if* the standard post-load processing (scaling, traversal, animation setup) in `NPC.js` works for the new model. The client automatically uses the `entityId` to load the corresponding `.glb` file. If your NPC uses different animation clip names, you may need to update or extend the animation mapping in `NPC.js`.
4. **Run:** Start the server and client. The new NPC should appear at its defined location in its initial state and synchronize across all clients.

**Note:** Some NPCs (like `robot_shark1`) may require custom or simplified post-load processing due to model/visibility quirks. See `NPC.js` for details.

**Animation:** NPCs will play their animation corresponding to their `state` property. The server must update the `state` property to trigger animation changes. The client listens for state changes via Colyseus `.listen` handlers for real-time updates.

---

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