// Resolves `--engine <path>` to an engine, runs the EngineVerifier on the quests the command line asked for, and logs timings.
import { homedir } from "node:os";
import { resolve } from "node:path";

import type { ContentProblem } from "../../../src/shared/types/content";
import { createEngineLocator } from "../../../src/main/services/unreal/createEngineLocator";
import { createUnrealPlatform } from "../../../src/main/services/unreal/createUnrealPlatform";
import { NodeCommandRunner } from "../../../src/main/services/unreal/NodeCommandRunner";
import type { VerifierOptions } from "../parseVerifierArguments";
import type { VerifierResult } from "../runVerifier";

import { EngineVerifier, type EngineReport } from "./EngineVerifier";

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

	const verifier = new EngineVerifier({ target: { root: engine.path, version: engine.version, paths: platform.paths }, templateFolder: TEMPLATE_FOLDER, solutionsFolder: options.solutionsFolder, log });
	const report = await verifier.verify(result.input.quests, scopeOf(options, result));

	log(`engine: ${report.questsChecked} quests; first build ${report.timings.firstBuildSeconds} s, solution tests ${report.timings.solutionTestsSeconds} s, starter checks ${report.timings.starterChecksSeconds} s`);

	if (report.keptSandbox !== undefined) log(`engine: something failed; the sandbox copy is kept at ${report.keptSandbox}`);

	return { problems: report.problems, report };
}
