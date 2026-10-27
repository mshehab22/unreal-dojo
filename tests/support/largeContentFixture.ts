// Builds a throwaway content folder with hundreds of quests cloned from the real content, for the load budget test.
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

/** The number of quests the load budget is stated for. */
export const LARGE_QUEST_COUNT = 300;

/** A real quest file: its text, its id, its prerequisites, and the file name without its number. */
interface RealQuestFile
{
	text: string;
	id: string;
	prerequisites: string[];
	slug: string;
}

/** A large content folder on real disk; call `remove()` when the test is done. */
export interface LargeContentFixture
{
	/** The content folder to give to the catalog. */
	root: string;

	/** How many quests were written. */
	questCount: number;

	/** How many worlds were written. */
	worldCount: number;

	/** Deletes the folder. */
	remove(): Promise<void>;
}

/** Lists the sub-folders of a folder, sorted by name. */
async function listFolders(folder: string): Promise<string[]>
{
	const entries = await readdir(folder, { withFileTypes: true });

	return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

/** Reads one real quest file and picks out its id, prerequisites, and slug. */
async function readRealQuestFile(path: string, fileName: string): Promise<RealQuestFile>
{
	const text = await readFile(path, "utf8");
	const id = /^id: (.+?)\r?$/m.exec(text)?.[1] ?? "";
	const prerequisiteList = /^prerequisites: \[(.*)\]\r?$/m.exec(text)?.[1] ?? "";
	const prerequisites = prerequisiteList.split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0);

	return { text, id, prerequisites, slug: fileName.replace(/^\d+-/, "").replace(/\.md$/, "") };
}

/** Reads every real quest file under `content/packs`, in pack order, then world order, then quest order. */
async function readRealQuestFiles(): Promise<RealQuestFile[]>
{
	const packsFolder = resolve("content", "packs");
	const quests: RealQuestFile[] = [];
	const packs: { folder: string; order: number }[] = [];

	for (const packFolder of await listFolders(packsFolder))
	{
		const manifest = JSON.parse(await readFile(join(packsFolder, packFolder, "pack.json"), "utf8")) as { order: number };

		packs.push({ folder: packFolder, order: manifest.order });
	}

	packs.sort((first, second) => first.order - second.order);

	for (const pack of packs)
	{
		const worldsFolder = join(packsFolder, pack.folder, "worlds");

		for (const worldFolder of await listFolders(worldsFolder))
		{
			const fileNames = (await readdir(join(worldsFolder, worldFolder))).filter((name) => name.endsWith(".md")).sort();

			for (const fileName of fileNames) quests.push(await readRealQuestFile(join(worldsFolder, worldFolder, fileName), fileName));
		}
	}

	return quests;
}

/** Gives a real quest a new id, order, and prerequisite ids, keeping everything else byte for byte. */
function retagRealQuest(quest: RealQuestFile, idPrefix: string, order: number): string
{
	const prerequisites = quest.prerequisites.map((prerequisite) => `${idPrefix}${prerequisite}`).join(", ");

	return quest.text
		.replace(/^id: .+?(\r?)$/m, `id: ${idPrefix}${quest.id}$1`)
		.replace(/^order: .+?(\r?)$/m, `order: ${order}$1`)
		.replace(/^prerequisites: \[.*\](\r?)$/m, `prerequisites: [${prerequisites}]$1`);
}

/** Writes one file under the root, creating its folder. */
async function writeFileUnder(root: string, path: string, text: string): Promise<void>
{
	const full = join(root, path);

	await mkdir(dirname(full), { recursive: true });
	await writeFile(full, text, "utf8");
}

/**
 * Creates a content folder holding the real glossary and patterns plus `questCount` quests cloned from the real packs.
 * Each pass over the real quests becomes one pack of worlds of `questsPerWorld`; ids are prefixed per pass, so ids stay
 * unique, orders restart in each world, and prerequisites point at the clone of the same pass. Works on real disk.
 */
export async function createLargeContentFixture(questCount: number = LARGE_QUEST_COUNT, questsPerWorld: number = 25): Promise<LargeContentFixture>
{
	const root = await mkdtemp(join(tmpdir(), "dojo-large-content-"));
	const realQuests = await readRealQuestFiles();
	const writes: Promise<void>[] = [];
	let worldCount = 0;

	for (const name of ["glossary.json", "patterns.json"]) writes.push(writeFileUnder(root, name, await readFile(resolve("content", name), "utf8")));

	for (let passStart = 0, pass = 1; passStart < questCount; passStart += realQuests.length, pass++)
	{
		const packId = `load-pack-${pass}`;
		const questsInPass = Math.min(realQuests.length, questCount - passStart);

		writes.push(writeFileUnder(root, `packs/${packId}/pack.json`, JSON.stringify({ id: packId, title: `Load pack ${pass}`, summary: "A cloned pack for the load budget.", order: pass })));

		for (let index = 0; index < questsInPass; index++)
		{
			const quest = realQuests[index];
			if (!quest) continue;

			const worldNumber = Math.floor(index / questsPerWorld) + 1;
			const worldId = `load-${pass}-world-${String(worldNumber).padStart(2, "0")}`;
			const worldFolder = `packs/${packId}/worlds/${String(worldNumber).padStart(2, "0")}-${worldId}`;
			const order = (index % questsPerWorld) + 1;

			if (order === 1)
			{
				worldCount++;
				writes.push(writeFileUnder(root, `${worldFolder}/world.json`, JSON.stringify({ id: worldId, title: `Load world ${worldId}`, summary: "A cloned world for the load budget." })));
			}

			const fileName = `${String(order).padStart(2, "0")}-${quest.slug}.md`;

			writes.push(writeFileUnder(root, `${worldFolder}/${fileName}`, retagRealQuest(quest, `load${pass}-`, order)));
		}
	}

	await Promise.all(writes);

	return {
		root,
		questCount,
		worldCount,
		async remove()
		{
			await rm(root, { recursive: true, force: true });
		},
	};
}
