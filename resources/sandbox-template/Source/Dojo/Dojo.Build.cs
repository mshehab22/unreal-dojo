using UnrealBuildTool;

// Module rules for Dojo: the single module that holds learner quest code, quest tests, and test support helpers.
public class Dojo : ModuleRules
{
	public Dojo(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

		PublicDependencyModuleNames.AddRange(new string[] { "Core", "CoreUObject", "Engine", "InputCore", "EnhancedInput", "UMG", "GameplayTags", "AIModule", "NavigationSystem" });

		// Quest code includes paths from the module root, for example "Support/DojoTestWorld.h".
		PublicIncludePaths.Add(ModuleDirectory);
	}
}
