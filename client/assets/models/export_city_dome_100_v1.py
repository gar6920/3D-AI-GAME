import bpy
import os

# Move the dome sphere up by its radius and export as GLB
def export_city_dome():
    # Find the dome sphere by name
    dome = bpy.data.objects.get('city_dome_100_v1')
    if not dome:
        print('city_dome_100_v1 not found in the scene!')
        return
    
    # Move the sphere up by its radius (50 units)
    dome.location.z += 50
    bpy.context.view_layer.objects.active = dome
    dome.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    print('Moved city_dome_100_v1 up by its radius (50 units) and applied transforms.')

    # Deselect all objects
    bpy.ops.object.select_all(action='DESELECT')
    dome.select_set(True)
    bpy.context.view_layer.objects.active = dome

    # Hide all other objects for export
    for obj in bpy.data.objects:
        if obj != dome:
            obj.hide_render = True
            obj.hide_viewport = True

    export_path = r"C:/Users/Garrett/Documents/3D AI Game backup/client/assets/models/city_dome_100_v1.glb"
    bpy.ops.export_scene.gltf(filepath=export_path, export_apply=True)
    print(f"Exported city dome to {export_path}")

    # Unhide all after export (cleanup)
    for obj in bpy.data.objects:
        obj.hide_render = False
        obj.hide_viewport = False

# Run the export
export_city_dome()
