// Checks for Visual Studio with the C++ game workload through vswhere.
import type { ToolchainCheck, ToolchainProblem } from "@shared/types/engine";

import type { CommandRunner } from "./CommandRunner";
import type { ToolchainChecker } from "./ToolchainChecker";
import { toolchainCheckResult } from "./toolchainCheckResult";
import { visualStudioMissing, visualStudioTooOld, visualStudioWorkloadMissing } from "./unrealErrors";
import { vswhereLocation } from "./vswhereLocation";

/** The "Game development with C++" workload and the MSVC x64 compiler component. */
const REQUIRED_COMPONENTS = ["Microsoft.VisualStudio.Workload.NativeGame", "Microsoft.VisualStudio.Component.VC.Tools.x86.x64"];

/** UE 5.8 needs Visual Studio 2022 17.14 or later (research section 9.1). */
const MINIMUM_MAJOR = 17;
const MINIMUM_MINOR = 14;

/** One Visual Studio install as vswhere's JSON describes it. */
interface VisualStudioInstance
{
	displayName: string;
	installationVersion: string;
	displayVersion: string;
}

/** ToolchainChecker for Windows. Asks vswhere for an install with the workload; when none has it, asks again without the filter to tell "no Visual Studio" from "no workload". */
export class WindowsToolchainChecker implements ToolchainChecker
{
	private readonly commandRunner: CommandRunner;
	private readonly vswherePath: string;

	/** Takes the runner and `%ProgramFiles(x86)%`, where the Visual Studio Installer keeps vswhere. */
	constructor(commandRunner: CommandRunner, programFilesX86: string | undefined)
	{
		this.commandRunner = commandRunner;
		this.vswherePath = vswhereLocation(programFilesX86);
	}

	/** Runs the vswhere checks. */
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

		return toolchainCheckResult("vswhere", `${newest.displayName} ${newest.displayVersion} has the Game development with C++ workload.`, newest.displayVersion, problems);
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

/** Compares `17.14.36301.6` style versions part by part. */
function compareDottedVersions(left: string, right: string): number
{
	const leftParts = left.split(".").map(Number);
	const rightParts = right.split(".").map(Number);

	for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index++)
	{
		const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
		if (difference !== 0) return difference;
	}

	return 0;
}
