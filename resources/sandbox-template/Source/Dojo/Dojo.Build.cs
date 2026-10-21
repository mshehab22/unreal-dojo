using System.IO;
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

		// Each quest folder is an include path too, so tests and later quests include a quest header by its bare name, for example "SampleHealthComponent.h".
		string QuestsDirectory = Path.Combine(ModuleDirectory, "Quests");
		if (Directory.Exists(QuestsDirectory))
		{
			foreach (string QuestDirectory in Directory.GetDirectories(QuestsDirectory))
			{
				PublicIncludePaths.Add(QuestDirectory);
			}
		}
	}
}
