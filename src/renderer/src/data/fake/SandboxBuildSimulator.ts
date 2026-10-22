// Plays a believable first sandbox build as progress events: copy the template, then a full UBT build with a line counter.
import type { AppError } from "@shared/types/errors";
import type { BuildPhase, BuildProgressEvent } from "@shared/types/run";

/** One step of the simulated build. */
interface SimulatedStep
{
	phase: BuildPhase;
	lastLine: string;
	percent?: number;
}

/** How many compile actions the simulated build reports. */
const ACTION_COUNT = 418;

/** Real milliseconds between events. */
const TICK_MS = 220;

/** Reported elapsed time grows this much faster than real time, so a few seconds read like a real first build. */
const TIME_SCALE = 45;

/** The steps of a successful first build, in order. */
function successSteps(engineVersion: string): SimulatedStep[]
{
	const steps: SimulatedStep[] = [
		{ phase: "preparing", lastLine: "Copying the sandbox template", percent: 2 },
		{ phase: "preparing", lastLine: `Writing EngineAssociation ${engineVersion}`, percent: 4 },
		{ phase: "preparing", lastLine: "Generating project files", percent: 6 },
	];

	const modules = ["DojoSandbox.init.gen.cpp", "Module.DojoSandbox.cpp", "DojoGameMode.cpp", "DojoTestActor.cpp", "Module.DojoQuests.cpp", "DojoQuestsTests.cpp"];

	for (let step = 1; step <= 12; step++)
	{
		const action = Math.round((ACTION_COUNT * step) / 12);
		const file = modules[step % modules.length] ?? "Module.cpp";
		steps.push({ phase: "building", lastLine: `[${action}/${ACTION_COUNT}] Compile ${file}`, percent: 6 + Math.round((88 * step) / 12) });
	}

	steps.push({ phase: "building", lastLine: `[${ACTION_COUNT}/${ACTION_COUNT}] Link UnrealEditor-DojoSandbox`, percent: 97 });
	steps.push({ phase: "parsing", lastLine: "Build succeeded", percent: 100 });

	return steps;
}

/** The steps of a first build that fails part way through. */
function failureSteps(engineVersion: string): SimulatedStep[]
{
	return successSteps(engineVersion).slice(0, 9).concat([{ phase: "building", lastLine: "DojoTestActor.cpp(14): error C2065: 'UStaticMeshComponent': undeclared identifier", percent: 52 }]);
}

/** The filtered compiler output of the failing build. */
export const FAILED_BUILD_OUTPUT = [
	"DojoTestActor.cpp(14): error C2065: 'UStaticMeshComponent': undeclared identifier",
	"DojoTestActor.cpp(14): note: missing #include \"Components/StaticMeshComponent.h\"",
	"Result: Failed (OtherCompilationError)",
].join("\n");

/** A silent pause after a number of steps, like UBT waiting for another build's mutex with no output. */
export interface BuildStall
{
	afterSteps: number;
	milliseconds: number;
}

/** What one simulated build ended with. */
export interface SimulatedBuildEnd
{
	ok: boolean;
	durationMs: number;
}

/** Runs one simulated build: emits events on a timer and resolves when done, or rejects with `run-cancelled`. */
export class SandboxBuildSimulator
{
	private timer: ReturnType<typeof setTimeout> | null = null;
	private rejectRun: ((error: AppError) => void) | null = null;

	constructor(
		private readonly runId: string,
		private readonly emit: (event: BuildProgressEvent) => void,
	)
	{
	}

	/** Starts the build and resolves with how it ended, pausing silently once when a stall is given. */
	run(engineVersion: string, shouldFail: boolean, stall: BuildStall | null = null): Promise<SimulatedBuildEnd>
	{
		const steps = shouldFail ? failureSteps(engineVersion) : successSteps(engineVersion);

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
					resolve({ ok: !shouldFail, durationMs: elapsedMs });
					return;
				}

				this.emit({ runId: this.runId, phase: step.phase, elapsedMs, lastLine: step.lastLine, ...(step.percent === undefined ? {} : { percent: step.percent }), ...(index === 0 ? { loop: "headless" as const, loopReason: "first build of a new sandbox" } : {}) });
				index += 1;
				this.timer = setTimeout(tick, stall && index === stall.afterSteps ? stall.milliseconds : TICK_MS);
			};

			tick();
		});
	}

	/** Stops the build; the run's promise rejects with `run-cancelled`. */
	cancel(): void
	{
		if (this.timer) clearTimeout(this.timer);

		this.timer = null;
		this.rejectRun?.({ code: "run-cancelled", message: "The sandbox build was cancelled.", suggestedAction: "Start it again when you are ready." });
	}
}
