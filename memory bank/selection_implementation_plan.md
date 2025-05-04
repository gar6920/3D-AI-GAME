# Selection & Interaction System Implementation Plan

## Overview

The goal is to implement a robust, extensible system that allows players to select any entity in the game world—structures, NPCs, players, or groups thereof—regardless of camera mode. Once selected, the client and server coordinate to display contextual information and available actions for those entities, and allow players to execute actions specific to the entity type in a secure, authoritative way.
This system will unify interaction logic across all gameplay views (RTS, first-person, third-person), support multiplayer synchronization, and provide a foundation for future interactive features (like portals, building functionality, NPC functionality, etc).

## What We Are Trying to Achieve

- **Universal Selection:** Players can select any entity in any view mode using intuitive controls (e.g., mouse click, selection box).
- **Contextual Interaction:** Upon selection, the UI displays relevant information and actionable options for the selected entities, updating in real time as state changes.
- **Client-Server Authority:** All selections and actions are validated and processed by the server, ensuring game integrity and multiplayer synchronization.
- **Extensibility:** The system is designed to support new entity types and actions with minimal changes, enabling rapid feature growth.

## Implementation Steps

### Step 1: Unified Selection & UI Controls Across Views
- Refactor selection logic (raycast/click/box select) from RTS view into a shared module accessible from all camera modes.
- Trigger selection on appropriate input events (mouse click, drag, etc.) in any view.
- Visually highlight selected entities and update the client's selection state.
- Fire a selection change event on the client.

### Step 2: Client-to-Server Selection Communication
- When the selection changes, send a message to the server (e.g., `select_entities`) with the IDs of the selected entities.
- Implement this as a new message type in the network layer, ensuring it is sent reliably and efficiently.
- The server is now aware of each client's current selection(s).

### Step 3: Server-Side Selection Acknowledgement & Info/Action Options
- The server validates the selection, determines available actions and info for each entity, and sends this back to the client in a `selection_info` message.
- While the selection is active, the server continues to send updates if selected entities' states change (health, ownership, links, etc.).

### Step 3a: Define Action Metadata in Implementations
- In `server/implementations` (e.g., `structures.js`, `npcs.js`), extend each entity definition with an `actions` array of `{ name, label, condition }`.
  ```js
  {
    id: 'house',
    // ...other properties...
    actions: [
      { name: 'upgrade', label: 'Upgrade', condition: (entity, player) => player.resources >= entity.upgradeCost },
      // ...more actions
    ]
  }
  ```
- In `server/implementations/default/index.js`, export a `getActionDefinitions()` function that merges structure and NPC defs into a lookup map.
- In `BaseRoom.handleSelect`, for each selected entity, lookup its action metadata and filter by evaluating `condition(entity, player)` before including it in `selection_info`.

### Step 4: Client UI for Actions & Action Execution Flow
- Extend the PlayerUI to display a context-sensitive panel showing selected entities' info and available actions.
- When the player chooses an action, send an `entity_action` message to the server (with entity ID, action type, and parameters).
- The server processes the action, updates state, and broadcasts changes as needed.

### Step 4a: UI Hookup
- In `client/js/core/network-core.js`, listen for `selection_info` and forward to UI:
  ```js
  room.onMessage('selection_info', data => playerUI.updateSelectionPanel(data));
  ```
- Rely on `PlayerUI.initSelectionPanel()` and `PlayerUI.updateSelectionPanel(data)` to render stats and action buttons.
- Action buttons send placeholder `entity_action` messages (no real logic yet).

### Step 4b: Server Stub for Action Acknowledgement
- In `server/core/BaseRoom.js.onCreate`, add:
  ```js
  this.onMessage('entity_action', (client, { entityId, action }) => {
    console.log(`Action requested: ${action} on ${entityId}`);
    client.send('action_ack', { entityId, action });
  });
  ```
- In `client/js/core/network-core.js`, listen for `action_ack` to show acknowledgement:
  ```js
  room.onMessage('action_ack', data => showInfoMessage(`Action ${data.action} on ${data.entityId} acknowledged`));
  ```

### Step 5: Testing & Validation
- Select an entity in any view: ensure the selection panel appears with entity stats and action buttons.
- Click an action button: verify console logs and info message show acknowledgment.
- Test deselect, reselect, and multiple selections to confirm UI updates correctly.

## Rationale
- **Consistency:** Unifying selection and interaction logic across views improves usability and code maintainability.
- **Security:** Server authority prevents cheating and ensures fair multiplayer play.
- **Responsiveness:** Real-time updates keep the player informed and engaged.
- **Future-Proofing:** The modular approach allows for easy expansion to new entity types and actions.

---

This plan is the foundation for all advanced world interactions in the 3D AI Game, enabling features like portals, city upgrades, NPC commands, and more, while maintaining a clean separation of concerns between input, UI, networking, and server logic.

## Update (Collider-Based Selection Integration) – YYYY-MM-DD

### What we added in this session
1. **Schema fields** (server/core/schemas/BaseEntity.js)
   * `colliderType` ("sphere" | "box")
   * `colliderRadius`
   * `colliderHalfExtents` (ArraySchema length 3)
   These are replicated to every client so each entity now carries an authoritative, physics-matching collider description.

2. **Server population of collider data** (server/core/BaseGameRoom.js)
   * `_createEntityBody` & `_createPlayerBody` now fill `colliderType="sphere"` and `colliderRadius = scale`.
   * `_createStructureBody` sets `colliderType` / `colliderRadius` / `colliderHalfExtents` based on the half-extents or sphere data already computed for Ammo bodies.

3. **Client-side reconstruction**
   * `client/js/core/collider-utils.js` helper `addSelectionColliderFromEntity` builds an invisible Three.js `Mesh` matching the collider:
     * `SphereGeometry(radius)` or `BoxGeometry(hx*2,hy*2,hz*2)`
     * marks it with `isCollider` & `userData.entity` so selection ray-casts see it but outline builder ignores it.
   * Player.js and NPC.js call the helper right after the GLB finishes loading; structures can do the same when spawned.
   * `getPrimaryMesh` in game-engine skips meshes with `isCollider` when calculating green outline.

4. **Selectable-mesh cache** still uses the `userData.entity` test, so these new invisible collider meshes are automatically part of `_rtsSelectableMeshes`.

### Current dilemma
Even after the collider data flows from server → client and invisible colliders are being attached, clicking directly on some skinned NPCs (e.g. **robokeeper** and the player model) still fails, while clicking nearby grass sometimes selects them.  This suggests at least one of:
* Collider mesh not created (helper never executed because model not yet loaded when called, or no parent passed).
* Collider geometry size/position incorrect (half-extents zero or wrong scale → collider misses visible model).
* Rebuild of `_rtsSelectableMeshes` excludes collider meshes (e.g. early return if `!obj.isMesh` or if colliders have `material.userData.ignoreRTS`).
* Raycaster still hitting non-collider skinned triangles in bind pose first and returning them, then `getEntityFromIntersect` ascends but finds no `userData.entity` (if colliders lack it).

### Next debugging steps
1. **Verify collider creation on client**
   ```js
   scene.traverse(o=>{ if(o.userData.isCollider) console.log(o.userData.entity?.id, o.geometry.boundingBox); });
   ```
2. **Check collider size** – compare `colliderHalfExtents` vs visual model bbox.
3. **Ensure selectable cache** – after `rebuildSelectableMeshCache()` log how many meshes & whether colliders are included.
4. **Confirm `getEntityFromIntersect` finds entity for collider meshes**.
5. If colliders are correct but first click still hits original SkinnedMesh, change ray-cast list to *only* colliders by filtering `isCollider` true.

---
