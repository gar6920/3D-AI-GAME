// server/core/colliderFactory.js
// Utility for creating colliders for structures, NPCs, and players

/**
 * Creates and returns an Ammo.js collider for a given entity definition.
 * Supports colliderType: "box", "sphere", "mesh".
 * Optionally caches mesh/box bounds per model file.
 *
 * @param {Object} entity - The entity or structure definition
 * @param {Object} Ammo - The Ammo.js module
 * @param {Object} io - (Optional) GLTF/GLB loader (NodeIO)
 * @param {Object} colliderCache - (Optional) cache for mesh/box bounds
 * @returns {Ammo.btCollisionShape} The created Ammo.js collision shape
 */
async function createColliderForEntity(entity, Ammo, io, colliderCache = {}) {
  if (!entity.colliderType) throw new Error('colliderType must be specified');
  switch (entity.colliderType) {
    case 'sphere': {
      let radius = entity.colliderRadius;
      if ((!radius || radius <= 0) && entity.modelPath && io) {
        // Compute radius from mesh bounding box
        const modelFile = entity.modelPath.split('/').pop();
        let bounds = colliderCache[modelFile + ':sphereBounds'];
        if (!bounds) {
          const path = require('path');
          const document = await io.read(path.join(process.cwd(), 'client', 'assets', 'models', modelFile));
          let min = [Infinity, Infinity, Infinity];
          let max = [-Infinity, -Infinity, -Infinity];
          document.getRoot().listMeshes().forEach(mesh => {
            mesh.listPrimitives().forEach(prim => {
              const pos = prim.getAttribute('POSITION').getArray();
              for (let i = 0; i < pos.length; i += 3) {
                min[0] = Math.min(min[0], pos[i]);
                min[1] = Math.min(min[1], pos[i+1]);
                min[2] = Math.min(min[2], pos[i+2]);
                max[0] = Math.max(max[0], pos[i]);
                max[1] = Math.max(max[1], pos[i+1]);
                max[2] = Math.max(max[2], pos[i+2]);
              }
            });
          });
          bounds = { min, max };
          colliderCache[modelFile + ':sphereBounds'] = bounds;
        }
        const dx = bounds.max[0] - bounds.min[0];
        const dy = bounds.max[1] - bounds.min[1];
        const dz = bounds.max[2] - bounds.min[2];
        radius = 0.5 * Math.max(dx, dy, dz);
      }
      if (!radius || radius <= 0) {
        radius = entity.scale || 1;
      }
      entity.colliderRadius = radius;
      return new Ammo.btSphereShape(radius);
    }
    case 'box': {
      let hx, hy, hz;
      // Compute half extents using the same logic, but always write back to entity.colliderHalfExtents
      if (entity.colliderHalfExtents && entity.colliderHalfExtents.length === 3) {
        [hx, hy, hz] = entity.colliderHalfExtents;
      } else if (entity.collision && entity.collision.halfExtents) {
        const he = entity.collision.halfExtents;
        hx = he.x; hy = he.y; hz = he.z;
      } else if (entity.modelPath && io) {
        // Attempt to auto-detect bounds from model file
        const modelFile = entity.modelPath.split('/').pop();
        let bounds = colliderCache[modelFile + ':boxBounds'];
        if (!bounds) {
          const path = require('path');
          const document = await io.read(path.join(process.cwd(), 'client', 'assets', 'models', modelFile));
          let min = [Infinity, Infinity, Infinity];
          let max = [-Infinity, -Infinity, -Infinity];
          document.getRoot().listMeshes().forEach(mesh => {
            mesh.listPrimitives().forEach(prim => {
              const pos = prim.getAttribute('POSITION').getArray();
              for (let i = 0; i < pos.length; i += 3) {
                min[0] = Math.min(min[0], pos[i]);
                min[1] = Math.min(min[1], pos[i+1]);
                min[2] = Math.min(min[2], pos[i+2]);
                max[0] = Math.max(max[0], pos[i]);
                max[1] = Math.max(max[1], pos[i+1]);
                max[2] = Math.max(max[2], pos[i+2]);
              }
            });
          });
          hx = (max[0] - min[0]) / 2;
          hy = (max[1] - min[1]) / 2;
          hz = (max[2] - min[2]) / 2;
          bounds = [hx, hy, hz];
          colliderCache[modelFile + ':boxBounds'] = bounds;
        } else {
          [hx, hy, hz] = bounds;
        }
      } else if (entity.scale) {
        hx = hy = hz = entity.scale / 2;
      } else {
        hx = hy = hz = 0.5;
      }
      // Always write the computed half extents back to entity.colliderHalfExtents (Colyseus ArraySchema compatible)
      if (entity.colliderHalfExtents && typeof entity.colliderHalfExtents.length === 'number') {
        entity.colliderHalfExtents.length = 0;
        entity.colliderHalfExtents.push(hx, hy, hz);
      }
      // Also attach the computed half extents to the shape for further use if needed
      const shape = new Ammo.btBoxShape(new Ammo.btVector3(hx, hy, hz));
      shape._computedHalfExtents = [hx, hy, hz]; // For server-side access if needed
      return shape;
    }
    case 'mesh': {
      if (!io) throw new Error('io (NodeIO) required for mesh colliders');
      if (!entity.modelPath) throw new Error('modelPath required for mesh colliders');
      const modelFile = entity.modelPath.split('/').pop();
      let meshData = colliderCache[modelFile];
      if (!meshData) {
        // Load and cache mesh triangles
        const document = await io.read(require('path').join(process.cwd(), 'client', 'assets', 'models', modelFile));
        const triMesh = new Ammo.btTriangleMesh();
        document.getRoot().listMeshes().forEach(mesh => {
          mesh.listPrimitives().forEach(prim => {
            const pos = prim.getAttribute('POSITION').getArray();
            const idx = prim.getIndices().getArray();
            for (let i = 0; i < idx.length; i += 3) {
              const a = idx[i] * 3, b = idx[i+1] * 3, c = idx[i+2] * 3;
              triMesh.addTriangle(
                new Ammo.btVector3(pos[a], pos[a+1], pos[a+2]),
                new Ammo.btVector3(pos[b], pos[b+1], pos[b+2]),
                new Ammo.btVector3(pos[c], pos[c+1], pos[c+2]),
                true
              );
            }
          });
        });
        meshData = triMesh;
        colliderCache[modelFile] = triMesh;
      }
      return new Ammo.btBvhTriangleMeshShape(meshData, true, true);
    }
    default:
      throw new Error('Unknown colliderType: ' + entity.colliderType);
  }
}

module.exports = { createColliderForEntity };
