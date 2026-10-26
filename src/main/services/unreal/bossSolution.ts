// Reads a boss's reference integration from `tools/solutions/<boss-id>/` (A67, A215): code, `*.Test.cpp` tests, and piece overrides.
// One implementation for the verifier and the app (moved from tools/verifier in M1.3b fix round 1).
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

/** One folder's entries, split into files and folders. */
export interface FolderListing
{
	files: string[];
	folders: string[];
}

/** The file access the reader needs, so the app can pass its own file system and tests a fake. */
export interface BossFolderReader
{
	/** Joins path parts the way this file system spells paths, so the keys the reader looks up match what it lists. */
	join(...parts: string[]): string;

	/** The folder's files and subfolders, or undefined when the folder does not exist. */
	listFolder(folder: string): Promise<FolderListing | undefined>;

	/** A file's UTF-8 text. */
	readText(filePath: string): Promise<string>;
}

/** Reads the real disk. */
export const NODE_BOSS_FOLDER_READER: BossFolderReader = {
	join,
	listFolder: async (folder) =>
	{
		const entries = await readdir(folder, { withFileTypes: true }).catch(() => undefined);
		if (!entries) return undefined;

		return { files: entries.filter((entry) => entry.isFile()).map((entry) => entry.name), folders: entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name) };
	},
	readText: (filePath) => readFile(filePath, "utf8"),
};

/** Reads the `.h` and `.cpp` files of one folder, sorted by name, and lists everything else. */
async function readCodeFolder(reader: BossFolderReader, folder: string, prefix: string, otherNames: string[]): Promise<{ files: BossSolutionFile[]; folders: string[] }>
{
	const listing = (await reader.listFolder(folder)) ?? { files: [], folders: [] };
	const byName = (first: string, second: string): number => first.localeCompare(second);
	const files: BossSolutionFile[] = [];
	const folders = listing.folders.filter((name) => !name.startsWith(".")).sort(byName);

	for (const name of listing.files.filter((fileName) => !fileName.startsWith(".")).sort(byName))
	{
		if (name.endsWith(".h") || name.endsWith(".cpp")) files.push({ name, text: await reader.readText(reader.join(folder, name)) });
		else otherNames.push(`${prefix}${name}`);
	}

	return { files, folders };
}

/** Reads every file in `<solutionsFolder>/<bossId>/` and its piece override folders; undefined when there is no such folder. */
export async function readBossSolution(solutionsFolder: string, bossId: string, reader: BossFolderReader = NODE_BOSS_FOLDER_READER): Promise<BossSolution | undefined>
{
	const folder = reader.join(solutionsFolder, bossId);

	if (!(await reader.listFolder(folder))) return undefined;

	const solution: BossSolution = { code: [], tests: [], overrides: new Map(), otherNames: [] };
	const top = await readCodeFolder(reader, folder, "", solution.otherNames);

	for (const file of top.files)
	{
		if (file.name.endsWith(BOSS_TEST_SUFFIX)) solution.tests.push(file);
		else solution.code.push(file);
	}

	for (const pieceId of top.folders)
	{
		const piece = await readCodeFolder(reader, reader.join(folder, pieceId), `${pieceId}/`, solution.otherNames);

		for (const nested of piece.folders) solution.otherNames.push(`${pieceId}/${nested}/`);

		solution.overrides.set(pieceId, piece.files);
	}

	return solution;
}
