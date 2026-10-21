// Finds the `claude` command: every PATH folder first, then the usual install folders, because apps started from the Dock or Start menu get a short PATH.
import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { posix, win32 } from "node:path";

/** What the locator needs from the machine, so tests can describe any machine. */
export interface LocatorEnvironment
{
	/** `process.platform`. */
	platform: NodeJS.Platform;

	/** Environment variables (PATH, APPDATA, USERPROFILE). */
	env: Record<string, string | undefined>;

	/** The user's home folder. */
	homeFolder: string;

	/** True when a file exists and can be run. */
	isExecutable: (filePath: string) => boolean;
}

/** Checks that a file exists and, outside Windows, that it can be executed. */
function isExecutableOnDisk(filePath: string): boolean
{
	try
	{
		accessSync(filePath, process.platform === "win32" ? constants.F_OK : constants.X_OK);

		return true;
	}
	catch
	{
		return false;
	}
}

/** The real machine. */
export function currentLocatorEnvironment(): LocatorEnvironment
{
	return { platform: process.platform, env: process.env, homeFolder: homedir(), isExecutable: isExecutableOnDisk };
}

/** Finds the Claude Code command on this machine. */
export class ClaudeCodeLocator
{
	/** Keeps the machine description to search. */
	constructor(private readonly environment: LocatorEnvironment = currentLocatorEnvironment())
	{
	}

	/** Every path checked, in order. Exposed so the Settings screen can say where it looked. */
	candidates(): string[]
	{
		const { platform, env, homeFolder } = this.environment;
		const isWindows = platform === "win32";
		const { join, delimiter } = isWindows ? win32 : posix;
		const pathFolders = (env.PATH ?? env.Path ?? "").split(delimiter).filter((folder) => folder.length > 0);
		const fileNames = isWindows ? ["claude.exe", "claude.cmd"] : ["claude"];

		const extraFolders = isWindows
			? [join(env.USERPROFILE ?? homeFolder, ".local", "bin"), ...(env.APPDATA ? [join(env.APPDATA, "npm")] : [])]
			: [join(homeFolder, ".local", "bin"), join(homeFolder, ".claude", "local"), "/usr/local/bin", "/opt/homebrew/bin"];

		const paths = [...pathFolders, ...extraFolders].flatMap((folder) => fileNames.map((fileName) => join(folder, fileName)));

		return [...new Set(paths)];
	}

	/** The first candidate that exists and can run, or null when Claude Code is not installed where the app can see it. */
	locate(): string | null
	{
		return this.candidates().find((candidate) => this.environment.isExecutable(candidate)) ?? null;
	}
}
