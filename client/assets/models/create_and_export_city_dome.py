import bpy
import os

def create_and_export_city_dome(radius):
    # Remove all objects for a clean scene
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

    # Add a UV sphere with the specified radius at the world origin (center at 0,0,0)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=(0, 0, 0), segments=64, ring_count=32)
    dome = bpy.context.active_object
    dome.name = f"city_dome_{radius}"

    # Do NOT move the sphere up; leave its center at (0,0,0) for half-above, half-below ground
    bpy.context.view_layer.objects.active = dome
    dome.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Hide all other objects for export (should only be one, but just in case)
    for obj in bpy.data.objects:
        if obj != dome:
            obj.hide_render = True
            obj.hide_viewport = True

    # Use the full absolute export path (Windows safe)
    export_dir = r"C:/Users/Garrett/Documents/3D AI Game backup/client/assets/models"
    os.makedirs(export_dir, exist_ok=True)
    export_path = os.path.join(export_dir, f"city_dome_{radius}.glb")
    bpy.ops.export_scene.gltf(filepath=export_path, export_apply=True)
    print(f"Exported city dome to {export_path}")

    # Unhide all after export (cleanup)
    for obj in bpy.data.objects:
        obj.hide_render = False
        obj.hide_viewport = False

# Example usage: create_and_export_city_dome(500)
# To use: open in Blender Scripting, set the radius, and run the script.
