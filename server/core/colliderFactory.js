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
      const radius = entity.colliderRadius || entity.scale || 1;
      return new Ammo.btSphereShape(radius);
    }
    case 'box': {
      let hx, hy, hz;
      if (entity.colliderHalfExtents && entity.colliderHalfExtents.length === 3) {
        [hx, hy, hz] = entity.colliderHalfExtents;
      } else if (entity.collision && entity.collision.halfExtents) {
        const he = entity.collision.halfExtents;
        hx = he.x; hy = he.y; hz = he.z;
      } else if (entity.scale) {
        hx = hy = hz = entity.scale / 2;
      } else {
        hx = hy = hz = 0.5;
      }
      return new Ammo.btBoxShape(new Ammo.btVector3(hx, hy, hz));
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
