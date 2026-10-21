// Where the sandbox service remembers the sandbox and its engine, behind an interface until the settings service exists.

/** Saves the sandbox folder and the engine it was built with into the learner's settings. */
export interface SandboxPathStore
{
	/** Records the sandbox project folder (the one that contains `Dojo.uproject`). */
	setSandboxPath(sandboxPath: string): void;

	/** Records the engine root folder the sandbox was created with, so later runs build with the same engine. */
	setEnginePath(enginePath: string): void;
}
