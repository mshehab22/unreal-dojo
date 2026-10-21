// Checks each verifier content rule on small in-memory content sets built from the format examples.
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import type { AuthoredQuest, BuildQuest, ConceptQuest, GlossaryEntry, LoadedContent, Pack, PatternCard, ScaffoldLevel } from "@shared/types/content";

import { parseQuestFile } from "../../src/main/services/content/parseQuestFile";
import { ProblemList } from "../../src/main/services/content/ProblemList";
import type { ContentCheck, QuestRecord, VerifierInput } from "../../tools/verifier/ContentCheck";
import { labelCore as reviewerLabelCore } from "../../src/main/services/review/providers/TestsOnlyProvider";
import { coverageCheck } from "../../tools/verifier/checks/coverageCheck";
import { dependencyCheck } from "../../tools/verifier/checks/dependencyCheck";
import { fadeLadderCheck } from "../../tools/verifier/checks/fadeLadderCheck";
import { glossaryCheck } from "../../tools/verifier/checks/glossaryCheck";
import { labelCore } from "../../tools/verifier/checks/labelCore";
import { planCoverageCheck } from "../../tools/verifier/checks/planCoverageCheck";
import { questionCheck } from "../../tools/verifier/checks/questionCheck";
import { questShapeCheck } from "../../tools/verifier/checks/questShapeCheck";
import { referenceCheck } from "../../tools/verifier/checks/referenceCheck";
import { repetitionCheck } from "../../tools/verifier/checks/repetitionCheck";
import { solutionCheck } from "../../tools/verifier/checks/solutionCheck";
import { termOrderCheck } from "../../tools/verifier/checks/termOrderCheck";
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
	return { ...example<BuildQuest>("02-build-worked-lantern.md"), id, scaffold, prerequisites, terms: [], patterns: [], tests: `IMPLEMENT_SIMPLE_AUTOMATION_TEST(F${id}, "Dojo.Test.${id}", 0)` };
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
		const self = await messages(glossaryCheck, inputWith([], { glossary: [glossaryEntry("tick", { related: ["tick"] })] }));

		expect(self).toEqual(["related: an entry cannot be related to itself"]);
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

	it("flags a boss plan that misses a required piece", async () =>
	{
		const boss = example<AuthoredQuest>("08-boss-lighthouse.md");

		if (boss.kind !== "boss") throw new Error("expected a boss");

		const plans = boss.referencePlans.map((plan, index) => (index === 1 ? { ...plan, pieces: plan.pieces.filter((piece) => piece.id !== "ship") } : plan));

		expect(await messages(planCoverageCheck, inputWith([[{ ...boss, referencePlans: plans }]]))).toEqual(["plan \"tracker-on-ship\" does not cover required pieces: safety, ship"]);
	});

	it("needs exactly 8 integration rubric bullets on a boss", async () =>
	{
		const boss = example<AuthoredQuest>("08-boss-lighthouse.md");

		if (boss.kind !== "boss") throw new Error("expected a boss");

		expect(await messages(questShapeCheck, inputWith([[boss]]))).toEqual([]);
		expect(await messages(questShapeCheck, inputWith([[{ ...boss, integrationRubric: boss.integrationRubric.slice(0, 7) }]]))).toEqual(["expected 8 integration rubric bullets, found 7"]);
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

describe("cross-quest dependencies (A268)", () =>
{
	/** A build quest whose starter includes quest a's header, with the given brief line and prerequisites. */
	function dependent(declaration: string, prerequisites: string[]): BuildQuest
	{
		const quest = build("b", "faded", prerequisites);

		return { ...quest, brief: `${quest.brief}\n\n${declaration}`, files: [{ name: "B.cpp", starter: "#include \"Quests/a/A.h\"\n#include \"Quests/b/B.h\"" }] };
	}

	it("accepts a dependency named on the line with its path and listed as a prerequisite", async () =>
	{
		expect(await messages(dependencyCheck, inputWith([[build("a", "worked"), dependent("Compiles against earlier quests: a (`Quests/a/A.h`).", ["a"])]]))).toEqual([]);
	});

	it("reports an undeclared include, a declared quest that is not a prerequisite, and one that does not exist", async () =>
	{
		const undeclared = await messages(dependencyCheck, inputWith([[build("a", "worked"), dependent("", ["a"])]]));
		const notPrerequisite = await messages(dependencyCheck, inputWith([[build("a", "worked"), dependent("Compiles against earlier quests: a (`Quests/a/A.h`) and ghost (`Quests/ghost/G.h`).", [])]]));

		expect(undeclared).toEqual(["the code includes Quests/a/ but the \"Compiles against earlier quests:\" line does not name it with its path"]);
		expect(notPrerequisite).toEqual([
			"\"Compiles against earlier quests:\" names \"a\", which must also be in prerequisites",
			"\"Compiles against earlier quests:\" names \"ghost\", which is not a quest id",
		]);
	});
});

describe("bare-name cross-quest includes (A181)", () =>
{
	/** Quest a owns A.h; quest b's starter includes it by bare name, with the given brief line and prerequisites. */
	function pair(declaration: string, prerequisites: string[]): BuildQuest[]
	{
		const owner = { ...build("a", "worked"), files: [{ name: "A.h", starter: "#pragma once" }] };
		const user = build("b", "faded", prerequisites);

		return [owner, { ...user, brief: `${user.brief}\n\n${declaration}`, files: [{ name: "B.cpp", starter: "#include \"B.h\"\n#include \"A.h\"\n#include \"CoreMinimal.h\"" }] }];
	}

	it("reports a bare include of another quest's file that the brief does not declare", async () =>
	{
		expect(await messages(dependencyCheck, inputWith([pair("", ["a"])]))).toEqual([
			"the code includes \"A.h\", a file of \"a\", but the \"Compiles against earlier quests:\" line does not name a with its path",
		]);
	});

	it("accepts a bare include once the brief declares the quest", async () =>
	{
		expect(await messages(dependencyCheck, inputWith([pair("Compiles against earlier quests: a (`Quests/a/A.h`).", ["a"])]))).toEqual([]);
	});

	it("reports a file name two quests share, since a bare include of it is ambiguous", async () =>
	{
		const found = await messages(dependencyCheck, inputWith([[build("a", "worked"), build("b", "stub", ["a"])]]), true);

		expect(found).toContain("packs/p1/worlds/01-w1/02-b.md: DojoExLantern.h is also a file of \"a\"; every quest folder is on the include path (A181), so a bare #include \"DojoExLantern.h\" would be ambiguous. Rename one");
	});
});

describe("concept questions and required piece labels", () =>
{
	it("needs a concept question that is not explain-in-one-sentence", async () =>
	{
		const quest = concept("a");
		const onlyExplain = { ...quest, questions: quest.questions.filter((question) => question.type === "explain-in-one-sentence") };

		expect(await messages(questShapeCheck, inputWith([[quest]]))).toEqual([]);
		expect(await messages(questShapeCheck, inputWith([[onlyExplain]]))).toEqual(["needs at least one question that is not explain-in-one-sentence, so the quest can be graded without an AI reviewer"]);
	});

	it("needs a required piece label core of at least 4 characters after kind words", async () =>
	{
		const breakdown = example<AuthoredQuest>("07-breakdown-campfire.md");

		if (breakdown.kind !== "breakdown") throw new Error("expected a breakdown");

		const [first, ...rest] = breakdown.requiredPieces;

		if (first === undefined) throw new Error("expected a piece");

		const weak = { ...breakdown, requiredPieces: [{ ...first, label: "UI Event Component" }, ...rest] };

		expect(await messages(planCoverageCheck, inputWith([[breakdown]]))).toEqual([]);
		expect(await messages(planCoverageCheck, inputWith([[weak]]))).toEqual([
			"required piece \"fire-actor\": label \"UI Event Component\" leaves \"ui\" after kind words are removed; tests-only grading needs at least 4 characters (A302)",
		]);
	});

	it("computes the same label core as the tests-only reviewer", () =>
	{
		const labels = ["HealthComponent", "UHealthComponent", "OnDeath event", "Setup Steps", "Wave spawner subsystem", "HUD warmth bar listener", "Classes and Systems", "Rates, limits, and radius as editable data", "UI Event Component"];

		expect(labels.map(labelCore)).toEqual(labels.map(reviewerLabelCore));
	});
});

describe("boss reference integrations (A67)", () =>
{
	it("errors when a pack boss has no integration folder, and only warns for the format example boss (A520)", async () =>
	{
		const lighthouse = example<AuthoredQuest>("08-boss-lighthouse.md");
		const packBoss = { ...lighthouse, id: "yard", prerequisites: [], pieces: [] } as AuthoredQuest;
		const found = await solutionCheck.run(inputWith([[packBoss]], { examples: [lighthouse], solutionsFolder: "/nowhere" }));

		expect(found.map((problem) => [problem.file, problem.severity ?? "error"])).toEqual([
			["packs/p1/worlds/01-w1/01-yard.md", "error"],
			["examples/example-boss-lighthouse.md", "warning"],
		]);
		expect(found[1]?.message).toContain("(format example: a warning, A520)");
	});

	it("errors when a boss integration folder has no tests or has stray files", async () =>
	{
		const folder = await mkdtemp(join(tmpdir(), "dojo-boss-"));
		const lighthouse = { ...example<AuthoredQuest>("08-boss-lighthouse.md"), id: "yard", prerequisites: [], pieces: [] } as AuthoredQuest;

		const missing = await solutionCheck.run(inputWith([[lighthouse]], { solutionsFolder: folder }));

		await mkdir(join(folder, "yard"));
		await writeFile(join(folder, "yard", "DojoYard.cpp"), "// code");
		await writeFile(join(folder, "yard", "notes.txt"), "scratch");

		const noTests = await messages(solutionCheck, inputWith([[lighthouse]], { solutionsFolder: folder }));

		await writeFile(join(folder, "yard", "DojoYard.Test.cpp"), "// tests");
		await rm(join(folder, "yard", "notes.txt"));

		const complete = await messages(solutionCheck, inputWith([[lighthouse]], { solutionsFolder: folder }));

		await rm(folder, { recursive: true, force: true });

		expect(missing.map((problem) => [problem.severity, problem.message])).toEqual([[undefined, "no reference integration: add solutions/yard/ with the integration's .h and .cpp files and a .Test.cpp that plays two rounds (A67)"]]);
		expect(noTests).toEqual(["solutions/yard/ has no .Test.cpp automation tests", "solutions/yard/notes.txt is not a .h or .cpp file"]);
		expect(complete).toEqual([]);
	});

	it("accepts a piece override folder with that piece's file names, and rejects other folders and file names", async () =>
	{
		const folder = await mkdtemp(join(tmpdir(), "dojo-boss-"));
		const yard = { ...example<AuthoredQuest>("08-boss-lighthouse.md"), id: "yard", prerequisites: ["lamp"], pieces: ["lamp"] } as AuthoredQuest;
		const lamp = build("lamp", "worked");

		await mkdir(join(folder, "yard", "lamp"), { recursive: true });
		await mkdir(join(folder, "yard", "stranger"), { recursive: true });
		await writeFile(join(folder, "yard", "DojoYard.cpp"), "// code");
		await writeFile(join(folder, "yard", "DojoYard.Test.cpp"), "// tests");
		await writeFile(join(folder, "yard", "lamp", "DojoExLantern.h"), "// extended");
		await writeFile(join(folder, "yard", "lamp", "DojoExtra.cpp"), "// new file");
		await writeFile(join(folder, "yard", "stranger", "X.cpp"), "// x");

		const found = await messages(solutionCheck, inputWith([[lamp, yard]], { solutionsFolder: folder }));

		await rm(folder, { recursive: true, force: true });

		expect(found.filter((message) => message.includes("yard/"))).toEqual([
			"solutions/yard/lamp/DojoExtra.cpp is not one of lamp's files",
			"solutions/yard/stranger/ is not named after one of this boss's pieces",
		]);
	});
});

describe("term order (A72)", () =>
{
	it("warns for a term only a later concept quest teaches and for one no concept quest teaches, naming where it is taught", async () =>
	{
		const early = { ...build("early", "worked"), terms: ["actor", "ue-log"] };
		const teacher = concept("teacher", ["early"], ["actor"]);
		const late = { ...build("late", "stub", ["teacher"]), terms: ["actor"] };
		const found = await termOrderCheck.run(inputWith([[early], [teacher, late]]));

		expect(found.map((problem) => [problem.file, problem.severity, problem.message])).toEqual([
			["packs/p1/worlds/01-w1/01-early.md", "warning", "terms: \"actor\" is not taught by any earlier concept quest; first taught later, by \"teacher\" (packs/p1/worlds/02-w2/01-teacher.md). It links but does not gate this quest (A72)"],
			["packs/p1/worlds/01-w1/01-early.md", "warning", "terms: \"ue-log\" is not taught by any earlier concept quest; never taught by a concept quest. It links but does not gate this quest (A72)"],
		]);
	});

	it("never warns about a concept quest's own terms, a term taught earlier in the same world, or the format examples", async () =>
	{
		const teacher = concept("teacher", [], ["actor", "pawn"]);
		const user = { ...build("user", "worked", ["teacher"]), terms: ["actor"] };
		const exampleBuild = { ...build("example-only", "worked"), terms: ["ghost-term"] };

		expect(await termOrderCheck.run(inputWith([[teacher, user]], { examples: [exampleBuild] }))).toEqual([]);
	});
});

