// Engine smoke check: creates a sandbox from the template in a temp folder, builds it, runs Dojo.Sample.Health headless, and prints timings.
// Usage: npx tsx tools/qa/engine-smoke.ts [--engine <engine root>] [--keep]
// Every Unreal process goes through the app's own services (A63): SandboxProjectService copies and builds, AutomationTestRunner runs the test.
// Take the shared engine lock before running it on a machine where other sessions use Unreal. Exits with 1 when the build or the test fails.
import { appendFileSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { AutomationTestRunner, type TestRunOutcome } from "../../src/main/services/unreal/AutomationTestRunner";
import { createEngineLocator } from "../../src/main/services/unreal/createEngineLocator";
import { createUnrealPlatform } from "../../src/main/services/unreal/createUnrealPlatform";
import type { EngineLocator } from "../../src/main/services/unreal/EngineLocator";
import { NodeCommandRunner } from "../../src/main/services/unreal/NodeCommandRunner";
import { NodeProcessLauncher } from "../../src/main/services/unreal/NodeProcessLauncher";
import { NodeSandboxFileSystem } from "../../src/main/services/unreal/NodeSandboxFileSystem";
import type { ProgressUpdate } from "../../src/main/services/unreal/ProgressUpdate";
import { PROJECT_FILE_NAME, SandboxProjectService } from "../../src/main/services/unreal/SandboxProjectService";
import { SYSTEM_TIMER } from "../../src/main/services/unreal/SupervisedProcess";
import { UnrealBuilder } from "../../src/main/services/unreal/UnrealBuilder";
import type { EngineInstall } from "../../src/shared/types/engine";

/** The template's sandbox smoke test (docs/systems/unreal-pipeline.md). */
const SAMPLE_TEST = "Dojo.Sample.Health.TakesDamage";

/** Width of the step names in the timing table, long enough for the headless test line. */
const STEP_COLUMN_WIDTH = 40;

/** The command-line options. */
interface SmokeOptions
{
	enginePath: string | undefined;
	keepFolder: boolean;
}

/** The sandbox service and test runner, wired to the real disk and processes the way createUnrealServices does. */
interface SmokeServices
{
	sandboxService: SandboxProjectService;
	testRunner: AutomationTestRunner;
}

/** Reads `--engine <path>` and `--keep` from the command line. */
function parseOptions(commandArguments: string[]): SmokeOptions
{
	const engineIndex = commandArguments.indexOf("--engine");

	return {
		enginePath: engineIndex >= 0 ? commandArguments[engineIndex + 1] : undefined,
		keepFolder: commandArguments.includes("--keep"),
	};
}

/** The engine given with --engine, or the newest supported one the locator finds. */
async function chooseEngine(locator: EngineLocator, enginePath: string | undefined): Promise<EngineInstall>
{
	if (enginePath !== undefined) return locator.inspectFolder(enginePath);

	return locator.requireEngines().then((engines) => engines[0] as EngineInstall);
}

/** Builds the M1.3 services. createUnrealServices does not hand out the test runner, so the same pieces are put together here. */
function createSmokeServices(locator: EngineLocator): SmokeServices
{
	const platform = createUnrealPlatform({ platform: process.platform, homeFolder: homedir(), environment: process.env, commandRunner: new NodeCommandRunner() });

	if (!platform) throw new Error(`Unreal Engine is not supported on ${process.platform}.`);

	const { paths } = platform;
	const fileSystem = new NodeSandboxFileSystem();
	const launcher = new NodeProcessLauncher(platform.processTreeKiller);
	const builder = new UnrealBuilder(paths, launcher, SYSTEM_TIMER);

	// The smoke's sandbox is thrown away, so it is never remembered in the learner's settings.
	const pathStore = { setSandboxPath: (): void => undefined };
	const sandboxService = new SandboxProjectService({ paths, fileSystem, builder, engineInspector: locator, pathStore, timer: SYSTEM_TIMER, templateFolder: resolve("resources/sandbox-template") });

	return { sandboxService, testRunner: new AutomationTestRunner(paths, launcher, SYSTEM_TIMER, fileSystem) };
}

/** Seconds from milliseconds, to one decimal. */
function seconds(milliseconds: number): string
{
	return (Math.round(milliseconds / 100) / 10).toFixed(1);
}

/** Prints the last lines of a log, for a step that failed. */
function printTail(text: string, lineCount: number): void
{
	console.log(text.trimEnd().split("\n").slice(-lineCount).map((line) => `    ${line}`).join("\n"));
}

/** Prints the timing table and the test results. */
function printSummary(buildSeconds: string, buildOk: boolean, test: TestRunOutcome | null, totalMilliseconds: number, passed: boolean): void
{
	console.log("");
	const label = (text: string): string => text.padEnd(STEP_COLUMN_WIDTH);

	console.log(`${label("step")} seconds  result`);
	console.log(`${label("create and build sandbox")} ${buildSeconds.padStart(7)}  ${buildOk ? "ok" : "build failed"}`);
	console.log(`${label(`headless ${SAMPLE_TEST}`)} ${(test === null ? "-" : seconds(test.durationMs)).padStart(7)}  ${test === null ? "skipped (build failed)" : `exit ${String(test.exitCode)}`}`);
	console.log(`${label("total")} ${seconds(totalMilliseconds).padStart(7)}  ${passed ? "PASSED" : "FAILED"}`);

	if (test === null) return;

	console.log("");
	if (test.pipelineError) console.log(`pipeline problem: ${test.pipelineError}`);

	for (const result of test.tests) console.log(`  ${result.passed ? "passed" : "FAILED"}  ${result.name}${result.durationMs === undefined ? "" : ` (${(result.durationMs / 1000).toFixed(3)} s in the engine)`}${result.message ? `: ${result.message}` : ""}`);
}

/** Creates and builds a sandbox in `workFolder`, runs the sample test, prints the summary, and sets the exit code. */
async function runSmoke(services: SmokeServices, engine: EngineInstall, workFolder: string, options: SmokeOptions, totalStart: number): Promise<void>
{
	const buildLog = join(workFolder, "build.log");
	const testLog = join(workFolder, "test.log");
	const signal = new AbortController().signal;
	let lastPhase = "";

	// Each progress line goes to build.log; a phase change is also printed, so a long build shows it is alive.
	const onProgress = (update: ProgressUpdate): void =>
	{
		appendFileSync(buildLog, `${update.lastLine}\n`);

		if (update.phase === lastPhase) return;

		lastPhase = update.phase;
		console.log(`  ${seconds(performance.now() - totalStart).padStart(6)} s  ${update.phase}`);
	};

	const setup = await services.sandboxService.create(engine.path, workFolder, onProgress, signal);
	console.log(`sandbox  ${setup.sandboxPath}`);

	let test: TestRunOutcome | null = null;

	if (setup.ok)
	{
		console.log(`  ${seconds(performance.now() - totalStart).padStart(6)} s  testing`);
		test = await services.testRunner.run({
			engineRoot: engine.path,
			projectFile: join(setup.sandboxPath, PROJECT_FILE_NAME),
			testNames: [SAMPLE_TEST],
			reportFolder: join(workFolder, "report"),
			signal,
			onLine: (line) => appendFileSync(testLog, `${line}\n`),
		});
	}

	// The report decides, not the exit code (A285); the runner already drops tests that were not asked for.
	const passed = setup.ok && test !== null && !test.pipelineError && test.tests.some((result) => result.name === SAMPLE_TEST) && test.tests.every((result) => result.passed);

	printSummary(seconds(setup.durationMs), setup.ok, test, performance.now() - totalStart, passed);

	if (!setup.ok)
	{
		console.log("\nbuild failed; the compiler output:");
		printTail(setup.compilerOutput, 30);
	}

	if (options.keepFolder || !passed) console.log(`\nkept ${workFolder} (build.log, test.log, report/)`);
	else rmSync(workFolder, { recursive: true, force: true });

	process.exitCode = passed ? 0 : 1;
}

/** Picks the engine, makes the temp folder, and runs the smoke; if anything throws after the folder exists, says where it is. */
async function main(): Promise<void>
{
	const options = parseOptions(process.argv.slice(2));
	const totalStart = performance.now();
	const locator = createEngineLocator();
	const engine = await chooseEngine(locator, options.enginePath);
	const services = createSmokeServices(locator);
	const workFolder = realpathSync(mkdtempSync(join(tmpdir(), "dojo-engine-smoke-")));

	console.log(`engine   ${engine.version} at ${engine.path} (found by ${engine.source})`);

	try
	{
		await runSmoke(services, engine, workFolder, options, totalStart);
	}
	catch (error)
	{
		console.log(`\nthe smoke stopped with an error; kept ${workFolder}`);
		throw error;
	}
}

void main().catch((error: unknown) =>
{
	console.error(error);
	process.exitCode = 1;
});
