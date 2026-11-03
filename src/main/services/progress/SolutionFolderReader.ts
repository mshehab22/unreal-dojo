// Reads a quest's reference solution from `<solutions folder>/<quest-id>/` on disk: the files directly in that folder, in name order (A1390).
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import type { SolutionSource } from "./SolutionSource";

/** A quest id is one folder name: letters, digits, dots, dashes, and underscores, never a path. */
const QUEST_FOLDER_NAME = /^[A-Za-z0-9._-]+$/;

/** Reads reference solutions from the solutions folder the app ships (`tools/solutions` in development, `solutions/` beside the asar when packaged, A406). */
export class SolutionFolderReader implements SolutionSource
{
	/** Takes the solutions folder. */
	constructor(private readonly solutionsFolder: string)
	{
	}

	/** The files directly in the quest's folder (a boss's piece override folders are left out), or null when there is no such folder or it holds no file. */
	async filesOf(questId: string): Promise<Record<string, string> | null>
	{
		if (!QUEST_FOLDER_NAME.test(questId) || questId === "." || questId === "..") return null;

		const folder = join(this.solutionsFolder, questId);
		let names: string[];

		try
		{
			const entries = await readdir(folder, { withFileTypes: true });
			names = entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
		}
		catch
		{
			return null;
		}

		if (names.length === 0) return null;

		const files: Record<string, string> = {};

		for (const name of names) files[name] = await readFile(join(folder, name), "utf8");

		return files;
	}
}
