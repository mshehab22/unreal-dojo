// Finds the newest Windows 10/11 SDK the way UBT looks for one: the Windows Kits root from the registry, then the usual folder (A1315).
import { win32 } from "node:path";

import type { CommandRunner } from "./CommandRunner";
import { compareDottedVersions } from "./compareDottedVersions";
import type { FileSystemReader } from "./FileSystemReader";
import { registryStringValues } from "./registryValues";

/** The key the SDK installer writes its root folder to. */
const INSTALLED_ROOTS_QUERY = ["query", "HKLM\\SOFTWARE\\Microsoft\\Windows Kits\\Installed Roots", "/v", "KitsRoot10"];

/** An SDK version folder under `Include`. */
const SDK_VERSION = /^10\.0\.\d+\.\d+$/;

/** A version folder only counts with its Windows headers in it; uninstalls can leave empty version folders behind. */
const HEADERS_FOLDER = "um";

/** Reads `reg query` output and SDK folder listings. Never throws. */
export class WindowsSdkFinder
{
	private readonly commandRunner: CommandRunner;
	private readonly fileSystem: FileSystemReader;
	private readonly defaultRoot: string;

	/** Takes the runner for `reg`, the folder reader, and `%ProgramFiles(x86)%`, where the SDK installs by default. */
	constructor(commandRunner: CommandRunner, fileSystem: FileSystemReader, programFilesX86: string | undefined)
	{
		this.commandRunner = commandRunner;
		this.fileSystem = fileSystem;
		this.defaultRoot = win32.join(programFilesX86 ?? "C:\\Program Files (x86)", "Windows Kits", "10");
	}

	/** The newest installed SDK version (`10.0.26100.0`), or null when there is none. */
	async newestVersion(): Promise<string | null>
	{
		const versions: string[] = [];

		for (const root of await this.roots())
		{
			const includeFolder = win32.join(root, "Include");

			for (const version of (await this.fileSystem.listFolders(includeFolder)).filter((name) => SDK_VERSION.test(name)))
			{
				if ((await this.fileSystem.listFolders(win32.join(includeFolder, version))).includes(HEADERS_FOLDER)) versions.push(version);
			}
		}

		return versions.sort((left, right) => compareDottedVersions(right, left))[0] ?? null;
	}

	/** The registry's Windows Kits root (64-bit view, then 32-bit), then the default folder, each once. */
	private async roots(): Promise<string[]>
	{
		const roots: string[] = [];

		for (const view of [[], ["/reg:32"]])
		{
			const result = await this.commandRunner.run("reg", [...INSTALLED_ROOTS_QUERY, ...view]);

			if (result.started && result.exitCode === 0) roots.push(...registryStringValues(result.stdout));
			if (roots.length > 0) break;
		}

		roots.push(this.defaultRoot);

		const seen = new Set<string>();

		return roots.map((root) => win32.normalize(root).replace(/\\+$/, "")).filter((root) =>
		{
			const key = root.toLowerCase();
			if (seen.has(key)) return false;

			seen.add(key);

			return true;
		});
	}
}
