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
    scale: 1,
    buildable: false,
    colliderType: "sphere",
    health: 1000,
    maxHealth: 1000
  },
  
  {
    id: "city_dome_150",
    structureType: "decor",
    modelId: "city_dome_150",
    modelPath: "assets/models/city_dome_150.glb",
    position: { x: 0, y: 0, z: 0 },
    rotationY: 0,
    scale: 1,
    buildable: false,
    colliderType: "mesh"
  },
  {
    id: "hover_cube",
    structureType: "cube",
    modelPath: "assets/models/hover_cube.glb",
    position: { x: 0, y: 0, z: 0 },
    rotationY: 0,
    scale: 1,
    buildable: true,
    colliderType: "box",
    colliderHalfExtents: [1, 1, 1]
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
    maxHealth: 2000,
    colliderType: "box",
    colliderHalfExtents: [5, 5, 5]
  },
  {
    id: "house",
    structureType: "building",
    modelId: "house",
    modelPath: "assets/models/house.glb",
    position: { x: 10, y: 0, z: 10 },
    rotationY: 0,
    scale: 8,
    buildable: true,
    colliderType: "box",
    colliderHalfExtents: [4, 4, 4]
  },
  {
    id: "concrete_path_buildable",
    structureType: "path_tile",
    modelId: "concrete_path",
    modelPath: "assets/models/concrete_path.glb",
    position: { x: 0, y: 0, z: 0 },
    rotationY: 0,
    scale: 1,
    buildable: true,
    colliderType: "box",
    colliderHalfExtents: [0.5, 0.1, 0.5]
  }
];

module.exports = { structureDefinitions };
