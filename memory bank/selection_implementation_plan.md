# Selection & Interaction System Implementation Plan

## Overview

The goal is to implement a robust, extensible system that allows players to select any entity in the game world—structures, NPCs, players, or groups thereof—regardless of camera mode. Once selected, the client and server coordinate to display contextual information and available actions for those entities, and allow players to execute actions (such as teleport, link, upgrade, or command) in a secure, authoritative way.

This system will unify interaction logic across all gameplay views (RTS, first-person, third-person), support multiplayer synchronization, and provide a foundation for future interactive features (like portals, city upgrades, or NPC commands).

## What We Are Trying to Achieve

- **Universal Selection:** Players can select any entity in any view mode using intuitive controls (e.g., mouse click, selection box).
- **Contextual Interaction:** Upon selection, the UI displays relevant information and actionable options for the selected entities, updating in real time as state changes.
- **Client-Server Authority:** All selections and actions are validated and processed by the server, ensuring game integrity and multiplayer synchronization.
- **Extensibility:** The system is designed to support new entity types and actions with minimal changes, enabling rapid feature growth.

## Implementation Steps

### Step 1: Unified Selection & UI Controls Across Views
- Refactor selection logic (raycast/click/box select) from RTS view into a shared module accessible from all camera modes.
- Trigger selection on appropriate input events (mouse click, drag, etc.) in any view.
- Visually highlight selected entities and update the client’s selection state.
- Fire a selection change event on the client.

### Step 2: Client-to-Server Selection Communication
- When the selection changes, send a message to the server (e.g., `select_entities`) with the IDs of the selected entities.
- Implement this as a new message type in the network layer, ensuring it is sent reliably and efficiently.
- The server is now aware of each client’s current selection(s).

### Step 3: Server-Side Selection Acknowledgement & Info/Action Options
- The server validates the selection, determines available actions and info for each entity, and sends this back to the client in a `selection_info` message.
- While the selection is active, the server continues to send updates if selected entities’ states change (health, ownership, links, etc.).

### Step 4: Client UI for Actions & Action Execution Flow
- Extend the PlayerUI to display a context-sensitive panel showing selected entities’ info and available actions.
- When the player chooses an action, send an `entity_action` message to the server (with entity ID, action type, and parameters).
- The server processes the action, updates state, and broadcasts changes as needed.

## Rationale
- **Consistency:** Unifying selection and interaction logic across views improves usability and code maintainability.
- **Security:** Server authority prevents cheating and ensures fair multiplayer play.
- **Responsiveness:** Real-time updates keep the player informed and engaged.
- **Future-Proofing:** The modular approach allows for easy expansion to new entity types and actions.

---

This plan is the foundation for all advanced world interactions in the 3D AI Game, enabling features like portals, city upgrades, NPC commands, and more, while maintaining a clean separation of concerns between input, UI, networking, and server logic.
