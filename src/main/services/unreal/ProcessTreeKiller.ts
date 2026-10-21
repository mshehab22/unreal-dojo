// Kills a process and its children, which differs between Windows and macOS.

/** Kills a process tree by the root process id. */
export interface ProcessTreeKiller
{
	/** True when processes must start in their own process group so the group can be killed at once (macOS). */
	readonly startsOwnProcessGroup: boolean;

	/** Kills the process with this id and everything it started. Never throws. */
	killTree(processId: number): void;
}
