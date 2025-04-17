// server/implementations/default/structures.js

/**
 * Each def drives both BuildingMode UI (buildable:true)
 * and static world props (buildable:false).
 */
const structureDefinitions = [
  {
    id: "data_center",
    structureType: "building",
    modelPath: "assets/models/data_center_low-poly.glb",
    position: { x: 0, y: 0, z: 0 },
    rotationY: 0,
    scale: 1,
    buildable: true
  },
  {
    id: "hover_cube",
    structureType: "cube",
    modelPath: "assets/models/hover_cube.glb",
    position: { x: 0, y: 0, z: 0 },
    rotationY: 0,
    scale: 1,
    buildable: true
  }
];

module.exports = { structureDefinitions };
