// Resolves `--engine <path>` to an engine, runs the EngineVerifier on the quests the command line asked for, and logs timings.
import { homedir } from "node:os";
import { resolve } from "node:path";

import type { ContentProblem } from "../../../src/shared/types/content";
import { createEngineLocator } from "../../../src/main/services/unreal/createEngineLocator";
import { createUnrealPlatform } from "../../../src/main/services/unreal/createUnrealPlatform";
import { AutomationTestRunner } from "../../../src/main/services/unreal/AutomationTestRunner";
import { NodeCommandRunner } from "../../../src/main/services/unreal/NodeCommandRunner";
import { NodeProcessLauncher } from "../../../src/main/services/unreal/NodeProcessLauncher";
import { NodeSandboxFileSystem } from "../../../src/main/services/unreal/NodeSandboxFileSystem";
import { QuestFileWriter } from "../../../src/main/services/unreal/QuestFileWriter";
import { SYSTEM_TIMER } from "../../../src/main/services/unreal/SupervisedProcess";
import { UnrealBuilder } from "../../../src/main/services/unreal/UnrealBuilder";
import type { VerifierOptions } from "../parseVerifierArguments";
import type { VerifierResult } from "../runVerifier";

import type { UnrealTools } from "./EngineSandbox";
import { EngineVerifier, type EngineReport } from "./EngineVerifier";
import { resolveWorkspaceRoot } from "./workspaceLocation";

/** The sandbox template the app ships (unreal-pipeline spec). */
const TEMPLATE_FOLDER = resolve(import.meta.dirname, "..", "..", "..", "resources", "sandbox-template");

/** The quest ids `--pack` and `--quest` narrow the engine stage to, or undefined for every quest. */
function scopeOf(options: VerifierOptions, result: VerifierResult): Set<string> | undefined
{
	if (options.questId !== undefined) return new Set([options.questId]);
	if (options.packId !== undefined) return new Set(result.input.quests.filter((record) => record.packId === options.packId).map((record) => record.quest.id));

	return undefined;
}

/**
 * Runs the engine stage. A path that is not a supported engine becomes one problem instead of a crash. Progress goes
 * to `log`; the returned problems are merged into the report by the caller.
 */
export async function runEngineStage(enginePath: string, options: VerifierOptions, result: VerifierResult, log: (line: string) => void): Promise<{ problems: ContentProblem[]; report?: EngineReport }>
{
	const platform = createUnrealPlatform({ platform: process.platform, homeFolder: homedir(), environment: process.env, commandRunner: new NodeCommandRunner() });

	if (platform === null) return { problems: [{ file: "(engine)", message: `--engine is not supported on ${process.platform}` }] };

	let engine;

	try
	{
		engine = await createEngineLocator().inspectFolder(resolve(enginePath.replace(/^~(?=$|\/)/, homedir())));
	}
	catch (error)
	{
		return { problems: [{ file: "(engine)", message: `--engine ${enginePath}: ${error instanceof Error ? error.message : String(error)}` }] };
	}

	log(`engine: Unreal Engine ${engine.version} at ${engine.path}`);

	// Wired the way createUnrealServices wires them for the app, so the verifier and the Build screen run Unreal identically (A211).
	const fileSystem = new NodeSandboxFileSystem();
	const launcher = new NodeProcessLauncher(platform.processTreeKiller);
	const tools: UnrealTools = {
		paths: platform.paths,
		builder: new UnrealBuilder(platform.paths, launcher, SYSTEM_TIMER),
		testRunner: new AutomationTestRunner(platform.paths, launcher, SYSTEM_TIMER, fileSystem),
		writer: new QuestFileWriter(platform.paths, fileSystem),
	};
	const controller = new AbortController();
	const stopOnSignal = (): void =>
	{
		if (!controller.signal.aborted) log("engine: stopping; killing the build or editor and releasing the verify workspace");
		controller.abort();
	};

	// Ctrl+C or a SIGTERM aborts the run, which kills UBT or the editor through the runners' tree kill (A440).
	process.on("SIGINT", stopOnSignal);
	process.on("SIGTERM", stopOnSignal);

	const verifier = new EngineVerifier({ target: { root: engine.path, version: engine.version, tools }, templateFolder: TEMPLATE_FOLDER, solutionsFolder: options.solutionsFolder, log, signal: controller.signal, workspaceRoot: resolveWorkspaceRoot({ ...(options.workspaceFolder === undefined ? {} : { flag: options.workspaceFolder }), platform: process.platform, homeFolder: homedir(), environment: process.env }) });
	const report = await verifier.verify(result.input.quests, scopeOf(options, result)).finally(() =>
	{
		process.off("SIGINT", stopOnSignal);
		process.off("SIGTERM", stopOnSignal);
	});

	log(`engine: ${report.questsChecked} quests; first build ${report.timings.firstBuildSeconds} s, solution tests ${report.timings.solutionTestsSeconds} s, own-solution checks ${report.timings.ownSolutionChecksSeconds} s, starter checks ${report.timings.starterChecksSeconds} s`);

	if (report.logsFolder !== undefined) log(`engine: build and test logs of this run are in ${report.logsFolder} (the last few runs are kept)`);

	return { problems: report.problems, report };
}
