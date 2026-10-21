// The two settings the pipeline needs between calls: the engine folder and the sandbox folder.
import type { SandboxPathStore } from "./SandboxPathStore";

/** Reads and saves the engine and sandbox folders, behind an interface until the settings service exists (A186, A400). */
export interface UnrealSettingsStore extends SandboxPathStore
{
	/** The engine root folder used for the sandbox, or null before setup. */
	getEnginePath(): string | null;

	/** The sandbox project folder, or null before setup. */
	getSandboxPath(): string | null;
}
