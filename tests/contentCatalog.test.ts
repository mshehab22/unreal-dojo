// Checks the content catalog: loading a fixture folder through the real ContentLoader, the renderer views, the alias table, and load failures as AppErrors.
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DOJO_METHODS, IPC_CHANNELS, type IpcResponse } from "@shared/ipc";
import type { GlossaryEntry, LoadedContent } from "@shared/types/content";

import { buildGlossaryAliases, isIdentifierText } from "../src/main/content/buildGlossaryAliases";
import { ContentCatalog } from "../src/main/content/ContentCatalog";
import { createContentCatalog } from "../src/main/content/createContentCatalog";
import { resolveContentRoot } from "../src/main/content/resolveContentRoot";
import { AppErrorException } from "../src/main/errors/AppErrorException";
import { createHandlers } from "../src/main/ipc/createHandlers";
import { registerHandlers, type WrappedHandler } from "../src/main/ipc/registerHandlers";
import { createTestProgressContent } from "./support/contentFixture";
import { createTestProgressService } from "./support/progressFixtures";
import { createContentFixture, readExamples, retagQuest, writePack, writeWorld, type ContentFixture } from "./content/contentFixture";

/** A glossary entry with the given id, term, and aliases. */
function glossaryEntry(id: string, term: string, aliases: string[] = [], codeOnly: boolean = false): GlossaryEntry
{
	const entry: GlossaryEntry = {
		id,
		term,
		aliases,
		category: "framework",
		short: `Short text for ${term}.`,
		long: "Long text.",
		unrealDocsUrl: "https://dev.epicgames.com/documentation/unreal-engine",
		related: [],
	};

	if (codeOnly) entry.linkMode = "code-only";

	return entry;
}

/** Writes one pack with one world holding the concept example and the worked build example, plus a two-entry glossary. */
async function writeSmallContent(fixture: ContentFixture): Promise<void>
{
	const examples = await readExamples();

	await fixture.write("glossary.json", JSON.stringify([glossaryEntry("actor", "AActor", ["actor"]), glossaryEntry("check", "check", [], true)]));
	await writePack(fixture, "fixture-pack");
	await writeWorld(fixture, "fixture-pack", "01-lights");
	await fixture.write("packs/fixture-pack/worlds/01-lights/01-concept.md", retagQuest(examples.get("01-concept-uproperty.md") ?? "", "fixture-concept", 1));
	await fixture.write("packs/fixture-pack/worlds/01-lights/02-build.md", retagQuest(examples.get("02-build-worked-lantern.md") ?? "", "fixture-build", 2));
}

/** Builds a catalog over a folder that does not exist, the way a broken packaged install looks. */
function createBrokenPackagedCatalog(): ContentCatalog
{
	const root = resolveContentRoot({ isPackaged: true, resourcesPath: join("/", "no-such-install", "Resources"), appPath: "/unused" });

	return createContentCatalog(root);
}

let fixture: ContentFixture;

beforeEach(async () =>
{
	fixture = await createContentFixture();
});

afterEach(async () =>
{
	await fixture.remove();
});

describe("resolveContentRoot", () =>
{
	it("uses the resources folder when packaged and the app folder in dev", () =>
	{
		expect(resolveContentRoot({ isPackaged: true, resourcesPath: join("/", "App", "Resources"), appPath: "/unused" })).toBe(join("/", "App", "Resources", "content"));
		expect(resolveContentRoot({ isPackaged: false, resourcesPath: "/unused", appPath: join("/", "Projects", "unreal-dojo") })).toBe(join("/", "Projects", "unreal-dojo", "content"));
	});
});

describe("ContentCatalog on a fixture folder", () =>
{
	it("loads packs, worlds, and quests through the real ContentLoader", async () =>
	{
		await writeSmallContent(fixture);
		const catalog = createContentCatalog(fixture.root);

		const status = await catalog.getStatus();
		expect(status).toMatchObject({ root: fixture.root, packCount: 1, questCount: 2, glossaryCount: 2 });

		const packs = await catalog.listPacks();
		expect(packs.map((pack) => pack.id)).toEqual(["fixture-pack"]);
		expect(packs[0]?.worlds[0]?.quests.map((quest) => [quest.id, quest.kind, quest.scaffold])).toEqual([
			["fixture-concept", "concept", undefined],
			["fixture-build", "build", "worked"],
		]);

		// Outlines carry front matter only: no card text, no starter files.
		expect(packs[0]?.worlds[0]?.quests[1]).not.toHaveProperty("files");
	});

	it("serves full quests and worlds with hint texts replaced by their count", async () =>
	{
		await writeSmallContent(fixture);
		const catalog = createContentCatalog(fixture.root);

		const build = await catalog.getQuest("fixture-build");
		expect(build.kind).toBe("build");
		expect(build).not.toHaveProperty("hints");
		expect(build).toHaveProperty("hintCount", 3);

		const authored = await catalog.getAuthoredQuest("fixture-build");
		expect(authored && "hints" in authored ? authored.hints : []).toHaveLength(3);

		const world = await catalog.getWorld("lights");
		expect(world.quests.map((quest) => quest.id)).toEqual(["fixture-concept", "fixture-build"]);
		expect(world.quests[1]).not.toHaveProperty("hints");
	});

	it("rejects unknown world and quest ids with their AppErrors", async () =>
	{
		await writeSmallContent(fixture);
		const catalog = createContentCatalog(fixture.root);

		await expect(catalog.getWorld("nowhere")).rejects.toMatchObject({ appError: { code: "world-not-found" } });
		await expect(catalog.getQuest("nothing")).rejects.toMatchObject({ appError: { code: "quest-not-found" } });
	});

	it("loads an empty content folder as zero packs with no problems", async () =>
	{
		const catalog = createContentCatalog(fixture.root);

		expect(await catalog.getStatus()).toMatchObject({ packCount: 0, questCount: 0, problems: [] });
		expect(await catalog.listPacks()).toEqual([]);
	});

	it("still serves the good files and lists the problems of the bad ones", async () =>
	{
		await writeSmallContent(fixture);
		await fixture.write("packs/fixture-pack/worlds/01-lights/03-broken.md", "this is not a quest file");

		const status = await createContentCatalog(fixture.root).getStatus();

		expect(status.questCount).toBe(2);
		expect(status.problems.some((problem) => problem.file.includes("03-broken.md"))).toBe(true);
	});

	it("reads the folder only once across many requests", async () =>
	{
		let loads = 0;
		const catalog = new ContentCatalog({
			root: "/content",
			folderExists: async () => true,
			loadContent: async (): Promise<LoadedContent> =>
			{
				loads++;
				return { packs: [], glossary: [], patterns: [], files: [], questSources: {}, problems: [] };
			},
		});

		catalog.startLoading();
		await Promise.all([catalog.listPacks(), catalog.getGlossary(), catalog.getPatternCards(), catalog.getStatus()]);

		expect(loads).toBe(1);
	});
});

describe("ContentCatalog load failures", () =>
{
	it("answers a bad packaged path with a content-invalid AppError naming the folder", async () =>
	{
		const catalog = createBrokenPackagedCatalog();

		catalog.startLoading();

		const failure = await catalog.listPacks().catch((thrown: unknown) => thrown);
		expect(failure).toBeInstanceOf(AppErrorException);
		expect((failure as AppErrorException).appError).toMatchObject({ code: "content-invalid", detail: expect.stringContaining(join("no-such-install", "Resources", "content")) });
	});

	it("turns a bad packaged path into an IpcResponse error through the real handlers, never a throw", async () =>
	{
		const handlersByChannel = new Map<string, WrappedHandler>();
		const catalog = createBrokenPackagedCatalog();

		registerHandlers(
			{ handle: (channel, listener) => void handlersByChannel.set(channel, listener as WrappedHandler) },
			createHandlers({
				getAppVersion: () => "9.9.9",
				getEngineLocator: () => { throw new Error("not used"); },
				getContentCatalog: () => catalog,
				pickFolder: async () => null,
				progressService: createTestProgressService().service,
				progressContentService: createTestProgressContent().content,
			}),
		);

		const contentChannels = [IPC_CHANNELS.getContentStatus, IPC_CHANNELS.listPacks, IPC_CHANNELS.getGlossary, IPC_CHANNELS.getGlossaryAliases, IPC_CHANNELS.getPatternCards];

		for (const channel of contentChannels)
		{
			const response = (await handlersByChannel.get(channel)?.({} as Parameters<WrappedHandler>[0])) as IpcResponse<unknown>;
			expect(response).toMatchObject({ ok: false, error: { code: "content-invalid", message: "Unreal Dojo could not find its lessons." } });
		}

		expect(DOJO_METHODS.length).toBe(handlersByChannel.size);
	});

	it("turns a load that throws into content-invalid and tries again on the next request", async () =>
	{
		let attempts = 0;
		const catalog = new ContentCatalog({
			root: "/content",
			folderExists: async () => true,
			loadContent: async (): Promise<LoadedContent> =>
			{
				attempts++;
				if (attempts === 1) throw new Error("disk read failed");

				return { packs: [], glossary: [], patterns: [], files: [], questSources: {}, problems: [] };
			},
		});

		await expect(catalog.listPacks()).rejects.toMatchObject({ appError: { code: "content-invalid", detail: "/content: disk read failed" } });
		await expect(catalog.listPacks()).resolves.toEqual([]);
		expect(attempts).toBe(2);
	});
});

describe("buildGlossaryAliases", () =>
{
	it("lists every term and alias once, longest first, with identifier and code-only flags", () =>
	{
		const aliases = buildGlossaryAliases([glossaryEntry("actor", "AActor", ["actor", "AActor"]), glossaryEntry("check", "check", [], true), glossaryEntry("gc", "garbage collection", ["GC"])]);

		expect(aliases.map((alias) => alias.text)).toEqual(["garbage collection", "AActor", "actor", "check", "GC"]);
		expect(aliases.find((alias) => alias.text === "AActor")).toMatchObject({ entryId: "actor", caseSensitive: true, codeOnly: false, short: "Short text for AActor." });
		expect(aliases.find((alias) => alias.text === "actor")?.caseSensitive).toBe(false);
		expect(aliases.find((alias) => alias.text === "check")).toMatchObject({ caseSensitive: false, codeOnly: true });
	});

	it("treats identifiers as case sensitive and plain words as case insensitive", () =>
	{
		for (const identifier of ["AActor", "UPROPERTY", "BeginPlay", "TObjectPtr", "FVector::ZeroVector", "GC", "UE_LOG"]) expect(isIdentifierText(identifier)).toBe(true);
		for (const plainWord of ["actor", "Actor", "delegate", "Tick", "garbage collection"]) expect(isIdentifierText(plainWord)).toBe(false);
	});
});
