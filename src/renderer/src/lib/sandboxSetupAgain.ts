// What Settings' "Set up the sandbox again" (M5.1k) shows around its button: why it is off, whether the sandbox looks gone, and the folder that held it. Pure, so it is unit tested.
import type { EnvironmentStatus } from "@shared/types/engine";
import type { Settings } from "@shared/types/settings";

/** Why the button is off, or null when a new sandbox can be set up now. The new sandbox is built with the engine in Settings, so it needs one that works. */
export function setupAgainBlocker(environment: EnvironmentStatus | undefined): string | null
{
	if (environment === undefined) return "Checking the engine first.";

	if (environment.engine === null) return "Pick a working engine above first. The new sandbox is built with it.";

	return null;
}

/** True when Settings names a sandbox folder but the environment says it holds no built project: it may have been moved or deleted, or its first build failed. */
export function sandboxLooksMissing(settings: Pick<Settings, "sandboxPath">, environment: EnvironmentStatus | undefined): boolean
{
	return settings.sandboxPath !== null && environment !== undefined && !environment.sandbox.ready;
}

/** The folder that holds a sandbox folder (the one the learner picked at setup), or null for a bare name with no separator. Works with both slash styles; a folder right under the POSIX root has `/` as its parent. */
export function parentFolderOf(sandboxPath: string): string | null
{
	const trimmed = sandboxPath.replace(/[\\/]+$/, "");
	const lastSeparator = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));

	if (lastSeparator < 0) return null;

	if (lastSeparator === 0) return trimmed[0] === "/" ? "/" : null;

	const parent = trimmed.slice(0, lastSeparator);

	// A Windows drive root keeps its separator: C:\ rather than C:.
	return /^[A-Za-z]:$/.test(parent) ? `${parent}${trimmed[lastSeparator]}` : parent;
}
