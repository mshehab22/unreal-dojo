// Loads a whole content folder (packs, worlds, quests, glossary, patterns) and collects every problem with its file.
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

import type { z } from "zod";

import type { AuthoredQuest, ContentProblem, LoadedContent, Pack, World } from "@shared/types/content";

import { ProblemList } from "./ProblemList";
import { parseQuestFile } from "./parseQuestFile";
import { readGlossary, readPatterns } from "./readGlossaryAndPatterns";
import { packManifestSchema, worldManifestSchema } from "./schemas/contentFileSchemas";
import { validateWith } from "./schemas/validateWith";

/** Where a load spent its time, for the slow-load warning. Reads overlap, so their total can exceed the elapsed time. */
export interface ContentLoadTimings
{
	/** How many quest files were read. */
	questFileCount: number;

	/** The time each quest file read took, added up. The reads overlap, and a pause of the main thread counts against every read still in flight, so read it together with the main-process stall. */
	totalReadMilliseconds: number;

	/** The time parsing quest files took, added up. It runs on the main thread. */
	totalParseMilliseconds: number;
}

/** What to load; with no options the loader reads every pack. */
export interface ContentLoadOptions
{
	/** Only read this pack's folder. The glossary and patterns are always read. */
	packId?: string;

	/** Called once when the load ends, with where the time went. */
	onTimings?: (timings: ContentLoadTimings) => void;
}

/** Matches a numbered folder or file name such as `01-actors` or `03-spawn-a-door.md`, capturing the number and the rest. */
const NUMBERED_NAME_PATTERN = /^(\d{2,})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

/** A quest that parsed, with the file it came from. */
interface QuestFromFile
{
	quest: AuthoredQuest;
	file: string;
}

/** State for one `load()` call: the result being built and every quest parsed so far with its file. */
interface LoadRun
{
	content: LoadedContent;
	parsedQuests: QuestFromFile[];

	/** The folder (relative to the content folder) each loaded world was read from, for problems that name it. */
	worldFolders: Map<World, string>;

	/** Where the quest file reads and parses spent their time. */
	timings: ContentLoadTimings;
}

/** Returns the timings of a load that has read nothing yet. */
function emptyTimings(): ContentLoadTimings
{
	return { questFileCount: 0, totalReadMilliseconds: 0, totalParseMilliseconds: 0 };
}

/** Loads content from one folder. One loader per folder; `load()` may be called again to reload. */
export class ContentLoader
{
	private readonly root: string;

	/** `root` is the content folder, the one holding `glossary.json` and `packs/`. */
	constructor(root: string)
	{
		this.root = root;
	}

	/** Reads everything and returns the typed content. A file with problems is left out of the result and its problems are listed. */
	async load(options: ContentLoadOptions = {}): Promise<LoadedContent>
	{
		const content: LoadedContent = { packs: [], glossary: [], patterns: [], files: [], questSources: {}, problems: [] };
		const run: LoadRun = { content, parsedQuests: [], worldFolders: new Map(), timings: emptyTimings() };

		if (!(await this.isDirectory(this.root)))
		{
			content.problems.push({ file: ".", message: `content folder not found: ${this.root}` });
			return content;
		}

		const [glossary, patterns, packs] = await Promise.all([
			this.readJsonList("glossary.json", readGlossary, content),
			this.readJsonList("patterns.json", readPatterns, content),
			this.readPacks(options, run),
		]);

		content.glossary = this.dropDuplicates(glossary, "glossary entry", "glossary.json", content.problems);
		content.patterns = this.dropDuplicates(patterns, "pattern card", "patterns.json", content.problems);

		const uniquePacks = this.dropCrossPackWorldIds(packs, run);
		const dropped = this.dropDuplicateQuestIds(run);

		content.packs = uniquePacks.map((pack) => ({
			...pack,
			worlds: pack.worlds.map((world) => ({ ...world, quests: world.quests.filter((quest) => !dropped.has(quest)) })),
		}));

		content.files.sort();
		options.onTimings?.(run.timings);

		return content;
	}

	/**
	 * Parses the format examples in `examples/` as standalone quests. They are not part of any pack and the app
	 * never shows them; the verifier parses them so the examples authors copy from can never go stale.
	 */
	async loadExamples(): Promise<{ quests: AuthoredQuest[]; files: string[]; questSources: Record<string, string>; problems: ContentProblem[] }>
	{
		const folder = join(this.root, "examples");
		const run: LoadRun = { content: { packs: [], glossary: [], patterns: [], files: [], questSources: {}, problems: [] }, parsedQuests: [], worldFolders: new Map(), timings: emptyTimings() };

		if (!(await this.isDirectory(folder))) return { quests: [], files: [], questSources: {}, problems: [] };

		const names = (await readdir(folder)).filter((name) => name.endsWith(".md")).sort();
		const parsed = await Promise.all(names.map((name) => this.readQuest(join(folder, name), run)));

		run.parsedQuests = parsed.filter((result): result is QuestFromFile => result !== undefined);

		const dropped = this.dropDuplicateQuestIds(run);
		const quests = run.parsedQuests.map((result) => result.quest).filter((quest) => !dropped.has(quest));

		return { quests, files: run.content.files.sort(), questSources: run.content.questSources, problems: run.content.problems };
	}

	/** Reads `glossary.json` or `patterns.json` if present; an absent file means no entries yet. */
	private async readJsonList<Entry>(name: string, read: (text: string, problems: ProblemList) => Entry[], content: LoadedContent): Promise<Entry[]>
	{
		const path = join(this.root, name);

		if (!(await this.isFile(path))) return [];

		const problems = new ProblemList(name);
		const entries = read(await readFile(path, "utf8"), problems);

		content.files.push(name);
		content.problems.push(...problems.problems);

		return entries;
	}

	/** Reads every pack folder under `packs/`, sorted by each pack's `order`. */
	private async readPacks(options: ContentLoadOptions, run: LoadRun): Promise<Pack[]>
	{
		const content = run.content;
		const packsFolder = join(this.root, "packs");

		if (!(await this.isDirectory(packsFolder))) return [];

		const folderNames = await this.listFolders(packsFolder);
		const chosen = options.packId === undefined ? folderNames : folderNames.filter((name) => name === options.packId);

		if (options.packId !== undefined && chosen.length === 0)
		{
			content.problems.push({ file: "packs", message: `no pack folder named "${options.packId}"` });
		}

		const packs = await Promise.all(chosen.map((name) => this.readPack(join(packsFolder, name), name, run)));
		const loaded = this.dropDuplicates(packs.filter((pack): pack is Pack => pack !== undefined), "pack", "packs", content.problems);

		return loaded.sort((first, second) => first.order - second.order);
	}

	/** Reads one pack: its `pack.json` and every world folder. */
	private async readPack(folder: string, folderName: string, run: LoadRun): Promise<Pack | undefined>
	{
		const content = run.content;
		const manifest = await this.readManifest(join(folder, "pack.json"), content, packManifestSchema);

		if (manifest !== undefined && manifest.id !== folderName)
		{
			content.problems.push({ file: this.relativePath(join(folder, "pack.json")), section: "id", message: `pack id "${manifest.id}" must match its folder name "${folderName}"` });
		}

		const worldsFolder = join(folder, "worlds");
		const worldFolderNames = (await this.isDirectory(worldsFolder)) ? await this.listFolders(worldsFolder) : [];
		const worlds = await Promise.all(worldFolderNames.map((name) => this.readWorld(join(worldsFolder, name), name, run)));
		const sortedWorlds = worlds.filter((world): world is World => world !== undefined).sort((first, second) => first.order - second.order);
		const loadedWorlds = this.dropDuplicates(sortedWorlds, "world", this.relativePath(worldsFolder), content.problems);

		return manifest === undefined ? undefined : { ...manifest, worlds: loadedWorlds };
	}

	/** Reads one `<nn-world-id>` folder: its `world.json` and every `<nn-slug>.md` quest file. */
	private async readWorld(folder: string, folderName: string, run: LoadRun): Promise<World | undefined>
	{
		const content = run.content;
		const folderPath = this.relativePath(folder);
		const nameMatch = NUMBERED_NAME_PATTERN.exec(folderName);

		if (nameMatch?.[1] === undefined || nameMatch[2] === undefined)
		{
			content.problems.push({ file: folderPath, message: "world folders are named <nn>-<world-id>, for example 01-actors" });
			return undefined;
		}

		const order = Number(nameMatch[1]);
		const worldId = nameMatch[2];
		const manifestPath = join(folder, "world.json");
		const manifest = await this.readManifest(manifestPath, content, worldManifestSchema);

		if (manifest !== undefined && manifest.id !== worldId)
		{
			content.problems.push({ file: this.relativePath(manifestPath), section: "id", message: `world id "${manifest.id}" must match the folder name after the number ("${worldId}")` });
		}

		// Sorted so "the earlier file" in duplicate reports is the same on every platform.
		const entries = (await readdir(folder, { withFileTypes: true })).sort((first, second) => first.name.localeCompare(second.name));
		const questFiles: string[] = [];

		for (const entry of entries)
		{
			if (entry.name === "world.json" || entry.name.startsWith(".")) continue;

			const isQuestFile = entry.isFile() && entry.name.endsWith(".md") && NUMBERED_NAME_PATTERN.test(entry.name.slice(0, -3));

			if (isQuestFile) questFiles.push(entry.name);
			else content.problems.push({ file: `${folderPath}/${entry.name}`, message: "unexpected file; a world folder holds world.json and <nn>-<slug>.md quest files only" });
		}

		const parsed = await Promise.all(questFiles.map((name) => this.readQuest(join(folder, name), run)));
		const quests = this.dropRepeatedOrder(parsed.filter((result): result is QuestFromFile => result !== undefined), content.problems);

		// Quests of a world whose world.json failed are still checked for duplicate ids.
		run.parsedQuests.push(...quests);

		if (manifest === undefined) return undefined;

		const world: World = { ...manifest, order, quests: quests.map((result) => result.quest).sort((first, second) => first.order - second.order) };

		run.worldFolders.set(world, folderPath);

		return world;
	}

	/** Reads and parses one quest file, adding how long each took to the run's timings. */
	private async readQuest(path: string, run: LoadRun): Promise<QuestFromFile | undefined>
	{
		const content = run.content;
		const file = this.relativePath(path);
		const problems = new ProblemList(file);
		const readStartedAt = performance.now();
		const text = await readFile(path, "utf8");
		const parseStartedAt = performance.now();
		const quest = parseQuestFile(text, problems);

		run.timings.questFileCount += 1;
		run.timings.totalReadMilliseconds += parseStartedAt - readStartedAt;
		run.timings.totalParseMilliseconds += performance.now() - parseStartedAt;

		content.files.push(file);
		content.problems.push(...problems.problems);

		return quest === undefined ? undefined : { quest, file };
	}

	/** Reads a `pack.json` or `world.json` against `schema`, reporting a missing file, bad JSON, or bad fields. */
	private async readManifest<Manifest>(path: string, content: LoadedContent, schema: z.ZodType<Manifest>): Promise<Manifest | undefined>
	{
		const file = this.relativePath(path);
		const problems = new ProblemList(file);

		if (!(await this.isFile(path)))
		{
			content.problems.push({ file, message: "file is missing" });
			return undefined;
		}

		content.files.push(file);

		let data: unknown;

		try
		{
			data = JSON.parse(await readFile(path, "utf8"));
		}
		catch (error)
		{
			content.problems.push({ file, message: `JSON is malformed: ${error instanceof Error ? error.message : String(error)}` });
			return undefined;
		}

		const manifest = validateWith(schema, data, problems, {});

		content.problems.push(...problems.problems);

		return manifest;
	}

	/**
	 * Reports a world id that a world in another pack already uses (A73): the catalog, `getWorld`, and the drill bank look
	 * worlds up by bare id. Packs are taken in pack order; the later world is reported on its `world.json`, naming the
	 * earlier one, and is left out with its quests. Returns the packs without those worlds.
	 */
	private dropCrossPackWorldIds(packs: readonly Pack[], run: LoadRun): Pack[]
	{
		const firstFolder = new Map<string, string>();
		const droppedFolders: string[] = [];

		const kept = packs.map((pack) =>
		{
			const worlds = pack.worlds.filter((world) =>
			{
				const folder = run.worldFolders.get(world) ?? `packs/${pack.id}/worlds`;
				const earlier = firstFolder.get(world.id);

				if (earlier === undefined)
				{
					firstFolder.set(world.id, folder);
					return true;
				}

				run.content.problems.push({ file: `${folder}/world.json`, section: "id", message: `world id "${world.id}" is already used by ${earlier}/world.json in another pack; world ids must be unique across packs (A73)` });
				droppedFolders.push(`${folder}/`);
				return false;
			});

			return { ...pack, worlds };
		});

		// A left-out world's quests are left out too, so they never claim quest ids or appear in questSources.
		run.parsedQuests = run.parsedQuests.filter((result) => !droppedFolders.some((folder) => result.file.startsWith(folder)));

		return kept;
	}

	/**
	 * Reports quest ids used by more than one file and records where each kept quest came from. The first file
	 * by path keeps the id; every later file is flagged and its quest is returned so it can be left out.
	 */
	private dropDuplicateQuestIds(run: LoadRun): Set<AuthoredQuest>
	{
		const sorted = [...run.parsedQuests].sort((first, second) => first.file.localeCompare(second.file));
		const dropped = new Set<AuthoredQuest>();

		for (const { quest, file } of sorted)
		{
			const earlier = run.content.questSources[quest.id];

			if (earlier === undefined)
			{
				run.content.questSources[quest.id] = file;
				continue;
			}

			run.content.problems.push({ file, section: "front matter", message: `duplicate quest id "${quest.id}" (also used in ${earlier})` });
			dropped.add(quest);
		}

		return dropped;
	}

	/** Reports quest files in one world that reuse an earlier file's `order`, and returns the quests without them. */
	private dropRepeatedOrder(quests: readonly QuestFromFile[], problems: ContentProblem[]): QuestFromFile[]
	{
		const byOrder = new Map<number, string>();
		const kept: QuestFromFile[] = [];

		for (const result of quests)
		{
			const earlier = byOrder.get(result.quest.order);

			if (earlier !== undefined)
			{
				problems.push({ file: result.file, section: "front matter", message: `order ${result.quest.order} is already used by ${earlier} in this world` });
				continue;
			}

			byOrder.set(result.quest.order, result.file);
			kept.push(result);
		}

		return kept;
	}

	/** Reports entries that reuse an earlier entry's id inside one list (glossary, patterns, packs, worlds) and returns the list without them. */
	private dropDuplicates<Entry extends { id: string }>(entries: readonly Entry[], what: string, file: string, problems: ContentProblem[]): Entry[]
	{
		const seen = new Set<string>();
		const kept: Entry[] = [];

		for (const entry of entries)
		{
			if (seen.has(entry.id))
			{
				problems.push({ file, message: `duplicate ${what} id "${entry.id}"` });
				continue;
			}

			seen.add(entry.id);
			kept.push(entry);
		}

		return kept;
	}

	/** Lists the sub-folders of a folder, sorted by name, skipping hidden ones. */
	private async listFolders(folder: string): Promise<string[]>
	{
		const entries = await readdir(folder, { withFileTypes: true });

		return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name).sort();
	}

	/** Whether a path exists and is a folder. */
	private async isDirectory(path: string): Promise<boolean>
	{
		return (await stat(path).catch(() => undefined))?.isDirectory() ?? false;
	}

	/** Whether a path exists and is a file. */
	private async isFile(path: string): Promise<boolean>
	{
		return (await stat(path).catch(() => undefined))?.isFile() ?? false;
	}

	/** A path relative to the content folder with forward slashes on every platform. */
	private relativePath(path: string): string
	{
		return relative(this.root, path).split(sep).join("/");
	}
}
