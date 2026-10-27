// Builds a throwaway content folder with hundreds of quests cloned from the real content, for the load budget test.
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

/** The number of quests the load budget is stated for. */
export const LARGE_QUEST_COUNT = 300;

/** How many quests share a world in the large fixture. */
export const LARGE_QUESTS_PER_WORLD = 25;

/** Matches the front matter block (the two `---` lines and everything between them) at the top of a quest file. */
const FRONT_MATTER_PATTERN = /^---\r?\n[\s\S]*?\r?\n---/;

/** Matches a top-level `pieces:` list of quest ids in a boss's front matter, including its list lines. */
const PIECES_PATTERN = /^pieces:\r?\n(?:[ \t]*- .+\r?\n)+/m;

/** A real quest file: its text, its id, the quest ids it points at, and the file name without its number. */
interface RealQuestFile
{
	text: string;
	id: string;
	prerequisites: string[];
	pieces: string[];
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

/** Returns the front matter block of a quest file, or an empty string when it has none. */
function frontMatterOf(text: string): string
{
	return FRONT_MATTER_PATTERN.exec(text)?.[0] ?? "";
}

/** Reads one real quest file and picks out its id, the quest ids it points at, and its slug. */
async function readRealQuestFile(path: string, fileName: string): Promise<RealQuestFile>
{
	const text = await readFile(path, "utf8");
	const frontMatter = frontMatterOf(text);
	const id = /^id: (.+?)\r?$/m.exec(frontMatter)?.[1] ?? "";
	const prerequisiteList = /^prerequisites: \[(.*)\]\r?$/m.exec(frontMatter)?.[1] ?? "";
	const prerequisites = prerequisiteList.split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0);
	const piecesBlock = PIECES_PATTERN.exec(frontMatter)?.[0] ?? "";
	const pieces = [...piecesBlock.matchAll(/^[ \t]*- (.+?)\r?$/gm)].map((match) => match[1] ?? "");

	return { text, id, prerequisites, pieces, slug: fileName.replace(/^\d+-/, "").replace(/\.md$/, "") };
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

/** Gives a real quest a new id and order and the same prefix on every quest id it points at (prerequisites, boss pieces), keeping the rest byte for byte. */
function retagRealQuest(quest: RealQuestFile, idPrefix: string, order: number): string
{
	const frontMatter = frontMatterOf(quest.text);
	const prerequisites = quest.prerequisites.map((prerequisite) => `${idPrefix}${prerequisite}`).join(", ");

	const retaggedFrontMatter = frontMatter
		.replace(/^id: .+?(\r?)$/m, `id: ${idPrefix}${quest.id}$1`)
		.replace(/^order: .+?(\r?)$/m, `order: ${order}$1`)
		.replace(/^prerequisites: \[.*\](\r?)$/m, `prerequisites: [${prerequisites}]$1`)
		.replace(PIECES_PATTERN, (block) => block.replace(/^([ \t]*- )(.+?)(\r?)$/gm, `$1${idPrefix}$2$3`));

	return retaggedFrontMatter + quest.text.slice(frontMatter.length);
}

/** Copies the real glossary with each `firstQuestId` pointing at the first clone of that quest, and records each pointer so the dangling check covers it. */
function retagGlossary(text: string, idPrefix: string, pointers: { from: string; to: string }[]): string
{
	const entries = JSON.parse(text) as { id?: string; firstQuestId?: string }[];

	for (const entry of entries)
	{
		if (entry.firstQuestId === undefined) continue;

		entry.firstQuestId = `${idPrefix}${entry.firstQuestId}`;
		pointers.push({ from: `glossary ${entry.id ?? "entry"}`, to: entry.firstQuestId });
	}

	return JSON.stringify(entries);
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
 * Clones run through the real quests in order, again and again; the nth clone of a pass gets that pass's id prefix, so ids
 * stay unique. Worlds are numbered across all clones (`ceil(questCount / questsPerWorld)` of them), each in the pack of the pass its first
 * quest belongs to. Prerequisites and boss pieces point at the clone of the same pass; the build throws if any would dangle.
 * Works on real disk, and removes the folder again when the build fails.
 */
export async function createLargeContentFixture(questCount: number = LARGE_QUEST_COUNT, questsPerWorld: number = LARGE_QUESTS_PER_WORLD): Promise<LargeContentFixture>
{
	const root = await mkdtemp(join(tmpdir(), "dojo-large-content-"));

	try
	{
		return await writeLargeContent(root, questCount, questsPerWorld);
	}
	catch (thrown)
	{
		await rm(root, { recursive: true, force: true });

		throw thrown;
	}
}

/** Writes the large content into an existing empty folder and returns the fixture that owns it. */
async function writeLargeContent(root: string, questCount: number, questsPerWorld: number): Promise<LargeContentFixture>
{
	const realQuests = await readRealQuestFiles();

	if (realQuests.length === 0) throw new Error("The large content fixture found no real quests under content/packs to clone.");

	const writes: Promise<void>[] = [];
	const writtenIds = new Set<string>();
	const pointers: { from: string; to: string }[] = [];
	const worldFolders = new Set<string>();
	const packNumbers = new Set<number>();

	writes.push(writeFileUnder(root, "glossary.json", retagGlossary(await readFile(resolve("content", "glossary.json"), "utf8"), "load1-", pointers)));
	writes.push(writeFileUnder(root, "patterns.json", await readFile(resolve("content", "patterns.json"), "utf8")));

	for (let position = 0; position < questCount; position++)
	{
		const quest = realQuests[position % realQuests.length];
		if (!quest) continue;

		const pass = Math.floor(position / realQuests.length) + 1;
		const idPrefix = `load${pass}-`;
		const worldNumber = Math.floor(position / questsPerWorld) + 1;
		const worldId = `load-world-${String(worldNumber).padStart(2, "0")}`;
		const packNumber = Math.floor(((worldNumber - 1) * questsPerWorld) / realQuests.length) + 1;
		const worldFolder = `packs/load-pack-${packNumber}/worlds/${String(worldNumber).padStart(2, "0")}-${worldId}`;
		const order = (position % questsPerWorld) + 1;

		if (!packNumbers.has(packNumber))
		{
			packNumbers.add(packNumber);
			writes.push(writeFileUnder(root, `packs/load-pack-${packNumber}/pack.json`, JSON.stringify({ id: `load-pack-${packNumber}`, title: `Load pack ${packNumber}`, summary: "A cloned pack for the load budget.", order: packNumber })));
		}

		if (!worldFolders.has(worldFolder))
		{
			worldFolders.add(worldFolder);
			writes.push(writeFileUnder(root, `${worldFolder}/world.json`, JSON.stringify({ id: worldId, title: `Load world ${worldNumber}`, summary: "A cloned world for the load budget." })));
		}

		writtenIds.add(`${idPrefix}${quest.id}`);

		for (const pointed of [...quest.prerequisites, ...quest.pieces]) pointers.push({ from: `${idPrefix}${quest.id}`, to: `${idPrefix}${pointed}` });

		writes.push(writeFileUnder(root, `${worldFolder}/${String(order).padStart(2, "0")}-${quest.slug}.md`, retagRealQuest(quest, idPrefix, order)));
	}

	const dangling = pointers.filter((pointer) => !writtenIds.has(pointer.to));

	if (dangling.length > 0) throw new Error(`The large content fixture would leave ${dangling.length} dangling quest ids, for example ${dangling[0]?.from} -> ${dangling[0]?.to}.`);

	await Promise.all(writes);

	return {
		root,
		questCount,
		worldCount: worldFolders.size,
		async remove()
		{
			await rm(root, { recursive: true, force: true });
		},
	};
}
