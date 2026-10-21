// Builds the quest outlines the World Map receives from the few fields the map fixture sets.
import type { AuthoredQuestKind, ScaffoldLevel } from "@shared/types/content";
import type { QuestOutline } from "@shared/types/catalog";

/** The fields a map stage fixture sets; the rest of the outline is filled in. */
export interface QuestSeed
{
	id: string;
	title: string;
	kind: AuthoredQuestKind;
	difficulty: number;
	xp: number;
	minutes: number;
	terms?: string[];
	skills?: string[];
	patterns?: string[];
	scaffold?: ScaffoldLevel;
	prerequisites?: string[];
}

/** Turns a seed into a QuestOutline, as `listPacks` answers it. */
export function buildQuestOutline(seed: QuestSeed, order: number): QuestOutline
{
	return {
		id: seed.id,
		title: seed.title,
		order,
		kind: seed.kind,
		difficulty: seed.difficulty,
		patterns: seed.patterns ?? [],
		skills: seed.skills ?? [],
		terms: seed.terms ?? [],
		prerequisites: seed.prerequisites ?? [],
		xp: seed.xp,
		estimatedMinutes: seed.minutes,
		concepts: [],
		...(seed.scaffold ? { scaffold: seed.scaffold } : {}),
	};
}
