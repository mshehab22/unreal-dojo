// A scripted CommandRunner for the registry and toolchain tests.
import type { CommandResult, CommandRunner } from "../../src/main/services/unreal/CommandRunner";

/** Answers each command line from a script keyed by `command arg1 arg2 ...`. Unscripted commands behave like a program that is not installed. */
export class FakeCommandRunner implements CommandRunner
{
	/** Every command line run, in order. */
	readonly commandLines: string[] = [];

	private readonly script: Record<string, Partial<CommandResult>>;

	/** Takes the scripted answers. Missing fields default to a clean exit with no output. */
	constructor(script: Record<string, Partial<CommandResult>>)
	{
		this.script = script;
	}

	/** Records the command line and returns its scripted answer. */
	async run(command: string, commandArguments: string[]): Promise<CommandResult>
	{
		const commandLine = [command, ...commandArguments].join(" ");
		this.commandLines.push(commandLine);

		const answer = this.script[commandLine];
		if (!answer) return { started: false, exitCode: null, stdout: "", stderr: `spawn ${command} ENOENT` };

		return { started: true, exitCode: 0, stdout: "", stderr: "", ...answer };
	}
}
