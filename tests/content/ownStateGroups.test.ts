// Checks which quests the engine stage tests again in their own sandbox (A2040), on the real content and solutions, without an engine.
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { directRequirements, engineQuests, ownStateGroups } from "../../tools/verifier/engine/EngineVerifier";
import { parseVerifierArguments } from "../../tools/verifier/parseVerifierArguments";
import { runVerifier } from "../../tools/verifier/runVerifier";

/** Loads the real quest records and the engine quests read from `tools/solutions`. */
async function realEngineQuests(): Promise<{ quests: Awaited<ReturnType<typeof engineQuests>>["quests"]; requirementsOf: Map<string, string[]> }>
{
	const parsed = parseVerifierArguments([], resolve("content"), resolve("tools", "solutions"));

	if (!parsed.ok) throw new Error(parsed.message);

	const result = await runVerifier(parsed.options);
	const { quests } = await engineQuests(result.input.quests, parsed.options.solutionsFolder);

	return { quests, requirementsOf: new Map(result.input.quests.map((record) => [record.quest.id, directRequirements(record)])) };
}

describe("ownStateGroups on the real content (A2040)", () =>
{
	it("tests again every piece a boss carries its own copy of, each quest once, and not every quest", async () =>
	{
		const { quests, requirementsOf } = await realEngineQuests();
		const questIds = new Set(quests.map((entry) => entry.quest.id));
		const pieceCopies = [...new Set(quests.flatMap((entry) => [...(entry.overrides?.keys() ?? [])]).filter((pieceId) => questIds.has(pieceId)))];
		const retested = ownStateGroups(quests, quests, requirementsOf).flatMap((group) => group.members.map((member) => member.quest.id));

		expect(pieceCopies.length).toBeGreaterThan(0);
		expect(retested).toEqual(expect.arrayContaining(pieceCopies));
		expect(new Set(retested).size).toBe(retested.length);
		expect(retested.length).toBeLessThan(quests.length);
	});

	it("builds a handful of extra states for the whole content, and none for a pack without boss copies", async () =>
	{
		const { quests, requirementsOf } = await realEngineQuests();
		const patterns = quests.filter((entry) => /^p\d/.test(entry.quest.id));

		expect(patterns.length).toBeGreaterThan(0);

		expect(ownStateGroups(quests, quests, requirementsOf).length).toBeLessThanOrEqual(6);
		expect(ownStateGroups(quests, patterns, requirementsOf)).toEqual([]);
	});

	it("gives each group a state that holds every member on its own solution, not the boss's copy", async () =>
	{
		const { quests, requirementsOf } = await realEngineQuests();

		for (const group of ownStateGroups(quests, quests, requirementsOf))
		{
			for (const member of group.members)
			{
				expect(group.desired.get(member.quest.id)?.files).toEqual(member.solution);
			}
		}
	});
});
