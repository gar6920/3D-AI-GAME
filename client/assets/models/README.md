# Model Asset Documentation

## Implementation: default

| Model | Instances | Roles | File Size | Tris | Verts | Anims | Max Bones | Morph Targets |
|-------|-----------|-------|----------|------|-------|-------|-----------|--------------|
| robokeeper1.glb | 2 | NPC | 4.04 MB | 110640 | 70868 | 6 | 65 | 0 |
| hover_cube.glb | 52 | NPC, Structure | 1.71 KB | 12 | 24 | 0 | 0 | 0 |
| robot_shark1.glb | 5 | NPC | 4.83 MB | 134948 | 81942 | 0 | 0 | 0 |
| data_center_low-poly.glb | 1 | Structure | 1.36 MB | 22802 | 37709 | 0 | 0 | 0 |
| house.glb | 1 | Structure | 2.31 KB | 18 | 40 | 0 | 0 | 0 |

**Totals for 'default':**
- Total Model Files Used: 5
- Total Instances: 61
- Total File Size: 10.24 MB
- Total Poly Count: 919464
- Total Vertex Count: 590443
- Total Animations: 12

---

# Individual Model Details

## data_center_low-poly.glb
* File Size: 1.36 MB
* Triangles: 22802
* Vertices: 37709
* Animations: 0
* Max Animation Channels: 0
* Max Bones: 0
* Morph Targets: 0

## free_merc_hovercar.glb
* File Size: 4.03 MB
* Triangles: 34539
* Vertices: 32224
* Animations: 0
* Max Animation Channels: 0
* Max Bones: 0
* Morph Targets: 0

## house.glb
* File Size: 2.31 KB
* Triangles: 18
* Vertices: 40
* Animations: 0
* Max Animation Channels: 0
* Max Bones: 0
* Morph Targets: 0

## hover_cube.glb
* File Size: 1.71 KB
* Triangles: 12
* Vertices: 24
* Animations: 0
* Max Animation Channels: 0
* Max Bones: 0
* Morph Targets: 0

## human_man.glb
* File Size: 4.34 MB
* Triangles: 10220
* Vertices: 5828
* Animations: 15
* Max Animation Channels: 204
* Max Bones: 68
* Morph Targets: 0

## robokeeper1.glb
* File Size: 4.04 MB
* Triangles: 110640
* Vertices: 70868
* Animations: 6
* Max Animation Channels: 195
* Max Bones: 65
* Morph Targets: 0

## robot_shark1.glb
* File Size: 4.83 MB
* Triangles: 134948
* Vertices: 81942
* Animations: 0
* Max Animation Channels: 0
* Max Bones: 0
* Morph Targets: 0


---
**Performance Budget Guidance:**
- Try to keep total poly count under 100,000 and total animation clips under 20 per implementation for optimal browser performance.
- Models with >10 animations, >50k tris, or >50k verts may need optimization.
