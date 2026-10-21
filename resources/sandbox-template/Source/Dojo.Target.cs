using UnrealBuildTool;
using System.Collections.Generic;

// Game target for the Dojo sandbox. Settings track the installed engine so one template builds on UE 5.4 to 5.8.
public class DojoTarget : TargetRules
{
	public DojoTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Game;
		DefaultBuildSettings = BuildSettingsVersion.Latest;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.Add("Dojo");
	}
}
