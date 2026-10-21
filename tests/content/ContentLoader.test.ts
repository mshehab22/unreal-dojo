// Checks the folder loader: packs and worlds in order, glossary and patterns, duplicate ids, naming rules, and empty folders.
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ContentLoader } from "../../src/main/services/content/ContentLoader";
import { createContentFixture, readExamples, retagQuest, writePack, writeWorld, type ContentFixture } from "./contentFixture";

/** A minimal valid glossary entry with the given id. */
function glossaryEntry(id: string): object
{
	return {
		id,
		term: id,
		aliases: [],
		category: "framework",
		short: "Short text.",
		long: "Long text.",
		unrealDocsUrl: "https://dev.epicgames.com/documentation/unreal-engine",
		related: [],
	};
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

describe("ContentLoader", () =>
{
	it("loads an empty content folder with no problems", async () =>
	{
		const content = await new ContentLoader(fixture.root).load();

		expect(content.problems).toEqual([]);
		expect(content.packs).toEqual([]);
		expect(content.files).toEqual([]);
	});

	it("reports a content folder that does not exist", async () =>
	{
		const content = await new ContentLoader(`${fixture.root}/missing`).load();

		expect(content.problems[0]?.message).toMatch(/^content folder not found/);
	});

	it("loads every kind from a pack, sorting worlds by folder number and quests by order", async () =>
	{
		const examples = await readExamples();

		await writePack(fixture, "foundations");
		await writeWorld(fixture, "foundations", "02-later");
		await writeWorld(fixture, "foundations", "01-first");

		let order = 1;

		for (const [name, text] of examples) await fixture.write(`packs/foundations/worlds/01-first/${name}`, retagQuest(text, `first-${order}`, 9 - order++));

		const content = await new ContentLoader(fixture.root).load();
		const [firstWorld, secondWorld] = content.packs[0]?.worlds ?? [];

		expect(content.problems).toEqual([]);
		expect(firstWorld?.id).toBe("first");
		expect(secondWorld?.id).toBe("later");
		expect(firstWorld?.quests.map((quest) => quest.kind)).toEqual(["boss", "breakdown", "refactor", "build", "build", "build", "build", "concept"]);
		expect(content.questSources["first-1"]).toBe("packs/foundations/worlds/01-first/01-concept-uproperty.md");
	});

	it("reports a quest id used in two worlds as a duplicate, naming both files", async () =>
	{
		const concept = (await readExamples()).get("01-concept-uproperty.md") ?? "";

		await writePack(fixture, "foundations");
		await writeWorld(fixture, "foundations", "01-first");
		await writeWorld(fixture, "foundations", "02-second");
		await fixture.write("packs/foundations/worlds/01-first/01-a.md", retagQuest(concept, "same-id", 1));
		await fixture.write("packs/foundations/worlds/02-second/01-b.md", retagQuest(concept, "same-id", 1));

		const content = await new ContentLoader(fixture.root).load();

		expect(content.problems).toEqual([
			{
				file: "packs/foundations/worlds/02-second/01-b.md",
				section: "front matter",
				message: "duplicate quest id \"same-id\" (also used in packs/foundations/worlds/01-first/01-a.md)",
			},
		]);

		// The flagged second file is left out; the first keeps the id.
		const [firstWorld, secondWorld] = content.packs[0]?.worlds ?? [];

		expect(firstWorld?.quests.map((quest) => quest.id)).toEqual(["same-id"]);
		expect(secondWorld?.quests).toEqual([]);
		expect(content.questSources["same-id"]).toBe("packs/foundations/worlds/01-first/01-a.md");
	});

	it("leaves out a quest file that reuses another file's order in the same world", async () =>
	{
		const concept = (await readExamples()).get("01-concept-uproperty.md") ?? "";

		await writePack(fixture, "foundations");
		await writeWorld(fixture, "foundations", "01-first");
		await fixture.write("packs/foundations/worlds/01-first/01-a.md", retagQuest(concept, "a", 1));
		await fixture.write("packs/foundations/worlds/01-first/02-b.md", retagQuest(concept, "b", 1));

		const content = await new ContentLoader(fixture.root).load();

		expect(content.problems).toEqual([
			{ file: "packs/foundations/worlds/01-first/02-b.md", section: "front matter", message: "order 1 is already used by packs/foundations/worlds/01-first/01-a.md in this world" },
		]);
		expect(content.packs[0]?.worlds[0]?.quests.map((quest) => quest.id)).toEqual(["a"]);
	});

	it("reports duplicate glossary and pattern ids", async () =>
	{
		await fixture.write("glossary.json", JSON.stringify([glossaryEntry("actor"), glossaryEntry("actor")]));
		await fixture.write("patterns.json", JSON.stringify([
			{ id: "observer", title: "Observer", intent: "i", problem: "p", unrealForm: "u", whenNot: "w", useCaseQuestIds: [], recall: [], scenarios: [] },
			{ id: "observer", title: "Observer", intent: "i", problem: "p", unrealForm: "u", whenNot: "w", useCaseQuestIds: [], recall: [], scenarios: [] },
		]));

		const content = await new ContentLoader(fixture.root).load();

		expect(content.problems).toEqual([
			{ file: "glossary.json", message: "duplicate glossary entry id \"actor\"" },
			{ file: "patterns.json", message: "duplicate pattern card id \"observer\"" },
		]);
		expect(content.glossary).toHaveLength(1);
		expect(content.patterns).toHaveLength(1);
	});

	it("leaves out a pattern card whose recall and scenario questions share an id", async () =>
	{
		const question = { id: "observer-1", type: "explain-in-one-sentence", prompt: "Why?", modelAnswer: "Because.", rubric: ["Says why"], explanation: "E." };

		await fixture.write("patterns.json", JSON.stringify([
			{ id: "observer", title: "Observer", intent: "i", problem: "p", unrealForm: "u", whenNot: "w", useCaseQuestIds: [], recall: [question], scenarios: [question] },
		]));

		const content = await new ContentLoader(fixture.root).load();

		expect(content.patterns).toEqual([]);
		expect(content.problems).toEqual([{ file: "patterns.json", section: "entry 0 (observer)", message: "question id \"observer-1\" is used twice in this pattern card" }]);
	});

	it("accepts linkMode code-only on a glossary entry and rejects any other value", async () =>
	{
		await fixture.write("glossary.json", JSON.stringify([
			{ ...glossaryEntry("check-macro"), linkMode: "code-only" },
			{ ...glossaryEntry("ensure-macro"), linkMode: "never" },
			glossaryEntry("actor"),
		]));

		const content = await new ContentLoader(fixture.root).load();

		expect(content.glossary.map((entry) => [entry.id, entry.linkMode])).toEqual([["check-macro", "code-only"], ["actor", undefined]]);
		expect(content.problems).toEqual([
			{ file: "glossary.json", section: "entry 1 (ensure-macro)", message: "[1].linkMode: \"never\" is not allowed (expected one of: code-only)" },
		]);
	});

	it("names the glossary entry and field that is wrong", async () =>
	{
		const broken = { ...glossaryEntry("tick"), short: 3 };

		await fixture.write("glossary.json", JSON.stringify([glossaryEntry("actor"), broken]));

		const content = await new ContentLoader(fixture.root).load();

		expect(content.glossary.map((entry) => entry.id)).toEqual(["actor"]);
		expect(content.problems).toEqual([{ file: "glossary.json", section: "entry 1 (tick)", message: "[1].short: expected text" }]);
	});

	it("reports malformed JSON in a pack manifest and a world folder that breaks the naming rule", async () =>
	{
		await fixture.write("packs/foundations/pack.json", "{ \"id\": ");
		await writeWorld(fixture, "foundations", "first-world");

		const content = await new ContentLoader(fixture.root).load();
		const files = content.problems.map((problem) => problem.file);

		expect(files).toContain("packs/foundations/pack.json");
		expect(files).toContain("packs/foundations/worlds/first-world");
	});

	it("reports a pack id that does not match its folder, and a stray file in a world", async () =>
	{
		await fixture.write("packs/foundations/pack.json", JSON.stringify({ id: "basics", title: "Basics", summary: "s", order: 1 }));
		await writeWorld(fixture, "foundations", "01-first");
		await fixture.write("packs/foundations/worlds/01-first/notes.txt", "scratch");

		const messages = (await new ContentLoader(fixture.root).load()).problems.map((problem) => problem.message);

		expect(messages).toContain("pack id \"basics\" must match its folder name \"foundations\"");
		expect(messages.some((message) => message.startsWith("unexpected file"))).toBe(true);
	});

	it("reports a world id used in two packs, and leaves the later pack's world and its quests out (A73)", async () =>
	{
		const concept = (await readExamples()).get("01-concept-uproperty.md") ?? "";

		await writePack(fixture, "first", 1);
		await writePack(fixture, "second", 2);
		await writeWorld(fixture, "first", "01-basics");
		await writeWorld(fixture, "second", "03-basics");
		await fixture.write("packs/first/worlds/01-basics/01-a.md", retagQuest(concept, "a", 1));
		await fixture.write("packs/second/worlds/03-basics/01-b.md", retagQuest(concept, "b", 1));

		const content = await new ContentLoader(fixture.root).load();

		expect(content.problems).toEqual([
			{
				file: "packs/second/worlds/03-basics/world.json",
				section: "id",
				message: "world id \"basics\" is already used by packs/first/worlds/01-basics/world.json in another pack; world ids must be unique across packs (A73)",
			},
		]);
		expect(content.packs.map((pack) => [pack.id, pack.worlds.map((world) => world.id)])).toEqual([["first", ["basics"]], ["second", []]]);
		expect(Object.keys(content.questSources)).toEqual(["a"]);
	});

	it("reads only the requested pack", async () =>
	{
		await writePack(fixture, "one", 1);
		await writePack(fixture, "two", 2);

		const content = await new ContentLoader(fixture.root).load({ packId: "two" });

		expect(content.packs.map((pack) => pack.id)).toEqual(["two"]);
	});
});
