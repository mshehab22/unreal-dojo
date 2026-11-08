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
	it("tests again exactly the pieces a boss carries its own copy of, and no other quest", async () =>
	{
		const { quests, requirementsOf } = await realEngineQuests();
		const questIds = new Set(quests.map((entry) => entry.quest.id));
		const pieceCopies = new Set(quests.flatMap((entry) => [...(entry.overrides?.keys() ?? [])]).filter((pieceId) => questIds.has(pieceId)));
		const groups = ownStateGroups(quests, quests, requirementsOf);
		const retested = groups.flatMap((group) => group.members.map((member) => member.quest.id));

		expect(pieceCopies.size).toBeGreaterThan(0);
		expect(new Set(retested)).toEqual(pieceCopies);
		expect(retested).toHaveLength(pieceCopies.size);
	});

	it("builds a handful of extra states for the whole content, and none for a pack without boss copies", async () =>
	{
		const { quests, requirementsOf } = await realEngineQuests();
		const patterns = quests.filter((entry) => entry.quest.id.startsWith("p") && /^p\d/.test(entry.quest.id));

		expect(ownStateGroups(quests, quests, requirementsOf).length).toBeLessThanOrEqual(5);
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
