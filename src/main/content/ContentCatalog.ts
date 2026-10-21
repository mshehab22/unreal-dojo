// Holds the content loaded once at startup and answers the renderer's content requests from it.
import type { ContentStatus, GlossaryAlias, LearnerQuest, LearnerWorld, PackOutline } from "@shared/types/catalog";
import type { AuthoredQuest, GlossaryEntry, LoadedContent, PatternCard, World } from "@shared/types/content";

import { AppErrorException } from "../errors/AppErrorException";
import { buildGlossaryAliases } from "./buildGlossaryAliases";
import { toLearnerQuest, toLearnerWorld, toPackOutlines } from "./contentViews";

/** What the catalog needs to read content; `createContentCatalog` wires the real ContentLoader and file system, tests pass fakes. */
export interface ContentCatalogDependencies
{
	/** The content folder, named in errors and in the status. */
	root: string;

	/** Tells whether the content folder exists. */
	folderExists: (folder: string) => Promise<boolean>;

	/** Reads and parses the whole content folder. */
	loadContent: () => Promise<LoadedContent>;
}

/** The loaded content with its lookups and derived views, built once per load. */
interface IndexedContent
{
	content: LoadedContent;
	packOutlines: PackOutline[];
	worldsById: Map<string, World>;
	questsById: Map<string, AuthoredQuest>;
	glossaryAliases: GlossaryAlias[];
	questCount: number;
}

/** Builds the error for a content folder that is not there (a broken install, or a source checkout without `content/`). */
function contentFolderMissing(root: string): AppErrorException
{
	return new AppErrorException("content-invalid", "Unreal Dojo could not find its lessons.", "Reinstall Unreal Dojo. When running from source, check that the content folder sits next to package.json.", `content folder not found: ${root}`);
}

/** Builds the error for a load that threw instead of listing problems. */
function contentLoadFailed(root: string, thrown: unknown): AppErrorException
{
	const reason = thrown instanceof Error ? thrown.message : String(thrown);

	return new AppErrorException("content-invalid", "Unreal Dojo could not read its lessons.", "Restart the app. If it keeps happening, reinstall Unreal Dojo and report it with the details.", `${root}: ${reason}`);
}

/**
 * Loads the content once and serves every content request from memory. A load that fails is forgotten,
 * so the next request tries again instead of failing until restart. Files with problems are left out by
 * the loader and listed in the status; only a missing folder or a thrown load rejects the requests.
 */
export class ContentCatalog
{
	private readonly dependencies: ContentCatalogDependencies;

	private loading: Promise<IndexedContent> | null = null;

	/** Keeps the dependencies; nothing is read until `startLoading` or the first request. */
	constructor(dependencies: ContentCatalogDependencies)
	{
		this.dependencies = dependencies;
	}

	/** Starts the load in the background at startup. Never throws; a failure surfaces on the first request instead. */
	startLoading(): void
	{
		this.ready().catch((thrown: unknown) => console.error("[content] load failed", thrown));
	}

	/** Returns the load counts and every problem found. */
	async getStatus(): Promise<ContentStatus>
	{
		const indexed = await this.ready();

		return {
			root: this.dependencies.root,
			packCount: indexed.content.packs.length,
			questCount: indexed.questCount,
			glossaryCount: indexed.content.glossary.length,
			patternCount: indexed.content.patterns.length,
			problems: indexed.content.problems,
		};
	}

	/** Returns every pack as an outline, in order. */
	async listPacks(): Promise<PackOutline[]>
	{
		return (await this.ready()).packOutlines;
	}

	/** Returns one world with its full quests. Throws `world-not-found` for an unknown id. */
	async getWorld(worldId: string): Promise<LearnerWorld>
	{
		const world = (await this.ready()).worldsById.get(worldId);
		if (!world) throw new AppErrorException("world-not-found", "That world is not in the loaded lessons.", "Go back to the World Map and pick it again.", worldId);

		return toLearnerWorld(world);
	}

	/** Returns one full quest. Throws `quest-not-found` for an unknown id. */
	async getQuest(questId: string): Promise<LearnerQuest>
	{
		const quest = (await this.ready()).questsById.get(questId);
		if (!quest) throw new AppErrorException("quest-not-found", "That quest is not in the loaded lessons.", "Go back to the World Map and pick it again.", questId);

		return toLearnerQuest(quest);
	}

	/** Returns the authored quest with everything, hints included, for main-process services such as hint reveal and runs. */
	async getAuthoredQuest(questId: string): Promise<AuthoredQuest | undefined>
	{
		return (await this.ready()).questsById.get(questId);
	}

	/** Returns every glossary entry. */
	async getGlossary(): Promise<GlossaryEntry[]>
	{
		return (await this.ready()).content.glossary;
	}

	/** Returns the flat alias table, longest text first. */
	async getGlossaryAliases(): Promise<GlossaryAlias[]>
	{
		return (await this.ready()).glossaryAliases;
	}

	/** Returns every pattern card. */
	async getPatternCards(): Promise<PatternCard[]>
	{
		return (await this.ready()).content.patterns;
	}

	/** Returns the current load, starting one when none is running or the last one failed. */
	private ready(): Promise<IndexedContent>
	{
		if (!this.loading)
		{
			const loading = this.loadAndIndex();
			this.loading = loading;

			loading.catch(() =>
			{
				if (this.loading === loading) this.loading = null;
			});
		}

		return this.loading;
	}

	/** Reads the content folder and builds the lookups. Throws an AppErrorException when nothing could be read. */
	private async loadAndIndex(): Promise<IndexedContent>
	{
		const root = this.dependencies.root;

		if (!(await this.dependencies.folderExists(root))) throw contentFolderMissing(root);

		let content: LoadedContent;

		try
		{
			content = await this.dependencies.loadContent();
		}
		catch (thrown)
		{
			throw contentLoadFailed(root, thrown);
		}

		const worlds = content.packs.flatMap((pack) => pack.worlds);
		const quests = worlds.flatMap((world) => world.quests);

		if (content.problems.length > 0) console.warn(`[content] loaded with ${content.problems.length} problems`, content.problems);

		return {
			content,
			packOutlines: toPackOutlines(content.packs),
			worldsById: new Map(worlds.map((world) => [world.id, world])),
			questsById: new Map(quests.map((quest) => [quest.id, quest])),
			glossaryAliases: buildGlossaryAliases(content.glossary),
			questCount: quests.length,
		};
	}
}
