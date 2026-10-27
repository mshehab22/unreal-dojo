// The plain-English checks on a folder the learner picked for the sandbox: warnings for places that tend to break builds, and a blocker for the one place that cannot work.
import type { PlatformPaths } from "./PlatformPaths";

/** A cloud sync service and the folder names its client creates. */
interface CloudService
{
	name: string;
	folderName: RegExp;
}

/** The sync folders worth warning about. A name matches as a whole word, so `OneDrive - Work` matches and `OneDriveStuff` does not. */
const CLOUD_SERVICES: CloudService[] = [
	{ name: "OneDrive", folderName: /^onedrive(?![a-z0-9])/ },
	{ name: "Dropbox", folderName: /^dropbox(?![a-z0-9])/ },
	{ name: "Google Drive", folderName: /^(google ?drive|googledrive)(?![a-z0-9])/ },
	{ name: "iCloud Drive", folderName: /^icloud ?drive(?![a-z0-9])/ },
];

/** The folders right under the drive letter that Google Drive for desktop creates on Windows. */
const GOOGLE_DRIVE_TOP_FOLDER_NAMES = ["my drive", "shared drives"];

/** The Windows folders that hold installed programs and are protected from changes. */
const PROGRAM_FILES_FOLDER_NAMES = ["program files", "program files (x86)"];

/** Splits a path into its parts on either separator, dropping empty parts. */
function partsOf(somePath: string): string[]
{
	return somePath.split(/[\\/]+/).filter((part) => part.length > 0);
}

/** Pure checks on a picked sandbox folder (A1204). The same rules run for the first-run folder answer, the log lines of `create`, and the refusal in `create`. */
export class SandboxFolderRules
{
	private readonly paths: PlatformPaths;

	/** Takes the platform paths, which decide the length limit, the letter case rule, and the separators. */
	constructor(paths: PlatformPaths)
	{
		this.paths = paths;
	}

	/** Plain-English warnings about a picked folder, one sentence each. The folder can still be used. */
	warnings(pickedFolder: string, sandboxFolder: string): string[]
	{
		const warnings: string[] = [];
		const lowerCaseParts = partsOf(pickedFolder).map((part) => part.toLowerCase());
		const shortFolderExample = this.paths.buildPlatform === "Win64" ? "C:\\Dojo" : "a plain folder in your home folder";
		const limit = this.paths.maximumSandboxPathLength;

		if (limit !== null && sandboxFolder.length > limit)
		{
			warnings.push(`The sandbox path is ${sandboxFolder.length} characters long. Unreal's build can fail on Windows when it is over ${limit}; a short folder such as ${shortFolderExample} is safer.`);
		}

		if (/[^\u0020-\u007e]/.test(pickedFolder))
		{
			warnings.push(`This folder's path has letters other than plain English ones (such as accents or non-Latin letters). Some of Unreal's build tools mishandle them; ${shortFolderExample} is safer.`);
		}

		const cloudName = this.cloudServiceName(lowerCaseParts);

		if (cloudName !== null)
		{
			warnings.push(`This folder is synced by ${cloudName}. Syncing can lock or rewrite files in the middle of a build and make it fail in odd ways; a folder that is not synced, such as ${shortFolderExample}, is safer.`);
		}

		if (this.isNetworkPath(pickedFolder))
		{
			warnings.push("This folder is on a network location. Builds there are slow and fail when the connection drops; pick a folder on this computer's own disk.");
		}

		if (this.paths.buildPlatform === "Win64" && lowerCaseParts.some((part) => PROGRAM_FILES_FOLDER_NAMES.includes(part)))
		{
			warnings.push(`This folder is inside Program Files, which Windows protects from changes. Builds can fail with permission errors; pick a folder you own, such as ${shortFolderExample}.`);
		}

		return warnings;
	}

	/** Plain-English reasons the folder cannot be used at all. Today only one: it is inside the engine folder. An engine root inside the picked folder is fine. */
	blockers(pickedFolder: string, engineRoot: string | null): string[]
	{
		if (engineRoot === null || !this.isInside(pickedFolder, engineRoot)) return [];

		return [`This folder is inside your Unreal Engine install (${engineRoot}). An engine update, repair, or uninstall can wipe it, and a build would mix the sandbox's files with the engine's.`];
	}

	/** True when `folder` is `root` or somewhere below it. Separators are normalised and, on Windows, letter case is ignored. */
	private isInside(folder: string, root: string): boolean
	{
		const folderParts = partsOf(this.paths.pathKey(folder));
		const rootParts = partsOf(this.paths.pathKey(root));

		if (rootParts.length === 0 || folderParts.length < rootParts.length) return false;

		return rootParts.every((part, index) => part === folderParts[index]);
	}

	/** The name of the sync service whose folder is on the path, or null. */
	private cloudServiceName(lowerCaseParts: string[]): string | null
	{
		for (const service of CLOUD_SERVICES)
		{
			if (lowerCaseParts.some((part) => service.folderName.test(part))) return service.name;
		}

		// iCloud Drive on a Mac lives in Library/Mobile Documents; every cloud client that uses Apple's file provider mounts under Library/CloudStorage.
		const libraryIndex = lowerCaseParts.indexOf("library");

		const onMac = this.paths.buildPlatform !== "Win64";

		if (onMac && libraryIndex >= 0 && lowerCaseParts[libraryIndex + 1] === "mobile documents") return "iCloud Drive";
		if (onMac && libraryIndex >= 0 && lowerCaseParts[libraryIndex + 1] === "cloudstorage" && lowerCaseParts.length > libraryIndex + 2) return "a cloud storage service";

		// Google Drive for desktop on Windows mounts a drive letter whose top folders are "My Drive" and "Shared drives".
		if (this.paths.buildPlatform === "Win64" && /^[a-z]:$/.test(lowerCaseParts[0] ?? "") && GOOGLE_DRIVE_TOP_FOLDER_NAMES.includes(lowerCaseParts[1] ?? "")) return "Google Drive";

		return null;
	}

	/** True for a Windows network path (`\\server\share`). The `\\?\` and `\\.\` prefixes are local; `\\?\UNC\` is a network path again. */
	private isNetworkPath(pickedFolder: string): boolean
	{
		if (this.paths.buildPlatform !== "Win64") return false;

		const slashed = pickedFolder.replace(/\//g, "\\");

		if (!slashed.startsWith("\\\\")) return false;
		if (/^\\\\[?.]\\unc\\/i.test(slashed)) return true;

		return !/^\\\\[?.]\\/.test(slashed);
	}
}
