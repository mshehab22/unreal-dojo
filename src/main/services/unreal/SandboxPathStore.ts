// Where the sandbox service remembers the sandbox folder, behind an interface until the settings service exists.

/** Saves the sandbox folder into the learner's settings. */
export interface SandboxPathStore
{
	/** Records the sandbox project folder (the one that contains `Dojo.uproject`). */
	setSandboxPath(sandboxPath: string): void;
}
