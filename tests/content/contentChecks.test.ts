// Checks each verifier content rule on small in-memory content sets built from the format examples.
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import type { AuthoredQuest, BuildQuest, ConceptQuest, GlossaryEntry, LoadedContent, Pack, PatternCard, ScaffoldLevel } from "@shared/types/content";

import { parseQuestFile } from "../../src/main/services/content/parseQuestFile";
import { ProblemList } from "../../src/main/services/content/ProblemList";
import type { ContentCheck, QuestRecord, VerifierInput } from "../../tools/verifier/ContentCheck";
import { coverageCheck } from "../../tools/verifier/checks/coverageCheck";
import { fadeLadderCheck } from "../../tools/verifier/checks/fadeLadderCheck";
import { glossaryCheck } from "../../tools/verifier/checks/glossaryCheck";
import { planCoverageCheck } from "../../tools/verifier/checks/planCoverageCheck";
import { questionCheck } from "../../tools/verifier/checks/questionCheck";
import { questShapeCheck } from "../../tools/verifier/checks/questShapeCheck";
import { referenceCheck } from "../../tools/verifier/checks/referenceCheck";
import { repetitionCheck } from "../../tools/verifier/checks/repetitionCheck";
import { solutionCheck } from "../../tools/verifier/checks/solutionCheck";
import { unlockGraphCheck } from "../../tools/verifier/checks/unlockGraphCheck";
import { readExamples } from "./contentFixture";

let examples: Map<string, AuthoredQuest>;

/** A parsed example quest by file name. */
function example<Quest extends AuthoredQuest>(name: string): Quest
{
	const quest = examples.get(name);

	if (quest === undefined) throw new Error(`missing example ${name}`);

	return structuredClone(quest) as Quest;
}

/** A build quest copied from the worked example with a new id, scaffold, and prerequisites. */
function build(id: string, scaffold: ScaffoldLevel, prerequisites: string[] = []): BuildQuest
{
	return { ...example<BuildQuest>("02-build-worked-lantern.md"), id, scaffold, prerequisites, terms: [], patterns: [] };
}

/** A concept quest copied from the concept example with a new id and prerequisites. */
function concept(id: string, prerequisites: string[] = [], terms: string[] = []): ConceptQuest
{
	return { ...example<ConceptQuest>("01-concept-uproperty.md"), id, prerequisites, terms, patterns: [] };
}

/** A minimal pinned glossary entry. */
function glossaryEntry(id: string, overrides: Partial<GlossaryEntry> = {}): GlossaryEntry
{
	return { id, term: id, aliases: [], category: "framework", short: "s", long: "l", unrealDocsUrl: "https://dev.epicgames.com/x?application_version=5.8", related: [], ...overrides };
}

/** A minimal pattern card. */
function patternCard(id: string, overrides: Partial<PatternCard> = {}): PatternCard
{
	return { id, title: id, intent: "i", problem: "p", unrealForm: "u", whenNot: "w", useCaseQuestIds: [], recall: [], scenarios: [], ...overrides };
}

/** Builds a checker input: one pack whose worlds hold the given quests, plus glossary and patterns. */
function inputWith(worlds: AuthoredQuest[][], extra: { glossary?: GlossaryEntry[]; patterns?: PatternCard[]; examples?: AuthoredQuest[]; solutionsFolder?: string; release?: boolean } = {}): VerifierInput
{
	const questSources: Record<string, string> = {};
	const records: QuestRecord[] = [];
	const pack: Pack = { id: "p1", title: "P", summary: "s", order: 1, worlds: [] };

	worlds.forEach((quests, worldIndex) =>
	{
		const folder = `packs/p1/worlds/0${worldIndex + 1}-w${worldIndex + 1}`;

		pack.worlds.push({ id: `w${worldIndex + 1}`, title: "W", summary: "s", order: worldIndex + 1, quests });

		quests.forEach((quest, index) =>
		{
			const file = `${folder}/0${index + 1}-${quest.id}.md`;

			questSources[quest.id] = file;
			records.push({ quest, file, packId: "p1", worldIndex });
		});
	});

	for (const quest of extra.examples ?? []) records.push({ quest, file: `examples/${quest.id}.md` });

	const content: LoadedContent = { packs: [pack], glossary: extra.glossary ?? [], patterns: extra.patterns ?? [], files: [], questSources, problems: [] };

	return { content, examples: extra.examples ?? [], quests: records, solutionsFolder: extra.solutionsFolder ?? "/nowhere", release: extra.release ?? false };
}

/** Runs one check and returns its messages, optionally prefixed with the file. */
async function messages(check: ContentCheck, input: VerifierInput, withFile: boolean = false): Promise<string[]>
{
	return (await check.run(input)).map((problem) => (withFile ? `${problem.file}: ${problem.message}` : problem.message));
}

beforeAll(async () =>
{
	examples = new Map();

	for (const [name, text] of await readExamples())
	{
		const quest = parseQuestFile(text, new ProblemList(name));

		if (quest !== undefined) examples.set(name, quest);
	}
});

describe("fade ladder", () =>
{
	it("flags a step back, a world that starts at stub, and a world that ends at faded; one build quest alone is fine", async () =>
	{
		const input = inputWith([
			[build("a", "worked"), build("b", "stub", ["a"]), build("c", "faded", ["b"])],
			[build("d", "stub", ["c"]), build("e", "blank", ["d"])],
			[build("f", "blank", ["e"])],
		]);
		const found = await messages(fadeLadderCheck, input);

		expect(found).toContain("scaffold steps back from stub (\"b\") to faded; a world fades worked, faded, stub, blank");
		expect(found).toContain("the world's last build quest must be stub or blank, not faded");
		expect(found).toContain("the world's first build quest must be worked or faded, not stub");
		expect(found).toHaveLength(3);
	});
});

describe("unlock graph", () =>
{
	it("reports a cycle, the quest stuck behind it, and a second entry point", async () =>
	{
		const input = inputWith([[concept("first"), concept("loop-a", ["loop-b"]), concept("loop-b", ["loop-a"]), concept("stuck", ["loop-a"]), concept("floating")]]);
		const found = await messages(unlockGraphCheck, input);

		expect(found).toContain("prerequisites form a cycle: loop-a -> loop-b -> loop-a");
		expect(found).toContain("can never unlock: one of its prerequisites sits on or after a prerequisite cycle");
		expect(found).toContain("not reachable from the pack's first quest \"first\": it has no prerequisites");
		expect(found).toHaveLength(3);
	});

	it("accepts a chain from the first quest across worlds", async () =>
	{
		expect(await messages(unlockGraphCheck, inputWith([[concept("a")], [concept("b", ["a"]), concept("c", ["a", "b"])]]))).toEqual([]);
	});
});

describe("references", () =>
{
	it("reports unknown terms, patterns, prerequisites, a boss piece that is not a build quest, and a bad pattern use case", async () =>
	{
		const boss = { ...example<AuthoredQuest>("08-boss-lighthouse.md"), id: "boss", prerequisites: ["a"], terms: [], patterns: [], pieces: ["a"] } as AuthoredQuest;
		const input = inputWith([[concept("a", [], ["actor", "ghost-term"]), { ...concept("b", ["nobody"]), patterns: ["ghost-pattern"] }, boss]], {
			glossary: [glossaryEntry("actor")],
			patterns: [patternCard("observer", { useCaseQuestIds: ["a"] })],
		});
		const found = await messages(referenceCheck, input);

		expect(found).toEqual([
			"terms: \"ghost-term\" is not a glossary id",
			"patterns: \"ghost-pattern\" is not a pattern card id",
			"prerequisites: \"nobody\" is not a quest id",
			"pieces: \"a\" is a concept quest; boss pieces are build quests",
			"useCaseQuestIds: quest \"a\" does not list \"observer\" in its patterns",
		]);
	});
});

describe("questions", () =>
{
	it("needs three distinct choices and, for which-pattern, pattern ids with a note for every wrong choice", async () =>
	{
		const card = patternCard("observer", {
			scenarios: [{ id: "s1", type: "which-pattern", prompt: "Which?", choices: ["observer", "command", "made-up"], answer: "observer", distractorNotes: [{ choice: "command", why: "w" }], explanation: "e" }],
			recall: [{ id: "r1", type: "multiple-choice", prompt: "Pick", choices: ["yes", "no"], answerIndex: 0, explanation: "e" }],
		});
		const found = await messages(questionCheck, inputWith([], { patterns: [card, patternCard("command")] }));

		expect(found).toEqual([
			"question \"r1\": expected at least 3 distinct choices, found 2",
			"question \"s1\": choice \"made-up\" is not a pattern card id",
			"question \"s1\": no distractor note for wrong choice \"made-up\"",
		]);
	});
});

describe("glossary", () =>
{
	it("reports an unknown related id, an unpinned link, and one spelling claimed by two entries", async () =>
	{
		const glossary = [
			glossaryEntry("actor", { term: "Actor", related: ["ghost"] }),
			glossaryEntry("pawn", { term: "Pawn", aliases: ["actor"], unrealDocsUrl: "https://dev.epicgames.com/pawn" }),
		];
		const found = await messages(glossaryCheck, inputWith([], { glossary }));

		expect(found).toEqual([
			"related: \"ghost\" is not a glossary id",
			"unrealDocsUrl: pin the link with ?application_version=5.8",
			"\"actor\" is a spelling of both \"actor\" and \"pawn\"; the TermLinker cannot tell them apart",
		]);
	});
});

describe("coverage", () =>
{
	it("summarizes missing coverage as one warning per rule, and lists each as an error with --release", async () =>
	{
		const glossary = [glossaryEntry("actor"), glossaryEntry("pawn")];
		const quests = [[concept("a", [], ["actor"]), { ...build("b", "worked", ["a"]), terms: ["actor"], patterns: ["observer"] }]];
		const warnings = await coverageCheck.run(inputWith(quests, { glossary, patterns: [patternCard("observer")] }));
		const errors = await coverageCheck.run(inputWith(quests, { glossary, patterns: [patternCard("observer")], release: true }));

		expect(warnings.map((problem) => [problem.severity, problem.message])).toEqual([
			["warning", "1 of 2 glossary terms are not in any concept quest's terms: pawn (warning until release; --release lists each as an error)"],
			["warning", "1 of 2 glossary terms are not in any build quest's terms: pawn (warning until release; --release lists each as an error)"],
			["warning", "1 of 1 patterns are listed by fewer than 3 build quests: observer (warning until release; --release lists each as an error)"],
		]);
		expect(errors.map((problem) => [problem.severity, problem.section])).toEqual([[undefined, "entry pawn"], [undefined, "entry pawn"], [undefined, "pattern observer"]]);
	});
});

describe("plan coverage, quest shape, and repetition", () =>
{
	it("flags a plan that misses a required piece and a breakdown with one plan", async () =>
	{
		const breakdown = example<AuthoredQuest>("07-breakdown-campfire.md");

		if (breakdown.kind !== "breakdown") throw new Error("expected a breakdown");

		const firstPlan = breakdown.referencePlans[0];

		if (firstPlan === undefined) throw new Error("expected a plan");

		const trimmed = { ...breakdown, referencePlans: [{ ...firstPlan, pieces: firstPlan.pieces.filter((piece) => piece.id !== "bar") }] };
		const found = await messages(planCoverageCheck, inputWith([[trimmed]]));

		expect(found).toEqual(["expected at least 2 reference plans, found 1", "plan \"component-counts-fires\" does not cover required pieces: hud-bar"]);
	});

	it("flags a rubric outside 5 to 6 bullets and an empty concepts list", async () =>
	{
		const quest = { ...build("a", "worked"), rubric: ["one", "two", "three", "four"], concepts: [] };

		expect(await messages(questShapeCheck, inputWith([[quest]]))).toEqual(["concepts: list at least one idea this quest teaches", "expected 5 to 6 rubric bullets, found 4"]);
	});

	it("flags world 3 when none of its quests reuses an earlier pattern or term", async () =>
	{
		const input = inputWith([[concept("a", [], ["actor"])], [concept("b", ["a"], ["pawn"])], [concept("c", ["b"], ["tick"])], [concept("d", ["c"], ["pawn"])]]);

		expect(await messages(repetitionCheck, input, true)).toEqual([
			"packs/p1/worlds/03-w3/world.json: no quest in this world lists a pattern or term from an earlier world of the pack (reuse on purpose from world 3 on)",
		]);
	});
});

describe("reference solutions", () =>
{
	it("reports a missing solution folder, a missing file, and an extra file", async () =>
	{
		const folder = await mkdtemp(join(tmpdir(), "dojo-solutions-"));

		await mkdir(join(folder, "b"));
		await writeFile(join(folder, "b", "DojoExLantern.h"), "// header");
		await writeFile(join(folder, "b", "Notes.txt"), "scratch");

		const found = await messages(solutionCheck, inputWith([[build("a", "worked"), build("b", "stub", ["a"])]], { solutionsFolder: folder }));

		await rm(folder, { recursive: true, force: true });

		expect(found).toEqual([
			"no reference solution: add solutions/a/ with DojoExLantern.h, DojoExLantern.cpp",
			"solutions/b/ is missing DojoExLantern.cpp",
			"solutions/b/Notes.txt is not one of the quest's files",
		]);
	});
});
