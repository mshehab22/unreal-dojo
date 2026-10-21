// Engine smoke check: copies the sandbox template to a temp folder, builds it, runs Dojo.Sample.Health headless, and prints timings.
// Usage: npx tsx tools/qa/engine-smoke.ts [--engine <engine root>] [--keep]
// Uses the commands verified in docs/systems/unreal-pipeline.md ("Exact commands"). Exits with 1 when the build fails or any test fails.
import { spawn } from "node:child_process";
import { cpSync, createWriteStream, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { createEngineLocator } from "../../src/main/services/unreal/createEngineLocator";
import { createUnrealPlatform } from "../../src/main/services/unreal/createUnrealPlatform";
import { NodeCommandRunner } from "../../src/main/services/unreal/NodeCommandRunner";
import type { PlatformPaths } from "../../src/main/services/unreal/PlatformPaths";
import type { EngineInstall } from "../../src/shared/types/engine";

/** The automation test filter this smoke runs; the template's only test is `Dojo.Sample.Health.TakesDamage`. */
const TEST_FILTER = "Dojo.Sample.Health";

/** The test that must be in the report for the run to count. */
const REQUIRED_TEST = "Dojo.Sample.Health.TakesDamage";

/** Plugins the template enables that only exist from UE 5.8 (A41). */
const PLUGINS_FROM_5_8 = ["ModelContextProtocol", "AutomationTestToolset", "LiveCodingToolset"];

/** A cold build took about 20 s on the M5 Air; this leaves room for a slow first build of the engine's own modules. */
const BUILD_TIMEOUT_MS = 30 * 60_000;

/** The pipeline spec's headless timeout. */
const TEST_TIMEOUT_MS = 10 * 60_000;

/** How one spawned engine process ended. */
interface ProcessOutcome
{
	exitCode: number | null;
	timedOut: boolean;
	seconds: number;
}

/** One test as the automation report lists it. */
interface ReportedTest
{
	fullTestPath: string;
	state: string;
	duration: number;
	errors: number;
	warnings: number;
}

/** The parts of `index.json` this smoke reads. */
interface AutomationReport
{
	succeeded: number;
	succeededWithWarnings: number;
	failed: number;
	notRun: number;
	totalDuration: number;
	tests: ReportedTest[];
}

/** The command-line options. */
interface SmokeOptions
{
	enginePath: string | undefined;
	keepFolder: boolean;
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
async function chooseEngine(enginePath: string | undefined): Promise<EngineInstall>
{
	const locator = createEngineLocator();

	if (enginePath !== undefined) return locator.inspectFolder(enginePath);

	return locator.requireEngines().then((engines) => engines[0] as EngineInstall);
}

/** Seconds since `start`, to one decimal. */
function secondsSince(start: number): number
{
	return Math.round((performance.now() - start) / 100) / 10;
}

/** Copies the template and writes the engine association and plugin list the way SandboxProjectService does at setup (A41). */
function prepareSandbox(sandboxFolder: string, engine: EngineInstall): string
{
	cpSync(resolve("resources/sandbox-template"), sandboxFolder, { recursive: true });

	const projectFile = join(sandboxFolder, "Dojo.uproject");
	const project = JSON.parse(readFileSync(projectFile, "utf8")) as { EngineAssociation: string; Plugins?: { Name: string }[] };
	const [major = "0", minor = "0"] = engine.version.split(".");

	project.EngineAssociation = `${major}.${minor}`;

	if (!engine.supportsFastLoop) project.Plugins = (project.Plugins ?? []).filter((plugin) => !PLUGINS_FROM_5_8.includes(plugin.Name));

	writeFileSync(projectFile, `${JSON.stringify(project, null, "\t")}\n`);

	return projectFile;
}

/** Runs one engine program with stdin on /dev/null (pitfall 9), writing its output to `logFile`, and kills it after `timeoutMs`. */
function runLogged(command: string, commandArguments: string[], logFile: string, timeoutMs: number): Promise<ProcessOutcome>
{
	const start = performance.now();
	const log = createWriteStream(logFile);

	// Node will not spawn a .bat without a shell, so Build.bat goes through cmd.exe (unverified on Windows).
	const usesBatchFile = command.toLowerCase().endsWith(".bat");
	const child = usesBatchFile
		? spawn("cmd.exe", ["/d", "/s", "/c", command, ...commandArguments], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true })
		: spawn(command, commandArguments, { stdio: ["ignore", "pipe", "pipe"] });

	child.stdout.pipe(log, { end: false });
	child.stderr.pipe(log, { end: false });

	return new Promise((resolvePromise) =>
	{
		let timedOut = false;
		const timer = setTimeout(() =>
		{
			timedOut = true;
			child.kill("SIGKILL");
		}, timeoutMs);

		child.on("close", (exitCode) =>
		{
			clearTimeout(timer);
			log.end();
			resolvePromise({ exitCode, timedOut, seconds: secondsSince(start) });
		});

		child.on("error", (error) =>
		{
			clearTimeout(timer);
			log.end(`\nfailed to start: ${String(error)}\n`);
			resolvePromise({ exitCode: null, timedOut, seconds: secondsSince(start) });
		});
	});
}

/** Reads `index.json` from the report folder, stripping the byte order mark the engine writes. Returns null when there is no report. */
function readReport(reportFolder: string): AutomationReport | null
{
	const reportFile = join(reportFolder, "index.json");

	if (!existsSync(reportFile)) return null;

	const report = JSON.parse(readFileSync(reportFile, "utf8").replace(/^\uFEFF/, "")) as AutomationReport;

	return report;
}

/** Prints the last lines of a log, for a step that failed. */
function printLogTail(logFile: string, lineCount: number): void
{
	const lines = existsSync(logFile) ? readFileSync(logFile, "utf8").trimEnd().split("\n") : [];

	console.log(lines.slice(-lineCount).map((line) => `    ${line}`).join("\n"));
}

/** Builds and tests a fresh sandbox copy, prints a timing table, and sets the exit code. */
async function main(): Promise<void>
{
	const options = parseOptions(process.argv.slice(2));
	const totalStart = performance.now();
	const engine = await chooseEngine(options.enginePath);
	const platform = createUnrealPlatform({ platform: process.platform, homeFolder: homedir(), environment: process.env, commandRunner: new NodeCommandRunner() });

	if (!platform) throw new Error(`Unreal Engine is not supported on ${process.platform}.`);

	const paths: PlatformPaths = platform.paths;
	const workFolder = realpathSync(mkdtempSync(join(tmpdir(), "dojo-engine-smoke-")));
	const sandboxFolder = join(workFolder, "Dojo");
	const reportFolder = join(workFolder, "report");
	const buildLog = join(workFolder, "build.log");
	const testLog = join(workFolder, "test.log");

	console.log(`engine   ${engine.version} at ${engine.path} (found by ${engine.source})`);
	console.log(`sandbox  ${sandboxFolder}`);

	const copyStart = performance.now();
	const projectFile = prepareSandbox(sandboxFolder, engine);
	const copySeconds = secondsSince(copyStart);

	const build = await runLogged(paths.buildScript(engine.path), ["DojoEditor", paths.buildPlatform, "Development", `-Project=${projectFile}`, "-WaitMutex", "-Progress"], buildLog, BUILD_TIMEOUT_MS);
	const buildPassed = build.exitCode === 0 && !build.timedOut;

	let test: ProcessOutcome | null = null;
	let report: AutomationReport | null = null;

	if (buildPassed)
	{
		test = await runLogged(paths.editorCmdBinary(engine.path), [
			projectFile,
			`-ExecCmds=Automation RunTests ${TEST_FILTER}; Quit`,
			"-Unattended", "-NoPause", "-NullRHI", "-NoSplash", "-NoSound", "-stdout", "-FullStdOutLogOutput",
			`-ReportExportPath=${reportFolder}`,
			"-log",
		], testLog, TEST_TIMEOUT_MS);
		report = readReport(reportFolder);
	}

	const passedCount = report === null ? 0 : report.succeeded + report.succeededWithWarnings;
	const requiredTestPassed = report?.tests.some((entry) => entry.fullTestPath === REQUIRED_TEST && entry.state.startsWith("Success")) ?? false;
	const passed = buildPassed && report !== null && report.failed === 0 && requiredTestPassed;

	console.log("");
	console.log("step                          seconds  result");
	console.log(`copy template                 ${String(copySeconds).padStart(7)}  ok`);
	console.log(`build DojoEditor              ${String(build.seconds).padStart(7)}  ${build.timedOut ? "timed out" : `exit ${build.exitCode}`}`);
	console.log(`headless ${TEST_FILTER.padEnd(20)} ${String(test?.seconds ?? "-").padStart(7)}  ${test === null ? "skipped (build failed)" : test.timedOut ? "timed out" : `exit ${test.exitCode}`}`);
	console.log(`total                         ${String(secondsSince(totalStart)).padStart(7)}  ${passed ? "PASSED" : "FAILED"}`);

	if (report !== null)
	{
		console.log("");
		console.log(`report: ${passedCount} passed (${report.succeededWithWarnings} with warnings), ${report.failed} failed, ${report.notRun} not run, engine-reported test time ${report.totalDuration.toFixed(3)} s`);

		for (const entry of report.tests) console.log(`  ${entry.state.padEnd(22)} ${entry.fullTestPath} (${entry.duration.toFixed(3)} s, ${entry.errors} errors, ${entry.warnings} warnings)`);
	}

	if (!buildPassed)
	{
		console.log("\nbuild failed; last lines of the build log:");
		printLogTail(buildLog, 30);
	}
	else if (!passed)
	{
		console.log(report === null ? "\nno report was written; last lines of the test log:" : `\n${REQUIRED_TEST} did not pass; last lines of the test log:`);
		printLogTail(testLog, 30);
	}

	if (options.keepFolder || !passed) console.log(`\nkept ${workFolder} (build.log, test.log, report/)`);
	else rmSync(workFolder, { recursive: true, force: true });

	process.exitCode = passed ? 0 : 1;
}

void main().catch((error: unknown) =>
{
	console.error(error);
	process.exitCode = 1;
});
