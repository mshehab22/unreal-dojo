// A scripted CommandRunner for the registry and toolchain tests.
import type { CommandResult, CommandRunner } from "../../src/main/services/unreal/CommandRunner";

/** Answers each command line from a script keyed by `command arg1 arg2 ...`. Unscripted commands behave like a program that is not installed. */
export class FakeCommandRunner implements CommandRunner
{
	/** Every command line run, in order. */
	readonly commandLines: string[] = [];

	/** The working folder of every run that passed one, in order. */
	readonly workingFolders: string[] = [];

	private readonly script: Record<string, Partial<CommandResult>>;

	/** Takes the scripted answers. Missing fields default to a clean exit with no output. */
	constructor(script: Record<string, Partial<CommandResult>>)
	{
		this.script = script;
	}

	/** Records the command line and returns its scripted answer. */
	async run(command: string, commandArguments: string[], workingFolder?: string): Promise<CommandResult>
	{
		if (workingFolder !== undefined) this.workingFolders.push(workingFolder);

		const commandLine = [command, ...commandArguments].join(" ");
		this.commandLines.push(commandLine);

		const answer = this.script[commandLine];
		if (!answer) return { started: false, exitCode: null, stdout: "", stderr: `spawn ${command} ENOENT` };

		return { started: true, exitCode: 0, stdout: "", stderr: "", ...answer };
	}
}
