using UnrealBuildTool;
using System.Collections.Generic;

// Editor target for the Dojo sandbox. This is the target the app builds before running automation tests.
public class DojoEditorTarget : TargetRules
{
	public DojoEditorTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Editor;
		DefaultBuildSettings = BuildSettingsVersion.Latest;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.Add("Dojo");
	}
}
