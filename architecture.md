# City Dome Wall Generation & Export Pipeline (April 2025)

## Overview
This document summarizes the workflow and scripts developed for generating, customizing, and exporting the city dome wall (sphere/collider) for the 3D AI Game. This pipeline ensures that the dome's collider and visual mesh are always perfectly aligned, and that the dome can have a visually appealing, electrical grid-like appearance.

---

## Blender Automation Script: `create_and_export_city_dome.py`
- **Location:** `client/assets/models/create_and_export_city_dome.py`
- **Purpose:** Procedurally generates a sphere dome of any radius, applies a wireframe modifier (for grid look), adds an emissive electric material, and (optionally) a glowing transparent shell for an energy shield effect.
- **How to Use:**
  1. Open the script in Blender's Scripting workspace.
  2. Call `create_electric_grid_dome(RADIUS)` (e.g., `create_electric_grid_dome(100)`).
  3. The script deletes the scene, creates the dome, applies all effects, and exports as `city_dome_{RADIUS}.glb`.
  4. The exported GLB is ready for use in the game and includes both the grid and shell as a single file.

### Key Features
- **Wireframe Modifier:** Gives the dome a grid/electric look.
- **Emission Shader (with Noise):** Simulates electrical flicker/sparks.
- **Transparent Shell:** Adds a glowing energy field effect.
- **Parametric:** Change the radius to generate any size dome; the export is always centered at (0,0,0).

### Example Script Snippet
```python
create_electric_grid_dome(100)  # Generates a 100-radius dome
```

---

## Usage in Game (`structures.js`)
- The game loads the exported GLB and creates a matching static sphere collider at `{x:0, y:0, z:0}`.
- Example entry:
```js
{
  id: "city_dome_100",
  structureType: "decor",
  modelPath: "assets/models/city_dome_100.glb",
  position: { x: 0, y: 0, z: 0 },
  rotationY: 0,
  scale: 1,
  buildable: false,
  collision: {
    sphere: { radius: 100 }
  },
  isStatic: true
},
```
- The collider and mesh are always aligned, and the dome's center is at the origin, so half is above ground and half below (matching the physics logic).

---

## Challenges & Codebase Notes
- **GLTF Export in Blender:**
  - The `export_selected` flag is not supported in Blender's Python API; workaround is to hide all other objects before export.
  - Relative paths can cause permission errors; always use absolute paths for exports on Windows.
- **Material/Shader Limitations:**
  - Emission and transparency export well to GLTF/GLB, but procedural/animated shaders (noise flicker, etc.) are only visible in Blender, not in-game. For real-time animation, a custom shader is needed in the game engine.
- **Collider/Visual Sync:**
  - Always ensure the exported mesh and the collider definition in `structures.js` use the same radius and center.
- **Performance:**
  - Large domes with high segment counts or complex shaders may be GPU-intensive. If performance is an issue, lower segment counts or optimize the mesh/material.

---

## Next Steps / TODO
- **Refactor sphere city wall creation:**
  - Explore more advanced electrical/effects, possibly with animated or procedural geometry/textures.
  - Consider in-game shader animation for real-time flicker or energy movement.
  - Maintain parametric (radius-based) workflow so size can be adjusted on the fly, with colliders and effects always in sync.
  - Ensure the system remains performant for large domes or many simultaneous domes.

---

## Resuming Later
- To generate a new dome: open the Blender script, call `create_electric_grid_dome(RADIUS)`, and export.
- Update `structures.js` with the new model path and collider radius.
- For visual tweaks, edit the Blender script (color, emission, noise, shell, etc.).
- For real-time animation or procedural effects in-game, plan to implement custom shaders in the game engine.

---

**This document is up-to-date as of April 2025. Resume here for further dome improvements or game integration.**
