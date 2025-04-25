// server/implementations/default/structures.js

/**
 * Each def drives both BuildingMode UI (buildable:true)
 * and static world props (buildable:false).
 */

const structureDefinitions = [
  {
    id: "city_building_center",
    structureType: "building",
    modelId: "city_building",
    modelPath: "assets/models/city_building.glb",
    position: { x: 0, y: 0, z: 0 },
    rotationY: 0,
    scale: 10,
    buildable: false,
    health: 1000,
    maxHealth: 1000
  },
  {
    id: "hover_cube",
    structureType: "cube",
    modelPath: "assets/models/hover_cube.glb",
    position: { x: 0, y: 0, z: 0 },
    rotationY: 0,
    scale: 1,
    buildable: true
  },
  {
    id: "castle",
    structureType: "building",
    modelId: "castle",
    modelPath: "assets/models/castle.glb",
    position: { x: 0, y: 0, z: 0 },
    rotationY: 0,
    scale: 10,
    buildable: true,
    health: 2000,
    maxHealth: 2000
  },
  {
    id: "house",
    structureType: "building",
    modelId: "house",
    modelPath: "assets/models/house.glb",
    position: { x: 10, y: 0, z: 10 },
    rotationY: 0,
    scale: 8,
    buildable: true
  },
  {
    id: "concrete_path_buildable",
    structureType: "path_tile",
    modelId: "concrete_path",
    modelPath: "assets/models/concrete_path.glb",
    position: { x: 0, y: 0, z: 0 },
    rotationY: 0,
    scale: 1,
    buildable: true
  }
];

module.exports = { structureDefinitions };
