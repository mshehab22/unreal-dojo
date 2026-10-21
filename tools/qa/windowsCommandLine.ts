// Builds the cmd.exe arguments that run a `.bat` file safely when its path or arguments contain spaces, the way Node's own shell mode does.
// The quoting matches src/main/services/review/providers/NodeProcessRunner.ts (copied, not imported, so tools/qa stays outside the app).

/** Quotes one part of a cmd.exe command line: wraps it in double quotes and doubles any quote inside. */
export function quoteForWindowsShell(part: string): string
{
	return `"${part.replace(/"/g, "\"\"")}"`;
}

/**
 * The arguments for `spawn("cmd.exe", ..., { windowsVerbatimArguments: true })`: `/d /s /c` and then the whole command line in one more pair of quotes.
 * With `/s`, cmd.exe strips exactly that outer pair and runs the rest as written, so every quoted path survives.
 */
export function windowsShellArguments(command: string, commandArguments: string[]): string[]
{
	const commandLine = [command, ...commandArguments].map(quoteForWindowsShell).join(" ");

	return ["/d", "/s", "/c", `"${commandLine}"`];
}
