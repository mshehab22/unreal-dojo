// Chooses the loop for a run. Returns the headless loop until the fast loop lands in M1.4.
import type { IRunner, RunnerContext } from "./Runner";

/** Makes the headless runner for a context. */
export type HeadlessRunnerMaker = (context: RunnerContext) => IRunner;

/** Picks the runner for each run. M1.4 adds the editor checks (A45 on macOS, Live Coding on Windows) here. */
export class RunnerFactory
{
	private readonly makeHeadlessRunner: HeadlessRunnerMaker;

	/** Takes the function that builds a headless runner. */
	constructor(makeHeadlessRunner: HeadlessRunnerMaker)
	{
		this.makeHeadlessRunner = makeHeadlessRunner;
	}

	/** The runner for this context; always headless for now. */
	forContext(context: RunnerContext): IRunner
	{
		return this.makeHeadlessRunner(context);
	}
}
