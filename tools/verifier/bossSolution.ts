// Reads a boss's reference integration from `tools/solutions/<boss-id>/` (A67, A215): code, `*.Test.cpp` tests, and piece overrides.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

/** A boss test file name ends with this; every other `.h` or `.cpp` file in the folder is integration code. */
export const BOSS_TEST_SUFFIX = ".Test.cpp";

/** One file of a boss's reference integration. */
export interface BossSolutionFile
{
	name: string;
	text: string;
}

/** A boss's integration split into code, tests, and piece overrides, or undefined when the folder does not exist. */
export interface BossSolution
{
	code: BossSolutionFile[];
	tests: BossSolutionFile[];

	/**
	 * Extended files of piece quests, keyed by piece quest id, from `<boss-id>/<piece-quest-id>/`. When the boss is built
	 * they replace those files in that piece's folder, because the boss needs members the piece solution does not have.
	 */
	overrides: Map<string, BossSolutionFile[]>;

	/** Files that are neither `.h` nor `.cpp`, as paths inside the boss folder. */
	otherNames: string[];
}

/** Reads the `.h` and `.cpp` files of one folder, sorted by name, and lists everything else. */
async function readCodeFolder(folder: string, prefix: string, otherNames: string[]): Promise<{ files: BossSolutionFile[]; folders: string[] }>
{
	const entries = (await readdir(folder, { withFileTypes: true })).filter((entry) => !entry.name.startsWith(".")).sort((first, second) => first.name.localeCompare(second.name));
	const files: BossSolutionFile[] = [];
	const folders: string[] = [];

	for (const entry of entries)
	{
		if (entry.isDirectory())
		{
			folders.push(entry.name);
			continue;
		}

		if (!entry.isFile()) continue;

		if (entry.name.endsWith(".h") || entry.name.endsWith(".cpp")) files.push({ name: entry.name, text: await readFile(join(folder, entry.name), "utf8") });
		else otherNames.push(`${prefix}${entry.name}`);
	}

	return { files, folders };
}

/** Reads every file in `<solutionsFolder>/<bossId>/` and its piece override folders; undefined when there is no such folder. */
export async function readBossSolution(solutionsFolder: string, bossId: string): Promise<BossSolution | undefined>
{
	const folder = join(solutionsFolder, bossId);
	const exists = await readdir(folder).then(() => true, () => false);

	if (!exists) return undefined;

	const solution: BossSolution = { code: [], tests: [], overrides: new Map(), otherNames: [] };
	const top = await readCodeFolder(folder, "", solution.otherNames);

	for (const file of top.files)
	{
		if (file.name.endsWith(BOSS_TEST_SUFFIX)) solution.tests.push(file);
		else solution.code.push(file);
	}

	for (const pieceId of top.folders)
	{
		const piece = await readCodeFolder(join(folder, pieceId), `${pieceId}/`, solution.otherNames);

		for (const nested of piece.folders) solution.otherNames.push(`${pieceId}/${nested}/`);

		solution.overrides.set(pieceId, piece.files);
	}

	return solution;
}
