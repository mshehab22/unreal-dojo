// Checks the prerequisite graph: no cycles, and every quest unlocks from its pack's first quest.
import type { ContentProblem } from "../../../src/shared/types/content";
import type { ContentCheck, QuestRecord } from "../ContentCheck";
import { errorAt, packQuests } from "./checkHelpers";

/** Finds every cycle once, as the list of quest ids around it (depth-first search with an on-path set). */
function findCycles(prerequisitesOf: ReadonlyMap<string, readonly string[]>): string[][]
{
	const cycles: string[][] = [];
	const finished = new Set<string>();
	const path: string[] = [];
	const onPath = new Set<string>();

	/** Visits one quest, following its prerequisites. */
	const visit = (id: string): void =>
	{
		if (finished.has(id)) return;

		if (onPath.has(id))
		{
			cycles.push([...path.slice(path.indexOf(id)), id]);
			return;
		}

		onPath.add(id);
		path.push(id);

		for (const prerequisite of prerequisitesOf.get(id) ?? []) if (prerequisitesOf.has(prerequisite)) visit(prerequisite);

		path.pop();
		onPath.delete(id);
		finished.add(id);
	};

	for (const id of [...prerequisitesOf.keys()].sort()) visit(id);

	return cycles;
}

/** The quests that can ever unlock: start with quests that need nothing, then add any quest whose prerequisites are all unlocked. */
function unlockable(prerequisitesOf: ReadonlyMap<string, readonly string[]>): Set<string>
{
	const unlocked = new Set<string>();
	let grew = true;

	while (grew)
	{
		grew = false;

		for (const [id, prerequisites] of prerequisitesOf)
		{
			if (!unlocked.has(id) && prerequisites.every((prerequisite) => unlocked.has(prerequisite) || !prerequisitesOf.has(prerequisite)))
			{
				unlocked.add(id);
				grew = true;
			}
		}
	}

	return unlocked;
}

/**
 * Cycles, quests that can never unlock, and extra entry points: inside a pack only the first quest of the first world
 * may have no prerequisites, so every other quest is reached from it (A203). Missing prerequisite ids are the
 * reference check's job and are ignored here.
 */
export const unlockGraphCheck: ContentCheck = {
	name: "unlock graph",
	run(input)
	{
		const problems: ContentProblem[] = [];
		const records = packQuests(input);
		const fileOf = new Map(records.map((record) => [record.quest.id, record.file]));
		const prerequisitesOf = new Map(records.map((record) => [record.quest.id, record.quest.prerequisites]));
		const inCycle = new Set<string>();

		for (const cycle of findCycles(prerequisitesOf))
		{
			const first = cycle[0] ?? "";

			cycle.forEach((id) => inCycle.add(id));
			problems.push(errorAt(fileOf.get(first) ?? "packs", `prerequisites form a cycle: ${cycle.join(" -> ")}`, "front matter"));
		}

		const unlocked = unlockable(prerequisitesOf);

		for (const record of records)
		{
			if (!unlocked.has(record.quest.id) && !inCycle.has(record.quest.id))
			{
				problems.push(errorAt(record.file, "can never unlock: one of its prerequisites sits on or after a prerequisite cycle", "front matter"));
			}
		}

		const firstByPack = new Map<string, QuestRecord>();

		for (const record of records) if (record.packId !== undefined && !firstByPack.has(record.packId)) firstByPack.set(record.packId, record);

		for (const record of records)
		{
			const first = record.packId === undefined ? undefined : firstByPack.get(record.packId);

			if (first !== undefined && first !== record && record.quest.prerequisites.length === 0)
			{
				problems.push(errorAt(record.file, `not reachable from the pack's first quest "${first.quest.id}": it has no prerequisites`, "front matter"));
			}
		}

		return problems;
	},
};
