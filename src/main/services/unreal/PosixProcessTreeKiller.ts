// Kills a process tree on macOS by signalling its process group.
import type { ProcessTreeKiller } from "./ProcessTreeKiller";

/** ProcessTreeKiller for macOS. Each process starts as the leader of its own group, so one SIGKILL to the negative id reaches UBT, clang, and the editor's helpers alike. */
export class PosixProcessTreeKiller implements ProcessTreeKiller
{
	readonly startsOwnProcessGroup = true;

	private readonly sendSignal: (processId: number, signal: NodeJS.Signals) => void;

	/** Takes the signal function (`process.kill` in the app) so tests can record the calls. */
	constructor(sendSignal: (processId: number, signal: NodeJS.Signals) => void)
	{
		this.sendSignal = sendSignal;
	}

	/** Sends SIGKILL to the whole group, and to the process itself in case the group is already gone. */
	killTree(processId: number): void
	{
		for (const target of [-processId, processId])
		{
			try
			{
				this.sendSignal(target, "SIGKILL");
			}
			catch
			{
				// Already gone.
			}
		}
	}
}
