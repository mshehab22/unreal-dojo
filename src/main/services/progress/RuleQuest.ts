// The quest facts the rules read, kept narrow so the rules do not depend on the content parser's full shapes.
import type { QuestKind, ScaffoldLevel } from "./contentFacts";

/** One quest as the rules see it: identity, place on the map, price, and what it trains. Built from the content types. */
export interface RuleQuest
{
	/** Quest id. */
	id: string;

	/** Title, for locked reasons ("Pass Health Component first."). */
	title: string;

	/** Quest kind. */
	kind: QuestKind;

	/** Difficulty from 1 to 5. */
	difficulty: number;

	/** Base XP. */
	xp: number;

	/** The pack the quest belongs to and the pack's order. */
	packId: string;
	packOrder: number;

	/** The world the quest belongs to and the world's order inside its pack. */
	worldId: string;
	worldOrder: number;

	/** The quest's order inside its world. */
	order: number;

	/** Scaffold level for build and refactor quests. */
	scaffold?: ScaffoldLevel;

	/** Quest ids that must be passed first. */
	prerequisites: string[];

	/** Glossary term ids the quest uses (each must be at least familiar). */
	terms: string[];

	/** Pattern ids the quest uses. */
	patterns: string[];

	/** Skill ids the quest trains. */
	skills: string[];
}
