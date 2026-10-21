// Settings: placeholder until the settings task.
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

/** Engine, sandbox, loop mode, and review provider settings. */
export function SettingsScreen()
{
	return (
		<PlaceholderScreen
			testId="screen-settings"
			index={6}
			title="Settings"
			summary="Where the engine and sandbox live, how builds run, and who reviews your code."
			upcoming={[
				"Engine and sandbox paths",
				"Loop mode: auto, fast, headless",
				"Review provider and model",
				"API key, stored encrypted",
				"Rebuild sandbox",
				"Reset progress, with confirmation",
			]}
		/>
	);
}
