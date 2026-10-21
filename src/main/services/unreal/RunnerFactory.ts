// Chooses the loop for a run: the headless loop alone, or the loop-selecting runner once the fast loop pieces are given (M1.4).
import { LoopSelectingRunner, type FastLoopDependencies } from "./LoopSelectingRunner";
import type { IRunner, RunnerContext } from "./Runner";

/** Makes the headless runner for a context. */
export type HeadlessRunnerMaker = (context: RunnerContext) => IRunner;

/** Hands out the runner for each run. Without fast loop pieces every run is headless; with them each run picks its loop when it starts (A45 on macOS, Live Coding on Windows). */
export class RunnerFactory
{
	private readonly makeHeadlessRunner: HeadlessRunnerMaker;
	private readonly fastLoop: FastLoopDependencies | null;

	/** Takes the function that builds a headless runner and, optionally, the shared fast loop pieces. */
	constructor(makeHeadlessRunner: HeadlessRunnerMaker, fastLoop: FastLoopDependencies | null = null)
	{
		this.makeHeadlessRunner = makeHeadlessRunner;
		this.fastLoop = fastLoop;
	}

	/** The runner for this context. */
	forContext(context: RunnerContext): IRunner
	{
		const headlessRunner = this.makeHeadlessRunner(context);

		return this.fastLoop ? new LoopSelectingRunner(context, headlessRunner, this.fastLoop) : headlessRunner;
	}
}
