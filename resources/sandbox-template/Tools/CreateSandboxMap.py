# Creates the empty sandbox map /Game/Dojo/Maps/L_Sandbox. Run once with the editor's Python commandlet; see docs/systems/unreal-pipeline.md.
import unreal

MAP_PATH = "/Game/Dojo/Maps/L_Sandbox"

if unreal.EditorAssetLibrary.does_asset_exist(MAP_PATH):
    unreal.log("L_Sandbox map already exists")
else:
    subsystem = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    if subsystem.new_level(MAP_PATH):
        subsystem.save_current_level()
        unreal.log("L_Sandbox map created")
    else:
        unreal.log_error("L_Sandbox map could not be created")
