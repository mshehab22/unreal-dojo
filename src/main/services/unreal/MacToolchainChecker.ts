// Checks that full Xcode is selected, answers, and has the Metal toolchain.
import type { ToolchainCheck, ToolchainProblem } from "@shared/types/engine";

import type { CommandRunner } from "./CommandRunner";
import type { ToolchainChecker } from "./ToolchainChecker";
import { toolchainCheckResult } from "./toolchainCheckResult";
import { commandLineToolsOnly, metalToolchainMissing, xcodeLicenseNotAccepted, xcodeNotSelected, xcodeNotWorking } from "./unrealErrors";

/** ToolchainChecker for macOS: `xcode-select -p`, then `xcodebuild -version`, then `xcrun metal --version`. Each step runs only when the one before passed. */
export class MacToolchainChecker implements ToolchainChecker
{
	private readonly commandRunner: CommandRunner;

	/** Takes the runner that spawns the Xcode tools. */
	constructor(commandRunner: CommandRunner)
	{
		this.commandRunner = commandRunner;
	}

	/** Runs the three checks in order. */
	async check(): Promise<ToolchainCheck>
	{
		const selected = await this.commandRunner.run("xcode-select", ["-p"]);
		const developerFolder = selected.stdout.trim();

		if (!selected.started || selected.exitCode !== 0 || developerFolder === "") return this.failed(undefined, { error: xcodeNotSelected(), blocksBuild: true });
		if (developerFolder.includes("CommandLineTools")) return this.failed(undefined, { error: commandLineToolsOnly(developerFolder), blocksBuild: true });

		const versionResult = await this.commandRunner.run("xcodebuild", ["-version"]);
		const xcodeVersion = /Xcode\s+(\S+)/.exec(versionResult.stdout)?.[1];

		if (versionResult.exitCode !== 0 || xcodeVersion === undefined)
		{
			const output = `${versionResult.stdout}\n${versionResult.stderr}`.trim();
			const error = /license/i.test(output) ? xcodeLicenseNotAccepted() : xcodeNotWorking(output);

			return this.failed(undefined, { error, blocksBuild: true });
		}

		const problems: ToolchainProblem[] = [];
		const metal = await this.commandRunner.run("xcrun", ["metal", "--version"]);

		if (metal.exitCode !== 0) problems.push({ error: metalToolchainMissing(`${metal.stdout}\n${metal.stderr}`.trim()), blocksBuild: false });

		return toolchainCheckResult("xcode-select", `Xcode ${xcodeVersion} is selected (${developerFolder}).`, xcodeVersion, problems);
	}

	/** Shortcut for a result with one problem. */
	private failed(toolVersion: string | undefined, problem: ToolchainProblem): ToolchainCheck
	{
		return toolchainCheckResult("xcode-select", "", toolVersion, [problem]);
	}
}
