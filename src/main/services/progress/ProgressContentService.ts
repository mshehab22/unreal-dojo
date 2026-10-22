// Answers the progress and drill IPC methods that need content: reads quest facts and drill items from the catalog and applies them through ProgressService.
import type { LearnerQuest, LearnerWorld, PackOutline } from "@shared/types/catalog";
import type { AuthoredQuest, BreakdownQuest, BossQuest, PatternCard, ReferencePlan } from "@shared/types/content";
import type { DrillRequest, DrillSession } from "@shared/types/drill";
import type {
	BreakdownEdgeKind,
	BreakdownOutcome,
	BreakdownPlan,
	BreakdownReferenceChoice,
	BreakdownRevision,
	BreakdownSubmission,
	ConceptOutcome,
	ConceptSubmission,
	DailyQuestState,
	DrillAnswer,
	DrillItemResult,
	DrillOutcome,
	HintReveal,
	QuestAvailability,
	WorldTestOutStatus,
} from "@shared/types/progress";
import { worldKeyOf } from "@shared/types/progress";
import type { ExplainGrade } from "@shared/types/review";

import { AppErrorException } from "../../errors/AppErrorException";
import { DailyQuestService } from "./DailyQuestService";
import { DrillItemBank, parsonsItemId, worldIdsOf, type DrillVariant } from "./DrillItemBank";
import { DrillScheduler } from "./DrillScheduler";
import { DrillSessionStore } from "./DrillSessionStore";
import { ItemGrader } from "./ItemGrader";
import { MasteryRules } from "./MasteryRules";
import { PassRules } from "./PassRules";
import type { ProgressGraders } from "./ProgressGraders";
import type { ProgressService } from "./ProgressService";
import type { RandomSource } from "./RandomSource";
import type { RuleQuest } from "./RuleQuest";
import { FAILED_SUBMITS_BEFORE_OFFERS } from "./rules";
import { Sm2Scheduler } from "./Sm2Scheduler";
import { testOutTermsOf } from "./taughtTerms";
import { toRuleQuests } from "./toRuleQuests";

/** The part of the content catalog this service reads. ContentCatalog meets it. */
export interface ProgressContentSource
{
	/** Every pack as an outline, in order. */
	listPacks(): Promise<PackOutline[]>;

	/** One full world (hint texts left out). */
	getWorld(worldId: string): Promise<LearnerWorld>;

	/** One full quest (hint texts left out). */
	getQuest(questId: string): Promise<LearnerQuest>;

	/** One quest with everything, hints included, or undefined for an unknown id. */
	getAuthoredQuest(questId: string): Promise<AuthoredQuest | undefined>;

	/** Every pattern card. */
	getPatternCards(): Promise<PatternCard[]>;
}

/** Quest facts and the drill bank built from one content load. */
interface ContentView
{
	/** Every quest as the rules read it, in map order. */
	quests: RuleQuest[];

	/** Every way to ask about every item. */
	bank: DrillItemBank;
}

/** Breakdown edge labels mapped to the board's edge kinds (A316). */
const EDGE_KIND_WORDS: [string, BreakdownEdgeKind][] = [["own", "owns"], ["listen", "listens-to"], ["spawn", "spawns"]];

/** Grader provider id that means no AI looked at the answer. */
const TESTS_ONLY_PROVIDER = "tests-only";

/** Connects the content catalog, the progress rules, and the graders for the content-backed IPC methods. */
export class ProgressContentService
{
	/** Grades answers. */
	private readonly itemGrader = new ItemGrader();

	/** Composes drills. */
	private readonly drillScheduler = new DrillScheduler();

	/** Picks daily candidates. */
	private readonly dailyQuest = new DailyQuestService();

	/** Concept pass rule. */
	private readonly passRules = new PassRules();

	/** Quality from scores. */
	private readonly quality = new Sm2Scheduler();

	/** Compares mastery levels. */
	private readonly mastery = new MasteryRules();

	/** Open drill sessions. */
	private readonly sessions: DrillSessionStore;

	/** The content view, cached per pack outline list (a new content load gives a new list). */
	private cachedView: { packs: PackOutline[]; view: Promise<ContentView> } | null = null;

	/** Keeps the collaborators. `createSessionId` makes drill session ids. */
	constructor(
		private readonly content: ProgressContentSource,
		private readonly progress: ProgressService,
		private readonly graders: ProgressGraders,
		private readonly random: RandomSource,
		createSessionId: () => string,
	)
	{
		this.sessions = new DrillSessionStore(createSessionId);
	}

	/** Availability of every quest for the World Map. */
	async getQuestAvailability(): Promise<Record<string, QuestAvailability>>
	{
		const { quests } = await this.view();

		return this.progress.getQuestAvailability(quests);
	}

	/** Test-out eligibility and status of every world, by world id. */
	async getTestOutStatus(): Promise<Record<string, WorldTestOutStatus>>
	{
		const { quests } = await this.view();
		const progress = this.progress.getProgress();
		const result: Record<string, WorldTestOutStatus> = {};

		for (const quest of this.firstQuestOfEachWorld(quests))
		{
			const worldKey = worldKeyOf(quest.packId, quest.worldId);
			const terms = testOutTermsOf(quests, quest.packId, quest.worldId);
			const weak = terms.filter((term) => !this.mastery.isAtLeast(progress.memory[term]?.mastery, "proficient"));
			const status: WorldTestOutStatus = { eligible: terms.length > 0 && weak.length === 0, testedOut: progress.testedOutWorldIds.includes(worldKey) };

			if (terms.length === 0) status.reason = "This world has no terms to test.";
			else if (weak.length > 0) status.reason = weak.length === 1 ? "1 term is not proficient yet." : `${weak.length} terms are not proficient yet.`;

			result[worldKey] = status;
		}

		return result;
	}

	/** Reveals the next hint spell of a build or refactor quest, or answers an already revealed one again for free. */
	async revealHint(questId: string, hintIndex?: number): Promise<HintReveal>
	{
		const quest = await this.openQuest(questId);

		if (quest.authored.kind !== "build" && quest.authored.kind !== "refactor") throw new AppErrorException("invalid-payload", "This quest has no hint spells.", "Hints are on build and refactor quests.");

		return this.progress.revealHint(quest.rule, [...quest.authored.hints], hintIndex);
	}

	/** One quest as the quest screen receives it, with the texts of the hint spells already revealed (A502). Unrevealed hints never leave main (A222). */
	async getQuest(questId: string): Promise<LearnerQuest>
	{
		return this.withRevealedHints(await this.content.getQuest(questId));
	}

	/** One world as the quest screens receive it, each quest with its revealed hint texts. */
	async getWorld(worldId: string): Promise<LearnerWorld>
	{
		const world = await this.content.getWorld(worldId);

		return { ...world, quests: await Promise.all(world.quests.map((quest) => this.withRevealedHints(quest))) };
	}

	/** Grades a concept quest, reviews its terms in the scheduler, and records the attempt. The prediction is never graded. */
	async submitConcept(submission: ConceptSubmission): Promise<ConceptOutcome>
	{
		const { rule, authored } = await this.openQuest(submission.questId);

		if (authored.kind !== "concept") throw new AppErrorException("invalid-payload", "That quest is not a concept quest.", "Open the quest again from the World Map.");
		if (submission.answers.length !== authored.questions.length) throw new AppErrorException("invalid-payload", "Every question needs an answer.", "Answer every question, then finish the quest.", `${submission.answers.length} answers for ${authored.questions.length} questions`);

		const graded = await Promise.all(authored.questions.map(async (question, index) =>
		{
			const answer = submission.answers[index] ?? { kind: "text" as const, text: "" };
			const grade = this.itemGrader.gradeQuestion(question, answer);

			if (grade.kind === "graded") return { questionId: question.id, correct: grade.correct, counted: true, modelAnswer: grade.modelAnswer };

			const explainGrade = await this.gradeExplainAnswer(grade.question.prompt, grade.question.modelAnswer, grade.question.rubric, grade.answer);
			const counted = explainGrade.provider !== TESTS_ONLY_PROVIDER;

			return { questionId: question.id, correct: explainGrade.verdict === "correct", counted, modelAnswer: grade.question.modelAnswer, explainGrade };
		}));

		// A self-checked explain answer (no AI grader) is left out of the pass count, so a missing reviewer never fails the quest (A315).
		const counted = graded.filter((result) => result.counted);
		const correctCount = counted.filter((result) => result.correct).length;
		const passed = this.passRules.isConceptPass(correctCount, counted.length);
		const score = this.passRules.conceptScore(correctCount, counted.length);
		const termQuality = this.quality.qualityFromScore(score, passed);
		const skillId = rule.skills[0];
		const context = skillId === undefined ? { earnedInWorldId: rule.worldId } : { earnedInWorldId: rule.worldId, skillId };
		const itemReviews = rule.terms.map((itemId) => ({ itemId, quality: termQuality, context }));
		const { quests } = await this.view();

		const outcome = await this.progress.recordAttempt({ quest: rule, score, passed, compiled: true, isSubmit: false, itemReviews }, quests);
		const schedule = this.progress.getProgress().schedule;
		const nextDueAt = rule.terms.map((term) => schedule[term]).filter((due): due is string => due !== undefined).sort()[0] ?? outcome.nextDueDates[0] ?? new Date().toISOString();

		const results: DrillItemResult[] = graded.map((result) =>
		{
			const item: DrillItemResult = { itemId: result.questionId, correct: result.correct, quality: this.quality.qualityFromAnswer(result.correct), modelAnswer: result.modelAnswer, nextDueAt };
			if (result.explainGrade) item.explainGrade = result.explainGrade;
			if (!result.counted) item.selfChecked = true;

			return item;
		});

		return { results, outcome };
	}

	/** Keeps the first breakdown plan and answers which reference plan to show beside it: the one sharing the most piece labels. */
	async submitBreakdown(submission: BreakdownSubmission): Promise<BreakdownReferenceChoice>
	{
		const { authored } = await this.openQuest(submission.questId);
		const quest = this.asBreakdownQuest(authored);

		await this.progress.saveSubmittedPlan(submission.questId, submission.plan);

		return { referencePlanIndex: this.closestReferencePlan(submission.plan, quest.referencePlans) };
	}

	/** Grades the revised plan. A breakdown quest records the attempt; a boss keeps the plan and passes later with its integration build (A317). */
	async reviseBreakdown(revision: BreakdownRevision): Promise<BreakdownOutcome>
	{
		const { rule, authored } = await this.openQuest(revision.questId);
		const quest = this.asBreakdownQuest(authored);
		const questProgress = this.progress.getProgress().quests[revision.questId];

		if (!questProgress?.submittedPlan) throw new AppErrorException("invalid-payload", "Submit your first plan before revising it.", "Press Submit to see a reference plan, then revise.");
		if (revision.revisionNote.trim().length === 0) throw new AppErrorException("invalid-payload", "Write at least one sentence on what you changed and why.", "Add a revision note, then submit again.");

		const grade = await this.graders.gradeBreakdown({
			questId: quest.id,
			spec: quest.spec,
			requiredPieces: quest.requiredPieces.map((piece) => ({ kind: piece.kind, label: piece.label, why: piece.why })),
			referencePlans: quest.referencePlans.map((plan) => this.toBreakdownPlan(plan)),
			rubric: quest.kind === "breakdown" ? [...quest.rubric] : [...quest.integrationRubric],
			firstPlan: questProgress.submittedPlan,
			revisedPlan: revision.revisedPlan,
			revisionNote: revision.revisionNote,
		});

		await this.progress.saveRevision(revision.questId, revision.revisedPlan, revision.revisionNote);

		if (quest.kind === "boss") return { grade, outcome: this.progress.unchangedOutcome(revision.questId, grade.score) };

		const everyPieceCovered = grade.requiredPiecesCovered.every((piece) => piece.covered);
		const passed = this.passRules.isBreakdownPass(grade.score, everyPieceCovered);
		const { quests } = await this.view();
		const outcome = await this.progress.recordAttempt({ quest: rule, score: grade.score, passed, compiled: true, isSubmit: false }, quests);

		return { grade, outcome };
	}

	/** Today's daily quest, offering open concept quests and short builds. */
	async getDailyQuest(): Promise<DailyQuestState>
	{
		const { quests } = await this.view();
		const availability = await this.progress.getQuestAvailability(quests);

		return this.progress.getDailyQuest(this.dailyQuest.candidatesFrom(quests, availability));
	}

	/** Starts a due drill, a world's test-out, or the Parsons fallback of a quest. */
	async startDrill(request: DrillRequest): Promise<DrillSession>
	{
		const variants = await this.composeSession(request);
		const scheduledDue = new Set(this.progress.getScheduledDueItemIds());
		const rewarded = request.kind !== "parsons-fallback" && variants.some((variant) => scheduledDue.has(variant.itemId));

		return structuredClone(this.sessions.open(request, variants, rewarded).session);
	}

	/** Grades one drill answer and reschedules its item. An explain item self-checked without an AI grader is not scheduled (A318). */
	async answerDrillItem(answer: DrillAnswer): Promise<DrillItemResult>
	{
		const stored = this.sessions.get(answer.sessionId);
		if (!stored) throw new AppErrorException("invalid-payload", "That drill has already ended.", "Start a new drill from the Studio.");

		const variant = stored.variants.get(answer.itemId);
		if (!variant) throw new AppErrorException("invalid-payload", "That item is not part of this drill.", "Answer the items shown in the drill.");
		if (stored.answers.has(answer.itemId)) throw new AppErrorException("invalid-payload", "That item is already answered.", "Go on to the next item.");

		const grade = this.itemGrader.gradeItem(variant.item, answer.response);
		const context = variant.skillId === undefined ? (variant.worldId === undefined ? {} : { earnedInWorldId: variant.worldId }) : { skillId: variant.skillId, ...(variant.worldId === undefined ? {} : { earnedInWorldId: variant.worldId }) };

		if (grade.kind === "graded")
		{
			const result = await this.progress.reviewItem(variant.itemId, this.quality.qualityFromAnswer(grade.correct), context);
			stored.answers.set(answer.itemId, grade.correct);

			return { ...result, modelAnswer: grade.modelAnswer };
		}

		const explainGrade = await this.gradeExplainAnswer(grade.question.prompt, grade.question.modelAnswer, grade.question.rubric, grade.answer);
		const correct = explainGrade.verdict === "correct";
		stored.answers.set(answer.itemId, correct);

		if (explainGrade.provider === TESTS_ONLY_PROVIDER)
		{
			const dueAt = this.progress.getProgress().schedule[variant.itemId] ?? new Date().toISOString();
			stored.selfChecked.add(answer.itemId);

			return { itemId: variant.itemId, correct, selfChecked: true, quality: 0, explainGrade, modelAnswer: grade.question.modelAnswer, nextDueAt: dueAt };
		}

		const result = await this.progress.reviewItem(variant.itemId, this.quality.qualityFromScore(explainGrade.score, correct), context);

		return { ...result, explainGrade, modelAnswer: grade.question.modelAnswer };
	}

	/** Ends a session. A finished due or test-out drill that held a scheduled due item pays drill XP and keeps the streak (A320); a practice drill, an unfinished drill, and the Parsons fallback pay nothing (A319). A finished test-out drill still tests the world out. */
	async finishDrill(sessionId: string): Promise<DrillOutcome>
	{
		const stored = this.sessions.get(sessionId);
		if (!stored) throw new AppErrorException("invalid-payload", "That drill has already ended.", "Start a new drill from the Studio.");

		// Self-checked explain items are neither right nor wrong (A801): they leave both counts and are reported on their own.
		const graded = [...stored.answers.entries()].filter(([itemId]) => !stored.selfChecked.has(itemId));
		const totals = {
			correctCount: graded.filter(([, correct]) => correct).length,
			totalCount: stored.session.items.length - stored.selfChecked.size,
			selfCheckedCount: stored.selfChecked.size,
		};
		const request = stored.session.request;
		const complete = stored.answers.size === stored.session.items.length;

		this.sessions.close(sessionId);

		if (!complete || request.kind === "parsons-fallback") return this.progress.unrewardedDrillOutcome(totals);

		if (request.kind !== "test-out") return this.progress.finishDrill(totals, { rewarded: stored.rewarded });

		const { quests } = await this.view();

		const worldKey = worldKeyOf(request.packId, request.worldId);

		return this.progress.finishDrill(totals, { rewarded: stored.rewarded, testOut: { worldKey, termIds: testOutTermsOf(quests, request.packId, request.worldId) } });
	}

	/** Adds `revealedHints` (texts in reveal order) to a build or refactor quest; other kinds are returned as they are. */
	private async withRevealedHints(quest: LearnerQuest): Promise<LearnerQuest>
	{
		if (quest.kind !== "build" && quest.kind !== "refactor") return quest;

		const authored = await this.content.getAuthoredQuest(quest.id);
		const hints: string[] = authored && (authored.kind === "build" || authored.kind === "refactor") ? [...authored.hints] : [];
		const revealedIndexes = this.progress.getRevealedHintIndexes(quest.id);

		return { ...quest, revealedHints: revealedIndexes.map((index) => hints[index]).filter((text): text is string => text !== undefined) };
	}

	/** Picks the session's variants for each kind of request. */
	private async composeSession(request: DrillRequest): Promise<DrillVariant[]>
	{
		const { quests, bank } = await this.view();

		if (request.kind === "parsons-fallback")
		{
			const { authored } = await this.openQuest(request.questId);
			const attempts = this.progress.getProgress().quests[request.questId];
			const blocks = authored.kind === "build" || authored.kind === "refactor" ? authored.parsons ?? [] : [];
			const variant = blocks.map((block) => bank.variantsOf(parsonsItemId(authored.id, block.id))[0]).find((found) => found !== undefined);

			if (!variant) throw new AppErrorException("invalid-payload", "This quest has no reorder exercise.", "Try a hint spell instead.");
			if (attempts?.status === "passed" || (attempts?.attempts ?? 0) < FAILED_SUBMITS_BEFORE_OFFERS) throw new AppErrorException("quest-locked", "The reorder exercise opens after two failed submits.", "Submit again, or reveal a hint spell first.");

			return [variant];
		}

		if (request.kind === "test-out")
		{
			const worldKey = worldKeyOf(request.packId, request.worldId);
			const status = (await this.getTestOutStatus())[worldKey];
			if (!status) throw new AppErrorException("world-not-found", "That world does not exist.", "Open the World Map again.", worldKey);
			if (!status.eligible) throw new AppErrorException("quest-locked", `This world's test-out is not open yet. ${status.reason ?? ""}`.trim(), "Drill its terms until each is Proficient.");

			// Taught terms plus only the patterns whose card is unlocked, so a test-out never names a pattern before it is built (A64, A322).
			const cards = this.progress.getProgress().patternCards;
			const patterns = quests.filter((quest) => quest.packId === request.packId && quest.worldId === request.worldId).flatMap((quest) => quest.patterns).filter((pattern) => cards[pattern] !== undefined);
			const keys = [...new Set([...testOutTermsOf(quests, request.packId, request.worldId), ...patterns])];
			const variants = this.drillScheduler.compose(keys.flatMap((key) => this.shuffle(bank.variantsOf(key))), [], this.random);

			if (variants.length === 0) throw new AppErrorException("quest-locked", "This world has nothing to test yet.", "Come back once its quests have questions.");

			return variants;
		}

		const dueKeys = this.progress.getDueItemIds();
		// Filler never holds an item due by the end of today: the capped ones are already in `dueKeys`, and the overflow must slide to tomorrow (A321).
		const excluded = new Set([...dueKeys, ...this.progress.getAllScheduledDueTodayIds()]);
		const priority = dueKeys.flatMap((key) => this.shuffle(bank.variantsOf(key)));
		const pool = this.introducedKeys(quests, bank).filter((key) => !excluded.has(key)).flatMap((key) => bank.variantsOf(key));
		const variants = this.drillScheduler.compose(priority, pool, this.random);

		if (variants.length === 0) throw new AppErrorException("quest-locked", "Nothing to drill yet.", "Finish a concept quest first; its terms come back here.");

		return variants;
	}

	/** Keys the learner has met: every reviewed item, plus the terms, patterns, and Parsons blocks of passed quests. Used to fill a drill up to 6 items. */
	private introducedKeys(quests: RuleQuest[], bank: DrillItemBank): string[]
	{
		const progress = this.progress.getProgress();
		const keys = new Set(Object.keys(progress.memory));

		for (const quest of quests)
		{
			if (progress.quests[quest.id]?.status !== "passed") continue;

			quest.terms.forEach((term) => keys.add(term));
			quest.patterns.forEach((pattern) => keys.add(pattern));
			bank.keys().filter((key) => key.startsWith(parsonsItemId(quest.id, ""))).forEach((key) => keys.add(key));
		}

		return [...keys];
	}

	/** Throws `quest-not-found` for an unknown quest and `quest-locked` (with the map's reason) for a locked one; resolves for an open quest. Run and Submit call it first (A802). */
	async assertQuestOpen(questId: string): Promise<void>
	{
		await this.openQuest(questId);
	}

	/** The quest's rule facts and authored content, after checking it exists and is not locked. */
	private async openQuest(questId: string): Promise<{ rule: RuleQuest; authored: AuthoredQuest }>
	{
		const { quests } = await this.view();
		const rule = quests.find((quest) => quest.id === questId);
		const authored = await this.content.getAuthoredQuest(questId);

		if (!rule || !authored) throw new AppErrorException("quest-not-found", "That quest could not be found.", "Open it again from the World Map.", questId);

		const availability = (await this.progress.getQuestAvailability(quests))[questId];
		if (availability?.status === "locked") throw new AppErrorException("quest-locked", availability.lockedReason ?? "That quest is still locked.", "Finish what it needs first, shown on the World Map.");

		return { rule, authored };
	}

	/** The quest as a breakdown or boss, or an invalid-payload error for any other kind. */
	private asBreakdownQuest(quest: AuthoredQuest): BreakdownQuest | BossQuest
	{
		if (quest.kind !== "breakdown" && quest.kind !== "boss") throw new AppErrorException("invalid-payload", "That quest has no breakdown board.", "Open the quest again from the World Map.");

		return quest;
	}

	/** Index of the reference plan sharing the most piece labels with the learner's plan; ties go to the first. */
	private closestReferencePlan(plan: BreakdownPlan, referencePlans: ReferencePlan[]): number
	{
		const learnerLabels = new Set(plan.pieces.map((piece) => piece.label.trim().toLowerCase()));
		let bestIndex = 0;
		let bestShared = -1;

		referencePlans.forEach((reference, index) =>
		{
			const shared = reference.pieces.filter((piece) => learnerLabels.has(piece.label.trim().toLowerCase())).length;

			if (shared > bestShared)
			{
				bestShared = shared;
				bestIndex = index;
			}
		});

		return bestIndex;
	}

	/** A content reference plan in the board's shape: pieces get their label as purpose, edge labels map to edge kinds. */
	private toBreakdownPlan(plan: ReferencePlan): BreakdownPlan
	{
		return {
			pieces: plan.pieces.map((piece) => ({ id: piece.id, kind: piece.kind, label: piece.label, purpose: piece.label })),
			edges: plan.edges.map((edge) =>
			{
				const label = edge.label.toLowerCase();
				const kind = EDGE_KIND_WORDS.find(([word]) => label.includes(word))?.[1] ?? "then";

				return { from: edge.from, to: edge.to, kind };
			}),
		};
	}

	/** Grades one explain sentence. */
	private gradeExplainAnswer(prompt: string, modelAnswer: string, rubric: string[], answer: string): Promise<ExplainGrade>
	{
		return this.graders.gradeExplain({ prompt, modelAnswer, rubric: [...rubric], answer });
	}

	/** One quest per world (the first in map order), to visit every world of every pack once. */
	private firstQuestOfEachWorld(quests: RuleQuest[]): RuleQuest[]
	{
		const seen = new Set<string>();

		return quests.filter((quest) =>
		{
			const worldKey = worldKeyOf(quest.packId, quest.worldId);
			if (seen.has(worldKey)) return false;
			seen.add(worldKey);

			return true;
		});
	}

	/** The quest facts and drill bank for the current content load, built once per load. */
	private async view(): Promise<ContentView>
	{
		const packs = await this.content.listPacks();

		if (this.cachedView?.packs !== packs)
		{
			const view = this.buildView(packs);
			this.cachedView = { packs, view };
			view.catch(() =>
			{
				if (this.cachedView?.view === view) this.cachedView = null;
			});
		}

		return this.cachedView.view;
	}

	/** Loads every full world and the pattern cards and builds the view. */
	private async buildView(packs: PackOutline[]): Promise<ContentView>
	{
		const worlds = await Promise.all(worldIdsOf(packs).map((worldId) => this.content.getWorld(worldId)));
		const patternCards = await this.content.getPatternCards();

		const quests = toRuleQuests(packs);

		await this.progress.qualifyLegacyTestOuts(this.worldKeysById(quests));

		return { quests, bank: new DrillItemBank(worlds, patternCards) };
	}

	/** Every loaded world's key by bare world id, for qualifying test-outs saved before world keys. */
	private worldKeysById(quests: RuleQuest[]): Map<string, string[]>
	{
		const keysById = new Map<string, string[]>();

		for (const quest of this.firstQuestOfEachWorld(quests))
		{
			keysById.set(quest.worldId, [...(keysById.get(quest.worldId) ?? []), worldKeyOf(quest.packId, quest.worldId)]);
		}

		return keysById;
	}

	/** A shuffled copy, so each drill asks a due item a different way. */
	private shuffle<Item>(items: Item[]): Item[]
	{
		const shuffled = [...items];

		for (let index = shuffled.length - 1; index > 0; index--)
		{
			const swapIndex = Math.floor(this.random.next() * (index + 1));
			const held = shuffled[index] as Item;
			shuffled[index] = shuffled[swapIndex] as Item;
			shuffled[swapIndex] = held;
		}

		return shuffled;
	}
}
