Purpose:
- Create colliders on the fly for all added entities
- Create meshes on the fly for all added entities
- Meshes are used for raycasting selection by client

CurrentStatus (human description - AI NEVER WRITE THIS):
- collider factory looks at all structures, NPCS, Players and creates colliders for them.  These are passed to the client and meshes are created for them which are used for selection.  The colliderfactory can take as input sphere, box, or mesh
- having issues with scale (the house model is way bigger than the collider mesh)

CurrentStatus (AI DESCRIPTION):



Areas for improvement:
- Fix the scale issue
add support for collider type "mesh" collider-mesh which is what the dome uses