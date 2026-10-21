// Checks the quest file parser: one happy path per kind, and malformed files whose problems name the section and line.
import { beforeAll, describe, expect, it } from "vitest";

import type { AuthoredQuest, ContentProblem } from "@shared/types/content";

import { parseQuestFile } from "../../src/main/services/content/parseQuestFile";
import { ProblemList } from "../../src/main/services/content/ProblemList";
import { readExamples } from "./contentFixture";

/** Parses text as if it came from `quest.md` and returns the quest and its problems. */
function parse(text: string): { quest: AuthoredQuest | undefined; problems: ContentProblem[] }
{
	const problems = new ProblemList("quest.md");
	const quest = parseQuestFile(text, problems);

	return { quest, problems: problems.problems };
}

let examples: Map<string, string>;

/** The text of one example file by name. */
function example(name: string): string
{
	const text = examples.get(name);

	if (text === undefined) throw new Error(`missing example ${name}`);

	return text;
}

beforeAll(async () =>
{
	examples = await readExamples();
});

describe("parseQuestFile happy paths", () =>
{
	it("parses a concept quest with its predict question, card, example, and every question type", () =>
	{
		const { quest, problems } = parse(example("01-concept-uproperty.md"));

		expect(problems).toEqual([]);
		expect(quest?.kind).toBe("concept");

		if (quest?.kind !== "concept") return;

		expect(quest.predict.type).toBe("multiple-choice");
		expect(quest.card).toContain("reflection");
		expect(quest.example).toContain("UPROPERTY(EditAnywhere");
		expect(quest.questions.map((question) => question.type)).toEqual(["fill-blank", "spot-the-bug", "multiple-choice", "explain-in-one-sentence"]);
		expect(quest.difficulty).toBe(1);
	});

	it.each([
		["02-build-worked-lantern.md", "worked"],
		["03-build-faded-flicker.md", "faded"],
		["04-build-stub-lantern-switch.md", "stub"],
		["05-build-blank-proximity-lantern.md", "blank"],
	])("parses the build quest %s at scaffold level %s", (name, scaffold) =>
	{
		const { quest, problems } = parse(example(name));

		expect(problems).toEqual([]);
		expect(quest?.kind).toBe("build");

		if (quest?.kind !== "build") return;

		expect(quest.scaffold).toBe(scaffold);
		expect(quest.hints).toHaveLength(3);
		expect(quest.files.length).toBeGreaterThan(0);
		expect(quest.tests).toContain("IMPLEMENT_SIMPLE_AUTOMATION_TEST");
		expect(quest.brief).toContain("## See it in the editor");
	});

	it("pulls @explain markers out of a worked starter and keeps them as marked lines", () =>
	{
		const { quest } = parse(example("02-build-worked-lantern.md"));

		if (quest?.kind !== "build") throw new Error("expected a build quest");

		const source = quest.files.find((file) => file.name === "DojoExLantern.cpp");

		expect(source?.markedLines?.map((marked) => marked.line)).toEqual([7, 9, 16]);
		expect(source?.starter).not.toContain("@explain");
		expect(source?.starter.split("\n")[6]).toBe("\tPrimaryActorTick.bCanEverTick = false;");
		expect(quest.parsons?.[0]?.distractors[0]?.mistake).toContain("constructor");
	});

	it("parses a refactor quest", () =>
	{
		const { quest, problems } = parse(example("06-refactor-lantern-tick.md"));

		expect(problems).toEqual([]);
		expect(quest?.kind).toBe("refactor");
	});

	it("parses a breakdown quest with required pieces and two reference plans", () =>
	{
		const { quest, problems } = parse(example("07-breakdown-campfire.md"));

		expect(problems).toEqual([]);

		if (quest?.kind !== "breakdown") throw new Error("expected a breakdown quest");

		expect(quest.requiredPieces.map((piece) => piece.kind)).toContain("component");
		expect(quest.referencePlans).toHaveLength(2);
		expect(quest.referencePlans[0]?.edges.length).toBeGreaterThan(0);
		expect(quest.alternativeNote).toContain("Both reference plans");
	});

	it("parses a boss with its build pieces and an 8 bullet integration rubric", () =>
	{
		const { quest, problems } = parse(example("08-boss-lighthouse.md"));

		expect(problems).toEqual([]);

		if (quest?.kind !== "boss") throw new Error("expected a boss");

		expect(quest.pieces).toHaveLength(4);
		expect(quest.integrationRubric).toHaveLength(8);
	});

	it("accepts Windows line endings", () =>
	{
		const { problems } = parse(example("01-concept-uproperty.md").replace(/\n/g, "\r\n"));

		expect(problems).toEqual([]);
	});

	it("refuses a drill file and says where drill items belong", () =>
	{
		const { quest, problems } = parse(example("01-concept-uproperty.md").replace("kind: concept", "kind: drill"));

		expect(quest).toBeUndefined();
		expect(problems[0]?.message).toContain("drill quests are built at runtime");
	});
});

describe("parseQuestFile malformed files", () =>
{
	it("names a missing section", () =>
	{
		const text = example("02-build-worked-lantern.md").replace(/# Tests\n\n```cpp[\s\S]*?\n```\n/, "");
		const { quest, problems } = parse(text);

		expect(quest).toBeUndefined();
		expect(problems).toContainEqual({ file: "quest.md", section: "Tests", message: "missing section \"# Tests\"" });
	});

	it("names a section that is out of order", () =>
	{
		const text = example("07-breakdown-campfire.md").replace("# Spec", "# Rubric-placeholder").replace(/# Rubric\n/, "# Spec\n").replace("# Rubric-placeholder", "# Rubric");
		const { problems } = parse(text);

		expect(problems.some((problem) => problem.message.includes("out of order"))).toBe(true);
	});

	it("reports malformed front matter YAML with the file line", () =>
	{
		const text = example("01-concept-uproperty.md").replace("difficulty: 1", "difficulty: [1");
		const { problems } = parse(text);

		expect(problems[0]?.section).toBe("front matter");
		expect(problems[0]?.message).toMatch(/^YAML is malformed/);
		// The bad value is on file line 7; the yaml package points at where the unclosed list was expected to end.
		expect(problems[0]?.line).toBeGreaterThanOrEqual(7);
	});

	it("reports malformed YAML inside a section with that section's name", () =>
	{
		const text = example("01-concept-uproperty.md").replace("answerIndex: 1\nexplanation: The Details", "answerIndex: 1\n  - broken: [\nexplanation: The Details");
		const { problems } = parse(text);

		expect(problems[0]?.section).toBe("Predict");
		expect(problems[0]?.message).toMatch(/^YAML is malformed/);
	});

	it("reports an unknown front matter field, a wrong difficulty, and a bad scaffold in one pass", () =>
	{
		const text = example("03-build-faded-flicker.md")
			.replace("difficulty: 2", "difficulty: 9\ndificulty: 2")
			.replace("scaffold: faded", "scaffold: half");
		const messages = parse(text).problems.map((problem) => problem.message);

		expect(messages).toContain("difficulty: expected a whole number, 1 to 5");
		expect(messages).toContain("dificulty: unknown field");
		expect(messages.some((message) => message.startsWith("scaffold: \"half\" is not allowed"))).toBe(true);
	});

	it("requires exactly three hints", () =>
	{
		const text = example("04-build-stub-lantern-switch.md").replace(/- `IsValid` from[^\n]*\n/, "");
		const { problems } = parse(text);

		expect(problems).toContainEqual(expect.objectContaining({ section: "Hints", message: "expected exactly 3 hints, found 2" }));
	});

	it("requires the See it in the editor subsection in a brief", () =>
	{
		const text = example("05-build-blank-proximity-lantern.md").replace("## See it in the editor", "## Try it");
		const { problems } = parse(text);

		expect(problems).toContainEqual(expect.objectContaining({ section: "Brief", message: "the brief needs a \"## See it in the editor\" subsection" }));
	});

	it("reports an untagged code block in a starter file", () =>
	{
		const text = example("05-build-blank-proximity-lantern.md").replace("```cpp\n// Declare", "```\n// Declare");
		const { problems } = parse(text);

		expect(problems.some((problem) => problem.section === "Files: DojoExProximityLantern.h" && problem.message.includes("tagged ```cpp"))).toBe(true);
	});

	it("reports a code fence that is never closed", () =>
	{
		const text = `${example("06-refactor-lantern-tick.md")}\n\`\`\`cpp\nint Unclosed = 0;\n`;
		const { problems } = parse(text);

		expect(problems[0]?.message).toBe("a code fence is never closed");
	});

	it("reports a plan piece that covers an unknown required piece and an edge to a missing piece", () =>
	{
		const text = example("07-breakdown-campfire.md")
			.replace("covers: [hud-bar] }\n  edges:", "covers: [hud-widget] }\n  edges:")
			.replace("{ from: changed, to: bar, label: bar updates its fill }\n- id: fire-broadcasts", "{ from: changed, to: nowhere, label: bar updates its fill }\n- id: fire-broadcasts");
		const messages = parse(text).problems.map((problem) => problem.message);

		expect(messages.some((message) => message.includes("covers \"hud-widget\", which is not a required piece id"))).toBe(true);
		expect(messages.some((message) => message.includes("edge to \"nowhere\" does not name a piece in this plan"))).toBe(true);
	});

	it("reports a question id used twice in one quest", () =>
	{
		const text = example("01-concept-uproperty.md").replace("id: visible-versus-edit", "id: fill-specifier");
		const { problems } = parse(text);

		expect(problems).toContainEqual(expect.objectContaining({ message: "question id \"fill-specifier\" is used twice in this quest" }));
	});

	it("reports a multiple-choice answer index outside the choices", () =>
	{
		const text = example("01-concept-uproperty.md").replace("  answerIndex: 1\n  explanation: VisibleAnywhere", "  answerIndex: 7\n  explanation: VisibleAnywhere");
		const { problems } = parse(text);

		expect(problems).toContainEqual(expect.objectContaining({ section: "Questions", message: "Questions[2].answerIndex: expected a whole number, 0 to 3" }));
	});

	it("words schema problems plainly: a bad question type, a missing field, and an unknown field", () =>
	{
		const text = example("01-concept-uproperty.md")
			.replace("type: spot-the-bug", "type: essay")
			.replace("  modelAnswer: The Details panel lists", "  modelAnswr: The Details panel lists");
		const messages = parse(text).problems.map((problem) => problem.message);

		expect(messages.some((message) => message.startsWith("Questions[1].type: \"essay\" is not allowed (expected one of: multiple-choice"))).toBe(true);
		expect(messages).toContain("Questions[3].modelAnswer: missing (expected text)");
		expect(messages).toContain("Questions[3].modelAnswr: unknown field");
	});

	it("reports a file with no front matter", () =>
	{
		const { problems } = parse("# Card\n\nHello");

		expect(problems).toEqual([{ file: "quest.md", line: 1, message: "front matter missing: the file must start with a --- line" }]);
	});
});
