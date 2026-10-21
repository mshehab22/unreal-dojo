// Builds full quest objects from the few fields the map fixture cares about; quest bodies are short stand-ins.
import type { AuthoredQuest, AuthoredQuestKind, QuestFrontMatter, ScaffoldLevel } from "@shared/types/content";

/** The fields a map stage fixture sets; the rest of the quest is filled in. */
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

/** The body text every stand-in quest uses. Screens in M2.1 never show quest bodies. */
const STAND_IN = "Stand-in body from the fake DojoApi.";

/** Turns a seed into a complete AuthoredQuest of its kind. */
export function buildQuest(seed: QuestSeed, order: number): AuthoredQuest
{
	const frontMatter: QuestFrontMatter = {
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
	};

	switch (seed.kind)
	{
		case "concept":
			return {
				...frontMatter,
				kind: "concept",
				predict: { id: "predict", type: "fill-blank", prompt: "___", acceptedAnswers: ["x"], explanation: STAND_IN },
				card: STAND_IN,
				example: STAND_IN,
				questions: [],
			};
		case "breakdown":
			return { ...frontMatter, kind: "breakdown", spec: STAND_IN, requiredPieces: [], referencePlans: [], rubric: [], alternativeNote: STAND_IN };
		case "boss":
			return { ...frontMatter, kind: "boss", spec: STAND_IN, requiredPieces: [], referencePlans: [], pieces: [], integrationRubric: [] };
		case "build":
		case "refactor":
			return {
				...frontMatter,
				kind: seed.kind,
				scaffold: seed.scaffold ?? "stub",
				brief: STAND_IN,
				files: [],
				tests: "",
				hints: [STAND_IN, STAND_IN, STAND_IN],
				rubric: [],
				alternative: STAND_IN,
			};
	}
}
