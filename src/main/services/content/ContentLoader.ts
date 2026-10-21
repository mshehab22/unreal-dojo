// Loads a whole content folder (packs, worlds, quests, glossary, patterns) and collects every problem with its file.
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

import type { AuthoredQuest, ContentProblem, LoadedContent, Pack, World } from "@shared/types/content";

import { ObjectReader } from "./ObjectReader";
import { ProblemList } from "./ProblemList";
import { parseQuestFile } from "./parseQuestFile";
import { readGlossary, readPatterns } from "./readGlossaryAndPatterns";

/** What to load; with no options the loader reads every pack. */
export interface ContentLoadOptions
{
	/** Only read this pack's folder. The glossary and patterns are always read. */
	packId?: string;
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
		const run: LoadRun = { content, parsedQuests: [] };

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

		content.glossary = glossary;
		content.patterns = patterns;
		content.packs = packs;

		this.reportDuplicates(glossary, "glossary entry", "glossary.json", content.problems);
		this.reportDuplicates(patterns, "pattern card", "patterns.json", content.problems);
		this.reportDuplicateQuestIds(run);

		content.files.sort();

		return content;
	}

	/**
	 * Parses the format examples in `examples/` as standalone quests. They are not part of any pack and the app
	 * never shows them; the verifier parses them so the examples authors copy from can never go stale.
	 */
	async loadExamples(): Promise<{ quests: AuthoredQuest[]; files: string[]; problems: ContentProblem[] }>
	{
		const folder = join(this.root, "examples");
		const run: LoadRun = { content: { packs: [], glossary: [], patterns: [], files: [], questSources: {}, problems: [] }, parsedQuests: [] };

		if (!(await this.isDirectory(folder))) return { quests: [], files: [], problems: [] };

		const names = (await readdir(folder)).filter((name) => name.endsWith(".md")).sort();
		const parsed = await Promise.all(names.map((name) => this.readQuest(join(folder, name), run.content)));

		run.parsedQuests = parsed.filter((result): result is QuestFromFile => result !== undefined);
		this.reportDuplicateQuestIds(run);

		return { quests: run.parsedQuests.map((result) => result.quest), files: run.content.files.sort(), problems: run.content.problems };
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
		const loaded = packs.filter((pack): pack is Pack => pack !== undefined);

		this.reportDuplicates(loaded, "pack", "packs", content.problems);

		return loaded.sort((first, second) => first.order - second.order);
	}

	/** Reads one pack: its `pack.json` and every world folder. */
	private async readPack(folder: string, folderName: string, run: LoadRun): Promise<Pack | undefined>
	{
		const content = run.content;
		const manifest = await this.readManifest(join(folder, "pack.json"), content, (reader) => ({
			id: reader.string("id"),
			title: reader.string("title"),
			summary: reader.string("summary"),
			order: reader.integer("order", 1),
		}));

		if (manifest !== undefined && manifest.id !== folderName)
		{
			content.problems.push({ file: this.relativePath(join(folder, "pack.json")), section: "id", message: `pack id "${manifest.id}" must match its folder name "${folderName}"` });
		}

		const worldsFolder = join(folder, "worlds");
		const worldFolderNames = (await this.isDirectory(worldsFolder)) ? await this.listFolders(worldsFolder) : [];
		const worlds = await Promise.all(worldFolderNames.map((name) => this.readWorld(join(worldsFolder, name), name, run)));
		const loadedWorlds = worlds.filter((world): world is World => world !== undefined).sort((first, second) => first.order - second.order);

		this.reportDuplicates(loadedWorlds, "world", this.relativePath(worldsFolder), content.problems);

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
		const manifest = await this.readManifest(manifestPath, content, (reader) => ({
			id: reader.string("id"),
			title: reader.string("title"),
			summary: reader.string("summary"),
		}));

		if (manifest !== undefined && manifest.id !== worldId)
		{
			content.problems.push({ file: this.relativePath(manifestPath), section: "id", message: `world id "${manifest.id}" must match the folder name after the number ("${worldId}")` });
		}

		const entries = await readdir(folder, { withFileTypes: true });
		const questFiles: string[] = [];

		for (const entry of entries)
		{
			if (entry.name === "world.json" || entry.name.startsWith(".")) continue;

			const isQuestFile = entry.isFile() && entry.name.endsWith(".md") && NUMBERED_NAME_PATTERN.test(entry.name.slice(0, -3));

			if (isQuestFile) questFiles.push(entry.name);
			else content.problems.push({ file: `${folderPath}/${entry.name}`, message: "unexpected file; a world folder holds world.json and <nn>-<slug>.md quest files only" });
		}

		const parsed = await Promise.all(questFiles.map((name) => this.readQuest(join(folder, name), content)));
		const quests = parsed.filter((result): result is QuestFromFile => result !== undefined);

		this.reportRepeatedOrder(quests, content.problems);

		// Quests of a world whose world.json failed are still checked for duplicate ids.
		run.parsedQuests.push(...quests);

		if (manifest === undefined) return undefined;

		return { ...manifest, order, quests: quests.map((result) => result.quest).sort((first, second) => first.order - second.order) };
	}

	/** Reads and parses one quest file. */
	private async readQuest(path: string, content: LoadedContent): Promise<QuestFromFile | undefined>
	{
		const file = this.relativePath(path);
		const problems = new ProblemList(file);
		const quest = parseQuestFile(await readFile(path, "utf8"), problems);

		content.files.push(file);
		content.problems.push(...problems.problems);

		return quest === undefined ? undefined : { quest, file };
	}

	/** Reads a `pack.json` or `world.json` with `read`, reporting a missing file, bad JSON, or bad fields. */
	private async readManifest<Manifest>(path: string, content: LoadedContent, read: (reader: ObjectReader) => Manifest): Promise<Manifest | undefined>
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

		const reader = ObjectReader.from(data, "", problems, {});
		const manifest = reader === undefined ? undefined : read(reader);

		reader?.finish();
		content.problems.push(...problems.problems);

		return problems.count > 0 ? undefined : manifest;
	}

	/** Reports quest ids used by more than one file, and records where each quest came from. */
	private reportDuplicateQuestIds(run: LoadRun): void
	{
		const sorted = [...run.parsedQuests].sort((first, second) => first.file.localeCompare(second.file));

		for (const { quest, file } of sorted)
		{
			const earlier = run.content.questSources[quest.id];

			if (earlier !== undefined) run.content.problems.push({ file, section: "front matter", message: `duplicate quest id "${quest.id}" (also used in ${earlier})` });
			else run.content.questSources[quest.id] = file;
		}
	}

	/** Reports two quest files in one world that share an `order`. */
	private reportRepeatedOrder(quests: readonly QuestFromFile[], problems: ContentProblem[]): void
	{
		const byOrder = new Map<number, string>();

		for (const { quest, file } of quests)
		{
			const earlier = byOrder.get(quest.order);

			if (earlier !== undefined) problems.push({ file, section: "front matter", message: `order ${quest.order} is already used by ${earlier} in this world` });
			else byOrder.set(quest.order, file);
		}
	}

	/** Reports entries that share an id inside one list (glossary, patterns, packs, worlds). */
	private reportDuplicates(entries: readonly { id: string }[], what: string, file: string, problems: ContentProblem[]): void
	{
		const seen = new Set<string>();

		for (const entry of entries)
		{
			if (seen.has(entry.id)) problems.push({ file, message: `duplicate ${what} id "${entry.id}"` });

			seen.add(entry.id);
		}
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
