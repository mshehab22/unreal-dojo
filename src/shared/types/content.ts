// Shared content types: quests of every kind, drill items, glossary entries, pattern cards, packs, and worlds.

/** The six quest kinds (D14). Every kind except drill is written as a Markdown file. */
export type QuestKind = "concept" | "drill" | "breakdown" | "build" | "refactor" | "boss";

/** The quest kinds that live in Markdown files; drills are generated at runtime from due items. */
export type AuthoredQuestKind = Exclude<QuestKind, "drill">;

/** How much of the code a build or refactor quest gives the learner, from most help to none. */
export type ScaffoldLevel = "worked" | "faded" | "stub" | "blank";

/** What role a piece plays in a breakdown plan. */
export type PieceKind = "class" | "component" | "data" | "event" | "step";

/** Front matter fields every quest file carries. */
export interface QuestFrontMatter
{
	id: string;
	title: string;
	order: number;
	kind: QuestKind;

	/** 1 (easiest) to 5 (hardest). */
	difficulty: number;

	/** Pattern card ids this quest uses. */
	patterns: string[];

	/** Skill ids this quest trains (the skill tree reads these). */
	skills: string[];

	/** Glossary entry ids this quest uses. */
	terms: string[];

	/** Quest ids that must be passed before this one unlocks. */
	prerequisites: string[];

	xp: number;
	estimatedMinutes: number;

	/** Plain-language names of the ideas this quest teaches. */
	concepts: string[];
}

/** A pick-one question with the index of the right choice. */
export interface MultipleChoiceQuestion
{
	id: string;
	type: "multiple-choice";
	prompt: string;
	code?: string;
	choices: string[];
	answerIndex: number;
	explanation: string;
}

/** A prompt with exactly one `___` gap and every answer that counts as right. */
export interface FillBlankQuestion
{
	id: string;
	type: "fill-blank";
	prompt: string;
	code?: string;
	acceptedAnswers: string[];
	explanation: string;
}

/** Why a wrong pattern choice does not fit, shown after the learner picks it. */
export interface DistractorNote
{
	choice: string;
	why: string;
}

/** A scenario where the learner names the pattern that fits; choices and answer are pattern ids. */
export interface WhichPatternQuestion
{
	id: string;
	type: "which-pattern";
	prompt: string;
	choices: string[];
	answer: string;

	/** Why each wrong choice does not fit (M1.8 checks there is one per wrong choice). */
	distractorNotes: DistractorNote[];
	explanation: string;
}

/** A code snippet with one wrong line the learner must find. */
export interface SpotTheBugQuestion
{
	id: string;
	type: "spot-the-bug";
	prompt: string;

	/** Trimmed of blank lines before and whitespace after, so `bugLine` counts the lines the learner sees. */
	code: string;

	/** 1-based line number of the bug inside `code`. */
	bugLine: number;

	fix: string;
	explanation: string;
}

/** A one-sentence answer graded against a rubric, with a model answer shown afterwards. */
export interface ExplainInOneSentenceQuestion
{
	id: string;
	type: "explain-in-one-sentence";
	prompt: string;
	code?: string;
	modelAnswer: string;
	rubric: string[];
	explanation: string;
}

/** Every question type used by concept quests, pattern cards, and drills. */
export type Question =
	| MultipleChoiceQuestion
	| FillBlankQuestion
	| WhichPatternQuestion
	| SpotTheBugQuestion
	| ExplainInOneSentenceQuestion;

/** The name of each question type, taken from the union so the two never drift apart. */
export type QuestionType = Question["type"];

/** A wrong line mixed into a Parsons block, with the mistake it shows. */
export interface ParsonsDistractor
{
	line: string;
	mistake: string;
}

/** A reorder-the-lines drill item: the right order plus distractor lines. */
export interface ParsonsBlock
{
	id: string;
	prompt: string;

	/** The correct lines in order, leading spaces kept. */
	lines: string[];

	distractors: ParsonsDistractor[];
}

/** A piece the breakdown grader must find in the learner's plan. */
export interface RequiredPiece
{
	id: string;
	kind: PieceKind;
	label: string;
	why: string;
}

/** One labeled piece in a reference plan, naming the required pieces it covers. */
export interface PlanPiece
{
	id: string;
	kind: PieceKind;
	label: string;

	/** Required piece ids this plan piece satisfies. */
	covers: string[];
}

/** A labeled link between two plan pieces (an event, a reference, an order). */
export interface PlanEdge
{
	from: string;
	to: string;
	label: string;
}

/** One valid way to split a mechanic into pieces. */
export interface ReferencePlan
{
	id: string;
	title: string;
	pieces: PlanPiece[];
	edges: PlanEdge[];
}

/** A line of a worked starter file that the learner must explain before the gap unlocks. */
export interface MarkedLine
{
	/** 1-based line number inside the starter. */
	line: number;

	/** The model reason shown after the learner writes theirs. */
	reason: string;
}

/** A starter source file the learner edits. */
export interface QuestFile
{
	name: string;
	starter: string;
	markedLines?: MarkedLine[];
}

/** A concept quest: a predict question, a card, an editable example, and recall questions. */
export interface ConceptQuest extends QuestFrontMatter
{
	kind: "concept";
	predict: Question;
	card: string;
	example: string;
	questions: Question[];
}

/** A breakdown quest: plan a finished mechanic before writing code. */
export interface BreakdownQuest extends QuestFrontMatter
{
	kind: "breakdown";
	spec: string;
	requiredPieces: RequiredPiece[];
	referencePlans: ReferencePlan[];
	rubric: string[];
	alternativeNote: string;
}

/** Fields shared by build and refactor quests. */
export interface CodeQuestFields
{
	scaffold: ScaffoldLevel;

	/** Markdown brief; always has a `## See it in the editor` subsection. */
	brief: string;

	files: QuestFile[];

	/** UE automation test source compiled with the learner's code. */
	tests: string;

	/** The ladder of three hints, none with code. */
	hints: [string, string, string];

	rubric: string[];

	/** Markdown alternative solution with a tradeoff note, shown after the pass. */
	alternative: string;

	parsons?: ParsonsBlock[];
}

/** A build quest: write real UE C++ that the engine compiles and tests. */
export interface BuildQuest extends QuestFrontMatter, CodeQuestFields
{
	kind: "build";
}

/** A refactor quest: reshape working starter code without breaking its tests. */
export interface RefactorQuest extends QuestFrontMatter, CodeQuestFields
{
	kind: "refactor";
}

/** A boss: a breakdown whose pieces are build quests, judged on how they fit together. */
export interface BossQuest extends QuestFrontMatter
{
	kind: "boss";
	spec: string;
	requiredPieces: RequiredPiece[];
	referencePlans: ReferencePlan[];

	/** Build quest ids that make up the boss. */
	pieces: string[];

	integrationRubric: string[];
}

/** Where a drill item came from, so a review can be logged against the right source. */
export type DrillItem =
	| { source: "quest-question"; questId: string; question: Question }
	| { source: "pattern-recall"; patternId: string; question: Question }
	| { source: "pattern-scenario"; patternId: string; question: Question }
	| { source: "parsons"; questId: string; parsons: ParsonsBlock };

/** A drill assembled at runtime from due items; never written as a file. */
export interface DrillQuest extends QuestFrontMatter
{
	kind: "drill";
	items: DrillItem[];
}

/** Every quest, discriminated on `kind`. */
export type Quest = ConceptQuest | DrillQuest | BreakdownQuest | BuildQuest | RefactorQuest | BossQuest;

/** A quest that comes from a Markdown file. */
export type AuthoredQuest = Exclude<Quest, DrillQuest>;

/** One glossary term with its hover text and Epic docs link. */
export interface GlossaryEntry
{
	id: string;
	term: string;
	aliases: string[];
	category: string;
	short: string;
	long: string;
	unrealDocsUrl: string;

	/** Other glossary ids. */
	related: string[];

	firstQuestId?: string;
}

/** A collectible pattern card with its recall and scenario drill items. */
export interface PatternCard
{
	id: string;
	title: string;
	intent: string;
	problem: string;
	unrealForm: string;
	whenNot: string;
	useCaseQuestIds: string[];
	recall: Question[];
	scenarios: Question[];
}

/** A world inside a pack: an ordered list of quests. */
export interface World
{
	id: string;
	title: string;
	summary: string;

	/** Taken from the `<nn>` prefix of the world folder. */
	order: number;

	/** Sorted by each quest's `order`. */
	quests: AuthoredQuest[];
}

/** A pack of worlds, loaded from `content/packs/<pack-id>/`. */
export interface Pack
{
	id: string;
	title: string;
	summary: string;
	order: number;

	/** Sorted by folder order. */
	worlds: World[];
}

/** One thing wrong with a content file, always naming the file. */
export interface ContentProblem
{
	/** Path relative to the content folder, with forward slashes. */
	file: string;

	/** The Markdown section or JSON entry the problem is in, when there is one. */
	section?: string;

	/** 1-based line in the file, when known. */
	line?: number;

	message: string;
}

/** Everything loaded from a content folder, plus every problem found on the way. */
export interface LoadedContent
{
	packs: Pack[];
	glossary: GlossaryEntry[];
	patterns: PatternCard[];

	/** Every file that was read, relative to the content folder, in reading order. */
	files: string[];

	/** The file each loaded quest came from, keyed by quest id. */
	questSources: Record<string, string>;

	problems: ContentProblem[];
}
