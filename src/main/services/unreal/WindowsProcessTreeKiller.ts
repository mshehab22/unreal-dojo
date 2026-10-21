// Kills a process tree on Windows with taskkill.
import type { ProcessTreeKiller } from "./ProcessTreeKiller";

/** ProcessTreeKiller for Windows: `taskkill /PID <id> /T /F` ends the process and every child it started. */
export class WindowsProcessTreeKiller implements ProcessTreeKiller
{
	readonly startsOwnProcessGroup = false;

	private readonly startDetached: (command: string, commandArguments: string[]) => void;

	/** Takes a fire-and-forget spawn function so tests can record the command line. */
	constructor(startDetached: (command: string, commandArguments: string[]) => void)
	{
		this.startDetached = startDetached;
	}

	/** Runs taskkill for the tree; failures (already exited) are ignored. */
	killTree(processId: number): void
	{
		try
		{
			this.startDetached("taskkill", ["/PID", String(processId), "/T", "/F"]);
		}
		catch
		{
			// Already gone.
		}
	}

	/** Runs taskkill without `/F`, which asks the process's windows to close instead of ending it. */
	requestExit(processId: number): void
	{
		try
		{
			this.startDetached("taskkill", ["/PID", String(processId), "/T"]);
		}
		catch
		{
			// Already gone.
		}
	}
}
