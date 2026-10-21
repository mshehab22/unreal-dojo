// Plays a quest Run or Submit as progress events (write files, build, launch, test, and for Submit a review), then answers the fake engine's verdict.
import type { AppError } from "@shared/types/errors";
import type { BuildPhase, BuildProgressEvent } from "@shared/types/run";

/** One step of a simulated quest run. */
interface RunStep
{
	phase: BuildPhase;
	lastLine: string;
	percent: number;
}

/** Real milliseconds between events. */
const TICK_MS = 160;

/** Reported elapsed time grows this much faster than real time, so a short run reads like a headless build. */
const TIME_SCALE = 12;

/** The steps of a quest run; a Submit adds the review step. */
function runSteps(questId: string, includesReview: boolean): RunStep[]
{
	const steps: RunStep[] = [
		{ phase: "preparing", lastLine: "Headless loop: the editor is not open", percent: 4 },
		{ phase: "writing", lastLine: `Writing Quests/${questId}/`, percent: 10 },
		{ phase: "building", lastLine: "[1/4] Compile Module.Dojo.cpp", percent: 30 },
		{ phase: "building", lastLine: "[3/4] Compile quest sources", percent: 50 },
		{ phase: "building", lastLine: "[4/4] Link UnrealEditor-Dojo", percent: 62 },
		{ phase: "launching", lastLine: "Starting UnrealEditor-Cmd for the automation tests", percent: 72 },
		{ phase: "testing", lastLine: `RunTests Dojo.${questId}`, percent: 84 },
		{ phase: "parsing", lastLine: "Reading the test report", percent: includesReview ? 90 : 100 },
	];

	if (includesReview) steps.push({ phase: "reviewing", lastLine: "The mentor is reading your code", percent: 97 });

	return steps;
}

/** Runs one simulated quest run: emits events on a timer and resolves with the elapsed time, or rejects with `run-cancelled`. */
export class QuestRunSimulator
{
	private timer: ReturnType<typeof setTimeout> | null = null;
	private rejectRun: ((error: AppError) => void) | null = null;

	constructor(
		private readonly runId: string,
		private readonly emit: (event: BuildProgressEvent) => void,
	)
	{
	}

	/** Plays the steps; a build that will not compile stops after the build step. Resolves with the reported duration. */
	run(questId: string, includesReview: boolean, compiles: boolean): Promise<number>
	{
		const allSteps = runSteps(questId, includesReview);
		const steps = compiles ? allSteps : allSteps.filter((step) => step.phase === "preparing" || step.phase === "writing" || step.phase === "building");

		return new Promise((resolve, reject) =>
		{
			this.rejectRun = reject;
			let index = 0;

			const tick = (): void =>
			{
				const step = steps[index];
				const elapsedMs = (index + 1) * TICK_MS * TIME_SCALE;

				if (!step)
				{
					this.timer = null;
					resolve(elapsedMs);
					return;
				}

				this.emit({ runId: this.runId, phase: step.phase, elapsedMs, lastLine: step.lastLine, percent: step.percent, ...(index === 0 ? { loop: "headless" as const, loopReason: "the editor is not open" } : {}) });
				index += 1;
				this.timer = setTimeout(tick, TICK_MS);
			};

			tick();
		});
	}

	/** Stops the run; its promise rejects with `run-cancelled`. */
	cancel(): void
	{
		if (this.timer) clearTimeout(this.timer);

		this.timer = null;
		this.rejectRun?.({ code: "run-cancelled", message: "The run was cancelled.", suggestedAction: "Run it again when you are ready." });
	}
}
