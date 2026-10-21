// How the settings service checks the folders it is asked to keep, behind an interface so tests need no engine or disk.
import type { EngineInstall } from "@shared/types/engine";

/** The two folder checks settings need before trusting a path. */
export interface SettingsChecks
{
	/** Reads an engine folder (the root or its `Engine` folder); throws the locator's `engine-not-found` or `engine-version-unsupported`. */
	inspectEngine(folder: string): Promise<EngineInstall>;

	/** Tells whether a folder holds the sandbox project file `Dojo.uproject`. */
	isSandboxProject(folder: string): Promise<boolean>;
}
