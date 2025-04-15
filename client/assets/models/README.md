# Model Asset Documentation

This file documents the 3D models used in the game, located in this directory or its subdirectories.

---

## Model 1: Placeholder Character (e.g., Player)

*   **Model ID/Name:** `PlayerCharacter_Mixamo` (Please update)
*   **File Path:** `(e.g., characters/player_model.glb)` (Please update)
*   **Format:** `glTF Binary (.glb)` (Assuming)
*   **Source:** Mixamo
*   **Poly Count:** `Triangles: ???, Vertices: ???` (Please fill in)
*   **File Size:** `??? MB` (Please fill in)
*   **Textures:** `(e.g., 2048x2048 PBR - Albedo, Normal, etc.)` (Please update)
*   **Animations:**
    *   `idle`: (Frames ???-???) - Description (e.g., Standing idle loop).
    *   `walk`: (Frames ???-???) - Description (e.g., Forward walk loop).
    *   `run`: (Frames ???-???) - Description (e.g., Forward run loop).
    *   `(Add other animations like jump, attack, etc.)`
*   **Technical Notes:** `Uses standard Mixamo rig.`, `(Add other notes, e.g., LODs?)`

---

## Model 2: Placeholder NPC (e.g., Guard)

*   **Model ID/Name:** `NPC_Guard_Mixamo` (Please update)
*   **File Path:** `(e.g., npcs/guard_model.glb)` (Please update)
*   **Format:** `glTF Binary (.glb)` (Assuming)
*   **Source:** Mixamo
*   **Poly Count:** `Triangles: ???, Vertices: ???` (Please fill in)
*   **File Size:** `??? MB` (Please fill in)
*   **Textures:** `(e.g., 1024x1024 PBR - Albedo, Normal, etc.)` (Please update)
*   **Animations:**
    *   `idle`: (Frames ???-???) - Description (e.g., Standing idle loop).
    *   `walk_patrol`: (Frames ???-???) - Description (e.g., Patrolling walk loop).
    *   `(Add other animations like attack, react, etc.)`
*   **Technical Notes:** `Uses standard Mixamo rig.`, `(Add other notes)`

---

## Model 3: Robo Keeper 1

*   **Model ID/Name:** `robokeeper1`
*   **File Path:** `robokeeper1.glb`
*   **Format:** `glTF Binary (.glb)`
*   **Source:** Mixamo (Assumed from animation names)
*   **Poly Count:** `Triangles: ???, Vertices: ???`
*   **File Size:** `??? KB/MB`
*   **Textures:** `(e.g., PBR - Albedo, Normal, etc.)` (Please update)
*   **Animations (Raw Mixamo Name -> Mapped Name in `NPC.js`):**
    *   `Armature.001|mixamo.com|Layer0`: `Idle`
    *   `Armature.002|mixamo.com|Layer0`: `Die`
    *   `Armature.003|mixamo.com|Layer0`: `Walk`
    *   `Armature.004|mixamo.com|Layer0`: `???` (Unmapped)
    *   `Armature.005|mixamo.com|Layer0`: `???` (Unmapped)
    *   `Armature|mixamo.com|Layer0`: `???` (Unmapped)
*   **Technical Notes:** `Uses standard Mixamo rig. Mappings are defined in \`client/js/core/NPC.js\` in the \`DEFAULT_ANIMATION_MAP\` constant.`

---

*(Add entries for other models as they are added)*
