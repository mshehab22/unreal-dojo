// A small content set loaded through the real ContentCatalog, and the progress stack built on it, for the content-backed progress tests.
import type { AuthoredQuest, BossQuest, BreakdownQuest, BuildQuest, ConceptQuest, LoadedContent, PatternCard, QuestFrontMatter } from "@shared/types/content";
import type { PlayerProgress } from "@shared/types/progress";

import { ContentCatalog } from "../../src/main/content/ContentCatalog";
import type { ProgressGraders } from "../../src/main/services/progress/ProgressGraders";
import { ProgressContentService, type ProgressContentSource } from "../../src/main/services/progress/ProgressContentService";
import { SequenceRandom } from "./SequenceRandom";
import { createTestProgressService, localMoment } from "./progressFixtures";

/** Front matter with defaults. */
function frontMatter(fields: Partial<QuestFrontMatter> & Pick<QuestFrontMatter, "id" | "kind" | "order">): QuestFrontMatter
{
	return { title: fields.id, difficulty: 1, patterns: [], skills: ["ue.objects"], terms: [], prerequisites: [], xp: 100, estimatedMinutes: 5, concepts: [], ...fields };
}

/** World 1 concept quest: teaches term.a and term.b; one question of each type. */
export const conceptQuest: ConceptQuest = {
	...frontMatter({ id: "w1-concept", kind: "concept", order: 1, terms: ["term.a", "term.b"] }),
	kind: "concept",
	predict: { id: "predict", type: "multiple-choice", prompt: "Guess", choices: ["x", "y"], answerIndex: 0, explanation: "" },
	card: "Card text.",
	example: "// example",
	questions: [
		{ id: "q-choice", type: "multiple-choice", prompt: "Pick", choices: ["wrong", "right"], answerIndex: 1, explanation: "Because." },
		{ id: "q-blank", type: "fill-blank", prompt: "Fill ___", acceptedAnswers: ["UPROPERTY"], explanation: "Macro." },
		{ id: "q-pattern", type: "which-pattern", prompt: "Which?", choices: ["observer", "state"], answer: "observer", distractorNotes: [], explanation: "Events." },
		{ id: "q-bug", type: "spot-the-bug", prompt: "Bug?", code: "a\nb\nc", bugLine: 2, fix: "fix b", explanation: "b is wrong." },
		{ id: "q-explain", type: "explain-in-one-sentence", prompt: "Explain term.a", modelAnswer: "It does a.", rubric: ["mentions a"], explanation: "" },
	],
};

/** World 1 worked build quest with a Parsons block; needs the concept quest and term.a. */
export const buildQuest: BuildQuest = {
	...frontMatter({ id: "w1-build", kind: "build", order: 2, prerequisites: ["w1-concept"], terms: ["term.a"], patterns: ["observer"] }),
	kind: "build",
	scaffold: "worked",
	brief: "Brief.\n\n## See it in the editor\nLook.",
	files: [{ name: "Thing.h", starter: "#pragma once" }],
	tests: "// tests",
	hints: ["First hint.", "Second hint.", "Third hint."],
	rubric: ["Works."],
	alternative: "Another way.",
	parsons: [{ id: "order-1", prompt: "Order these", lines: ["first();", "second();", "}"], distractors: [{ line: "wrong();", mistake: "Never." }] }],
};

/** World 1 breakdown quest with two reference plans. */
export const breakdownQuest: BreakdownQuest = {
	...frontMatter({ id: "w1-breakdown", kind: "breakdown", order: 3, prerequisites: ["w1-concept"] }),
	kind: "breakdown",
	spec: "A campfire.",
	requiredPieces: [{ id: "fire", kind: "component", label: "FireComponent", why: "Burns." }],
	referencePlans: [
		{ id: "plan-a", title: "A", pieces: [{ id: "p1", kind: "class", label: "Campfire", covers: [] }], edges: [] },
		{ id: "plan-b", title: "B", pieces: [{ id: "p2", kind: "component", label: "FireComponent", covers: ["fire"] }, { id: "p3", kind: "event", label: "OnLit", covers: [] }], edges: [{ from: "p2", to: "p3", label: "listens to" }] },
	],
	rubric: ["Has fire."],
	alternativeNote: "Note.",
};

/** World 1 boss. */
export const bossQuest: BossQuest = {
	...frontMatter({ id: "w1-boss", kind: "boss", order: 4, prerequisites: ["w1-concept"] }),
	kind: "boss",
	spec: "A lighthouse.",
	requiredPieces: [{ id: "lamp", kind: "component", label: "LampComponent", why: "Lights." }],
	referencePlans: [{ id: "plan", title: "Plan", pieces: [{ id: "p1", kind: "component", label: "LampComponent", covers: ["lamp"] }], edges: [] }],
	pieces: ["w1-build"],
	integrationRubric: ["Fits."],
};

/** World 2 concept quest teaching term.c, after the world 1 concept quest. */
export const secondWorldConcept: ConceptQuest = {
	...conceptQuest,
	...frontMatter({ id: "w2-concept", kind: "concept", order: 1, prerequisites: ["w1-concept"], terms: ["term.c"] }),
	kind: "concept",
	questions: [{ id: "q-c", type: "multiple-choice", prompt: "C?", choices: ["c", "d"], answerIndex: 0, explanation: "" }],
};

/** The Observer pattern card. */
export const observerCard: PatternCard = {
	id: "observer",
	title: "Observer",
	intent: "Tell listeners.",
	problem: "Coupling.",
	unrealForm: "Delegates.",
	whenNot: "One listener.",
	useCaseQuestIds: ["w1-build"],
	recall: [{ id: "r1", type: "fill-blank", prompt: "Unreal form ___", acceptedAnswers: ["delegate"], explanation: "" }],
	scenarios: [{ id: "s1", type: "which-pattern", prompt: "Many listeners?", choices: ["observer", "state"], answer: "observer", distractorNotes: [], explanation: "" }],
};

/** The whole fixture as a content load. */
export function fixtureContent(): LoadedContent
{
	const worldOneQuests: AuthoredQuest[] = [conceptQuest, buildQuest, breakdownQuest, bossQuest];

	return {
		packs: [{
			id: "pack-1",
			title: "Pack",
			summary: "",
			order: 1,
			worlds: [
				{ id: "world-1", title: "World 1", summary: "", order: 1, quests: worldOneQuests },
				{ id: "world-2", title: "World 2", summary: "", order: 2, quests: [secondWorldConcept] },
			],
		}],
		glossary: [],
		patterns: [observerCard],
		files: [],
		questSources: {},
		problems: [],
	};
}

/** Graders that answer fixed grades and record what they were asked. `provider` decides whether answers count as AI graded. */
export function fakeGraders(provider: "claude-code" | "tests-only" = "claude-code", explainVerdict: "correct" | "incorrect" = "correct", breakdownScore = 90): ProgressGraders & { explainCalls: number }
{
	const graders = {
		explainCalls: 0,
		gradeExplain: async () =>
		{
			graders.explainCalls++;

			return { score: explainVerdict === "correct" ? 90 : 20, verdict: explainVerdict, note: "Note.", provider };
		},
		gradeBreakdown: async () => ({
			score: breakdownScore,
			summary: "Summary.",
			requiredPiecesCovered: [{ label: "FireComponent", covered: true, matchedTo: "FireComponent" }],
			concerns: [],
			strengths: [],
			revisionQuality: 80,
			alternativeToShow: 1,
			provider,
		}),
	};

	return graders as ProgressGraders & { explainCalls: number };
}

/** The progress stack on the fixture content, a fixed clock, and an in-memory disk. */
export function createTestProgressContent(options: { graders?: ProgressGraders; random?: number[]; prepare?: (progress: PlayerProgress) => void; content?: LoadedContent; source?: ProgressContentSource } = {})
{
	const progress = createTestProgressService(localMoment(2026, 10, 21, 9), options.random ?? [0], options.prepare);
	const loaded = options.content ?? fixtureContent();
	const catalog = new ContentCatalog({ root: "/fixture", folderExists: async () => true, loadContent: async () => loaded });
	let sessionNumber = 0;
	const content = new ProgressContentService(options.source ?? catalog, progress.service, options.graders ?? fakeGraders(), new SequenceRandom(options.random ?? [0]), () => `session-${++sessionNumber}`);

	return { ...progress, catalog, content };
}
