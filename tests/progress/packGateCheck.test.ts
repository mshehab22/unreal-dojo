// The verifier's pack gate check: a gate naming a missing world, or a world with no boss, is a warning until release and an error with --release (A511).
import { describe, expect, it } from "vitest";

import type { AuthoredQuest, LoadedContent, World } from "@shared/types/content";

import type { VerifierInput } from "../../tools/verifier/ContentCheck";
import { createPackGateCheck, packGateCheck } from "../../tools/verifier/checks/packGateCheck";
import { bossQuest, conceptQuest } from "../support/contentFixture";
import type { PackGate } from "../../src/main/services/progress/rules";

/** A gate on Pack 4 that waits for two worlds. */
const GATE: PackGate = { packOrder: 4, requiresBossOf: [{ packId: "foundations", worldId: "communication" }, { packId: "patterns", worldId: "component" }] };

/** A world with the given id and quests. */
function world(id: string, quests: AuthoredQuest[]): World
{
	return { id, title: id, summary: "", order: 1, quests };
}

/** Verifier input over these packs. */
function input(packs: { id: string; worlds: World[] }[], release = false): VerifierInput
{
	const content: LoadedContent = {
		packs: packs.map((pack, index) => ({ id: pack.id, title: pack.id, summary: "", order: index + 1, worlds: pack.worlds })),
		glossary: [],
		patterns: [],
		files: [],
		questSources: {},
		problems: [],
	};

	return { content, examples: [], quests: [], solutionsFolder: "", release };
}

describe("pack gate check", async () =>
{
	it("warns for each gate world that does not exist yet, naming the pack file", async () =>
	{
		const problems = await createPackGateCheck([GATE]).run(input([{ id: "foundations", worlds: [] }]));

		expect(problems).toHaveLength(2);
		expect(problems.every((problem) => problem.severity === "warning")).toBe(true);
		expect(problems[0]).toMatchObject({ file: "packs/foundations/pack.json", section: "pack gate" });
		expect(problems[0]?.message).toMatch(/names world "communication" in pack "foundations", which does not exist yet/);
		expect(problems[1]).toMatchObject({ file: "packs" });
		expect(problems[1]?.message).toMatch(/names pack "patterns", which does not exist yet/);
	});

	it("warns for a gate world that exists but has no boss yet", async () =>
	{
		const packs = [{ id: "foundations", worlds: [world("communication", [bossQuest])] }, { id: "patterns", worlds: [world("component", [conceptQuest])] }];
		const problems = await createPackGateCheck([GATE]).run(input(packs));

		expect(problems).toHaveLength(1);
		expect(problems[0]?.message).toMatch(/world "component" in pack "patterns", which has no boss yet/);
	});

	it("is quiet on an empty content folder, which has no curriculum to gate", async () =>
	{
		expect(await createPackGateCheck([GATE]).run(input([]))).toEqual([]);
	});

	it("is quiet when both worlds exist with a boss", async () =>
	{
		const packs = [{ id: "foundations", worlds: [world("communication", [bossQuest])] }, { id: "patterns", worlds: [world("component", [bossQuest])] }];

		expect(await createPackGateCheck([GATE]).run(input(packs))).toEqual([]);
	});

	it("turns the warnings into errors with --release", async () =>
	{
		const problems = await createPackGateCheck([GATE]).run(input([{ id: "foundations", worlds: [] }], true));

		expect(problems).toHaveLength(2);
		expect(problems.some((problem) => problem.severity === "warning")).toBe(false);
	});

	it("runs over the app's own gate: Communication in foundations and Component in patterns", async () =>
	{
		const messages = (await packGateCheck.run(input([{ id: "foundations", worlds: [] }, { id: "patterns", worlds: [] }]))).map((problem) => problem.message);

		expect(messages.join("\n")).toMatch(/"communication" in pack "foundations"/);
		expect(messages.join("\n")).toMatch(/"component" in pack "patterns"/);
	});
});
