// Checks for Visual Studio with the C++ game workload through vswhere, and for a new enough Windows SDK.
import type { ToolchainCheck, ToolchainProblem } from "@shared/types/engine";

import type { CommandRunner } from "./CommandRunner";
import { compareDottedVersions } from "./compareDottedVersions";
import type { ToolchainChecker } from "./ToolchainChecker";
import { toolchainCheckResult } from "./toolchainCheckResult";
import { visualStudioMissing, visualStudioTooOld, visualStudioWorkloadMissing, windowsSdkMissing } from "./unrealErrors";
import { vswhereLocation } from "./vswhereLocation";
import type { WindowsSdkFinder } from "./WindowsSdkFinder";

/** The "Game development with C++" workload and the MSVC x64 compiler component. */
const REQUIRED_COMPONENTS = ["Microsoft.VisualStudio.Workload.NativeGame", "Microsoft.VisualStudio.Component.VC.Tools.x86.x64"];

/** UE 5.8 needs Visual Studio 2022 17.14 or later (research section 9.1). */
const MINIMUM_MAJOR = 17;
const MINIMUM_MINOR = 14;

/** The oldest Windows SDK the toolchain check accepts (A1315). */
const MINIMUM_WINDOWS_SDK = "10.0.22621.0";

/** One Visual Studio install as vswhere's JSON describes it. */
interface VisualStudioInstance
{
	displayName: string;
	installationVersion: string;
	displayVersion: string;
}

/** ToolchainChecker for Windows. Asks vswhere for an install with the workload; when none has it, asks again without the filter to tell "no Visual Studio" from "no workload". With Visual Studio found, also needs a Windows SDK of 10.0.22621.0 or newer. */
export class WindowsToolchainChecker implements ToolchainChecker
{
	private readonly commandRunner: CommandRunner;
	private readonly vswherePath: string;
	private readonly sdkFinder: WindowsSdkFinder;

	/** Takes the runner, `%ProgramFiles(x86)%` (where the Visual Studio Installer keeps vswhere), and the Windows SDK search. */
	constructor(commandRunner: CommandRunner, programFilesX86: string | undefined, sdkFinder: WindowsSdkFinder)
	{
		this.commandRunner = commandRunner;
		this.vswherePath = vswhereLocation(programFilesX86);
		this.sdkFinder = sdkFinder;
	}

	/** Runs the vswhere checks, then the Windows SDK check. */
	async check(): Promise<ToolchainCheck>
	{
		const withWorkload = await this.findInstances(["-requires", ...REQUIRED_COMPONENTS]);

		if (withWorkload === null) return this.result(undefined, [{ error: visualStudioMissing(), blocksBuild: true }]);

		const newest = withWorkload.sort((left, right) => compareDottedVersions(right.installationVersion, left.installationVersion))[0];

		if (!newest)
		{
			const anyInstance = (await this.findInstances([]))?.[0];
			const error = anyInstance ? visualStudioWorkloadMissing(anyInstance.displayName) : visualStudioMissing();

			return this.result(anyInstance?.displayVersion, [{ error, blocksBuild: true }]);
		}

		const problems: ToolchainProblem[] = [];
		const [major = 0, minor = 0] = newest.installationVersion.split(".").map(Number);

		if (major < MINIMUM_MAJOR || (major === MINIMUM_MAJOR && minor < MINIMUM_MINOR)) problems.push({ error: visualStudioTooOld(newest.displayName, newest.displayVersion), blocksBuild: true });

		// Without a new enough SDK every build fails inside UBT; saying so here gives the learner the fix before the first build.
		const sdkVersion = await this.sdkFinder.newestVersion();

		if (sdkVersion === null || compareDottedVersions(sdkVersion, MINIMUM_WINDOWS_SDK) < 0) problems.push({ error: windowsSdkMissing(MINIMUM_WINDOWS_SDK, sdkVersion), blocksBuild: true });

		return toolchainCheckResult("vswhere", `${newest.displayName} ${newest.displayVersion} has the Game development with C++ workload, and Windows SDK ${sdkVersion ?? ""} is installed.`, newest.displayVersion, problems);
	}

	/** Shortcut for a result with problems and no healthy message. */
	private result(toolVersion: string | undefined, problems: ToolchainProblem[]): ToolchainCheck
	{
		return toolchainCheckResult("vswhere", "", toolVersion, problems);
	}

	/** Runs vswhere with extra filters. Returns null when vswhere itself is missing (no Visual Studio Installer on this PC). */
	private async findInstances(filters: string[]): Promise<VisualStudioInstance[] | null>
	{
		const result = await this.commandRunner.run(this.vswherePath, ["-products", "*", ...filters, "-format", "json", "-utf8"]);
		if (!result.started) return null;
		if (result.exitCode !== 0) return [];

		return parseVswhereJson(result.stdout);
	}
}

/** Reads vswhere's JSON array into instances, skipping entries without the fields used here. */
function parseVswhereJson(text: string): VisualStudioInstance[]
{
	let parsed: unknown;

	try
	{
		parsed = JSON.parse(text);
	}
	catch
	{
		return [];
	}

	if (!Array.isArray(parsed)) return [];

	const instances: VisualStudioInstance[] = [];

	for (const entry of parsed)
	{
		if (typeof entry !== "object" || entry === null) continue;

		const record = entry as Record<string, unknown>;
		const catalog = (record.catalog ?? {}) as Record<string, unknown>;

		if (typeof record.displayName !== "string" || typeof record.installationVersion !== "string") continue;

		const displayVersion = typeof catalog.productDisplayVersion === "string" ? catalog.productDisplayVersion : record.installationVersion;

		instances.push({ displayName: record.displayName, installationVersion: record.installationVersion, displayVersion });
	}

	return instances;
}
