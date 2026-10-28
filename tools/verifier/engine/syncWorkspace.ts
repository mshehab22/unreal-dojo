// Brings a persistent workspace to the sandbox template's state without touching build outputs or files that already match (W14, A1281).
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/** Removal settings that ride out an editor or scanner still holding a file on Windows. */
const REMOVE_OPTIONS = { recursive: true, force: true, maxRetries: 5, retryDelay: 200 } as const;

/** What a sync changed. */
export interface SyncSummary
{
	written: string[];
	removed: string[];
}

/** Every file and folder under `root`, as `/`-separated paths relative to it, skipping top-level entries named in `skipped`. */
async function listTree(root: string, skipped: ReadonlySet<string>): Promise<{ files: string[]; folders: string[] }>
{
	const files: string[] = [];
	const folders: string[] = [];

	/** Adds the entries of one folder, then those of its sub-folders. */
	async function visit(relative: string): Promise<void>
	{
		for (const entry of await readdir(join(root, relative), { withFileTypes: true }).catch(() => []))
		{
			if (relative === "" && skipped.has(entry.name)) continue;

			const path = relative === "" ? entry.name : `${relative}/${entry.name}`;

			if (entry.isDirectory())
			{
				folders.push(path);
				await visit(path);
			}
			else
			{
				files.push(path);
			}
		}
	}

	await visit("");

	return { files, folders };
}

/**
 * Makes `workspaceFolder` match `templateFolder`: files that differ or are missing are written (a file that already matches is
 * left alone, so its timestamp does not make UBT rebuild it), and files and folders the template does not have are removed, which
 * takes out every quest and test of the last run. `skipped` top-level names (the build outputs) are never read, written or
 * removed. `textOverrides` gives the wanted text of files that are not copied as they are (the `.uproject`).
 */
export async function syncWorkspace(templateFolder: string, workspaceFolder: string, textOverrides: ReadonlyMap<string, string>, skipped: ReadonlySet<string>): Promise<SyncSummary>
{
	const summary: SyncSummary = { written: [], removed: [] };
	const template = await listTree(templateFolder, skipped);

	for (const path of template.folders) await mkdir(join(workspaceFolder, path), { recursive: true });

	for (const path of template.files)
	{
		const wanted = textOverrides.has(path) ? Buffer.from(textOverrides.get(path) ?? "", "utf8") : await readFile(join(templateFolder, path));
		const existing = await readFile(join(workspaceFolder, path)).catch(() => undefined);

		if (existing !== undefined && existing.equals(wanted)) continue;

		await mkdir(dirname(join(workspaceFolder, path)), { recursive: true });
		await writeFile(join(workspaceFolder, path), wanted);
		summary.written.push(path);
	}

	// Windows and macOS file systems ignore case, so a template file renamed only by case is the file just written, not a stale one.
	const fold = (path: string): string => (process.platform === "win32" || process.platform === "darwin" ? path.toLowerCase() : path);
	const wantedFiles = new Set(template.files.map(fold));
	const wantedFolders = new Set(template.folders.map(fold));
	const present = await listTree(workspaceFolder, skipped);

	// Folders first: a folder the template lacks goes with everything in it.
	for (const path of present.folders)
	{
		if (wantedFolders.has(fold(path)) || summary.removed.some((removed) => path.startsWith(`${removed}/`))) continue;

		await rm(join(workspaceFolder, path), REMOVE_OPTIONS);
		summary.removed.push(path);
	}

	for (const path of present.files)
	{
		if (wantedFiles.has(fold(path)) || summary.removed.some((removed) => path.startsWith(`${removed}/`))) continue;

		await rm(join(workspaceFolder, path), REMOVE_OPTIONS);
		summary.removed.push(path);
	}

	return summary;
}
