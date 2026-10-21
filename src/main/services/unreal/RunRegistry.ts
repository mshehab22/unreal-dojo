// Tracks running operations by the renderer's run id so `cancelRun` can stop them.
import { AppErrorException } from "../../errors/AppErrorException";

/** One abort controller per running operation. */
export class RunRegistry
{
	private readonly controllers = new Map<string, AbortController>();

	/** Registers a run and returns its cancel signal. Throws `run-already-exists` for a run id in use. */
	begin(runId: string): AbortSignal
	{
		if (this.controllers.has(runId)) throw new AppErrorException("run-already-exists", "That run is already going.", "Wait for it to finish or cancel it first.", runId);

		const controller = new AbortController();
		this.controllers.set(runId, controller);

		return controller.signal;
	}

	/** Forgets a finished run. */
	end(runId: string): void
	{
		this.controllers.delete(runId);
	}

	/** Cancels a running operation. Throws `run-not-found` when nothing with that id is running. */
	cancel(runId: string): void
	{
		const controller = this.controllers.get(runId);
		if (!controller) throw new AppErrorException("run-not-found", "There is no running build or test with that id.", "It may have finished already.", runId);

		controller.abort();
	}
}
