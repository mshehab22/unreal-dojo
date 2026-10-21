// What the renderer receives from the loaded content: outlines for the World Map, full quests for one screen, and the glossary alias table.
import type { AuthoredQuest, AuthoredQuestKind, CodeQuestFields, ContentProblem, Pack, QuestFrontMatter, ScaffoldLevel, World } from "./content";

/** One quest as the World Map needs it: front matter only, plus the scaffold level for build and refactor quests. */
export type QuestOutline = Omit<QuestFrontMatter, "kind"> & { kind: AuthoredQuestKind; scaffold?: ScaffoldLevel };

/** One world with quest outlines instead of full quests. */
export type WorldOutline = Omit<World, "quests"> & { quests: QuestOutline[] };

/** One pack with world outlines, the whole World Map in one answer. */
export type PackOutline = Omit<Pack, "worlds"> & { worlds: WorldOutline[] };

/** Swaps the priced hint texts of build and refactor quests for their count; hints only reach the renderer through `revealHint` (A222). */
type WithoutHintTexts<Quest> = Quest extends CodeQuestFields ? Omit<Quest, "hints"> & { hintCount: number } : Quest;

/** A full quest as a quest screen receives it. Identical to the authored quest except that hint texts are left out. */
export type LearnerQuest = WithoutHintTexts<AuthoredQuest>;

/** A full world as a quest screen receives it. */
export type LearnerWorld = Omit<World, "quests"> & { quests: LearnerQuest[] };

/** One row of the flat alias table that Monaco's hover and completion providers and the TermLinker read. */
export interface GlossaryAlias
{
	/** The text to match: an entry's term or one of its aliases. */
	text: string;

	/** The glossary entry it points to. */
	entryId: string;

	/** True for identifiers such as `AActor` or `UPROPERTY` (matched exactly); false for plain words such as "actor" (matched in any case). */
	caseSensitive: boolean;

	/** True when the entry only links inside inline code (`linkMode: "code-only"`). */
	codeOnly: boolean;

	/** The entry's short definition, for the hover. */
	short: string;
}

/** How the content load went, for the Title screen and the dev overlay. */
export interface ContentStatus
{
	/** The folder content was read from. */
	root: string;

	/** Number of packs loaded. */
	packCount: number;

	/** Number of quests loaded across all packs. */
	questCount: number;

	/** Number of glossary entries loaded. */
	glossaryCount: number;

	/** Number of pattern cards loaded. */
	patternCount: number;

	/** Every problem found; files with problems were left out. Empty when everything loaded. */
	problems: ContentProblem[];
}
