// The fake's quest flows: full quests, runs and submits, concept and breakdown grading, hints, drills, and review follow-ups.
// FakeDojoApi delegates every quest-screen method here, so the contract class stays readable.
import type { LearnerQuest, LearnerWorld, QuestOutline } from "@shared/types/catalog";
import type { PatternCard } from "@shared/types/content";
import type { DrillRequest, DrillSession } from "@shared/types/drill";
import type { AppError } from "@shared/types/errors";
import type {
	AttemptOutcome,
	AttemptRecord,
	BreakdownOutcome,
	BreakdownPlan,
	BreakdownReferenceChoice,
	BreakdownRevision,
	BreakdownSubmission,
	ChestReward,
	ConceptOutcome,
	ConceptSubmission,
	DailyOfferKind,
	DrillAnswer,
	DrillItemResult,
	DrillOutcome,
	HintReveal,
	MasteryLevel,
	PlayerProgress,
	QuestDraft,
	QuestProgress,
	RulesSnapshot,
	SolutionViewing,
	SubmitOutcome,
} from "@shared/types/progress";
import { worldKeyOf } from "@shared/types/progress";
import type { CodeReview, ExplainGrade, FindingExplanationRequest, QuestAlternative, ReflectionAnswerRequest } from "@shared/types/review";
import type { BuildProgressEvent, RunRequest, RunResult, SyntaxCheckRequest, SyntaxCheckResult } from "@shared/types/run";
import type { Settings } from "@shared/types/settings";

import { levelStanding } from "../../lib/levels";

import { drillReward } from "./drillReward";
import { judgeBuild } from "./FakeBuildJudge";
import { FakeDrillSessions } from "./FakeDrillSessions";
import { gradeDrillItem, gradeQuestion } from "./FakeItemGrader";
import { emptyQuestProgress, recordAttempt, recordStreakDay } from "./FakeQuestLedger";
import { gradeBreakdown, gradeSentence, reviewCode } from "./FakeReviews";
import { hintTextsFor, solutionFilesFor, standInQuest, WORLD_ONE, worldOneQuest } from "./fixtures/fakeQuests";
import { QuestRunSimulator } from "./QuestRunSimulator";

/** What the flow reads from and writes to the fake that owns it. */
export interface FakeQuestHost
{
	progress(): PlayerProgress;
	settings(): Settings;
	rules(): RulesSnapshot;
	patternCards(): readonly PatternCard[];
	emit(event: BuildProgressEvent): void;

	/** The map outline of a quest, for stand-ins of invented stages. */
	outline(questId: string): QuestOutline | undefined;

	/** The outlines of every stage in one map world, or undefined for an unknown world. */
	worldOutline(worldId: string): { title: string; summary: string; order: number; quests: QuestOutline[] } | undefined;

	/** Quest ids open now; the flow compares before and after an attempt to report unlocks. */
	openQuestIds(): Set<string>;
}

/** What the fake says when no AI reviewer is set up, in the tests-only provider's words. */
const NO_REVIEWER_NOTE = "An AI reviewer can check this for you once Claude Code or an API key is set up in Settings.";

/** The tests-only provider's note on a reflection it cannot grade (a self-check with no model answer). */
const SELF_CHECK_NOTE = "Self-check: reread your sentence against the question and your code.";

/** What a follow-up's timeout says to do, as the review service words it for follow-ups (A954). */
const FOLLOW_UP_TIMEOUT_ACTION = "Press Ask again to try once more. Your tests still count.";

/** An AppError the fake rejects with. */
function fail(code: AppError["code"], message: string, suggestedAction: string): AppError
{
	return { code, message, suggestedAction };
}

/** An attempt without its kept finding explanations. */
function withoutExplanations(attempt: AttemptRecord): AttemptRecord
{
	const { explanations: _explanations, ...rest } = attempt;

	return rest;
}

/** Mastery one level down, for a missed drill item. */
const LEVEL_BELOW: Readonly<Record<MasteryLevel, MasteryLevel>> = { attempted: "attempted", familiar: "attempted", proficient: "familiar", mastered: "proficient" };

/** An ISO time some days from now. */
function daysAhead(days: number): string
{
	return new Date(Date.now() + days * 86_400_000).toISOString();
}

/** Runs the quest-screen half of the fake contract on the host's state. */
export class FakeQuestFlow
{
	private readonly runs = new Map<string, QuestRunSimulator>();
	private readonly drills = new FakeDrillSessions();
	private readonly shownPlans = new Map<string, { plan: BreakdownPlan; referencePlanIndex: number }>();
	private reviewTimedOut = false;
	private reflectionTimedOut = false;

	/** The run of each recorded Submit, by attempt id, so Retry review can review it again without a new run (A740). */
	private readonly submittedRuns = new Map<string, { quest: LearnerQuest; run: RunResult }>();

	constructor(private readonly host: FakeQuestHost)
	{
	}

	// Content

	/** A full quest: a real World 1 quest, or a stand-in for an invented map stage. Build and refactor quests carry the texts of the hints already revealed (A502). */
	quest(questId: string): LearnerQuest
	{
		const quest = worldOneQuest(questId) ?? this.standIn(questId);

		if (quest.kind !== "build" && quest.kind !== "refactor") return quest;

		const texts = hintTextsFor(questId, this.host.outline(questId));
		const revealed = this.host.progress().quests[questId]?.revealedHints ?? [];

		return { ...quest, revealedHints: revealed.map((index) => texts[index] ?? "") };
	}

	/** A stand-in for an invented map stage, or the error a screen shows. */
	private standIn(questId: string): LearnerQuest
	{
		const outline = this.host.outline(questId);

		if (!outline) throw fail("quest-not-found", `There is no quest called ${questId}.`, "Open it from the World Map.");

		return standInQuest(outline);
	}

	/** A full world: the real World 1, or a map world filled with stand-ins. */
	world(worldId: string): LearnerWorld
	{
		if (worldId === WORLD_ONE.id) return WORLD_ONE;

		const outline = this.host.worldOutline(worldId);

		if (!outline) throw fail("world-not-found", `There is no world called ${worldId}.`, "Open it from the World Map.");

		return { id: worldId, title: outline.title, summary: outline.summary, order: outline.order, quests: outline.quests.map((quest) => this.quest(quest.id)) as LearnerWorld["quests"] };
	}

	// Runs

	/** Simulates a free Run: progress events, then the engine's verdict. Never counts as an attempt. */
	async runQuest(request: RunRequest): Promise<RunResult>
	{
		return this.simulateRun(request, false);
	}

	/** Simulates a Submit: the run, a review when it compiled, and the recorded attempt with its loot. */
	async submitQuest(request: RunRequest): Promise<SubmitOutcome>
	{
		const quest = this.codeQuest(request.questId);
		const run = await this.simulateRun(request, true);

		// A failure outside the learner's code rejects with its error and records nothing, as the real submit does (A1208).
		if (run.unrelatedFailure) throw run.unrelatedFailure;

		const rules = this.host.rules();
		const review = run.compiled ? this.review(quest, run) : undefined;
		const testShare = run.testsTotal === 0 ? 0 : run.testsPassed / run.testsTotal;
		const score = run.compiled ? Math.round(testShare * 60 + (review?.score ?? 0) * 0.4) : 0;
		const passed = run.ok && score >= rules.passScore;
		const outcome = this.record({ quest, score, passed, compiled: run.compiled, movesSpree: true, files: { ...request.files }, run, ...(review ? { review } : {}) }, "build");
		this.submittedRuns.set(outcome.attempt.attemptId, { quest, run });

		return { run, ...(review ? { review } : {}), outcome };
	}

	/** Checks a scratch buffer's brackets, the one thing the fake can tell without a compiler. */
	checkSnippetSyntax(request: SyntaxCheckRequest): SyntaxCheckResult
	{
		let depth = 0;
		const lines = request.code.split("\n");

		for (let index = 0; index < lines.length; index++)
		{
			for (const character of (lines[index] ?? "").replace(/\/\/.*$/, ""))
			{
				depth += character === "{" ? 1 : character === "}" ? -1 : 0;

				if (depth < 0) return { ok: false, diagnostics: [{ line: index + 1, severity: "error", message: "expected declaration before '}' token" }] };
			}
		}

		if (depth > 0) return { ok: false, diagnostics: [{ line: lines.length, severity: "error", message: "expected '}' at end of input" }] };

		const warnings = lines.flatMap((line, index) => (/\bTick\b/.test(line) && /bCanEverTick\s*=\s*true/.test(line) ? [{ line: index + 1, severity: "warning" as const, message: "Tick is enabled; this example never uses it" }] : []));

		return { ok: true, diagnostics: warnings };
	}

	/** Cancels a simulated run. Returns false when the run id is not a quest run. */
	cancel(runId: string): boolean
	{
		const run = this.runs.get(runId);

		run?.cancel();
		this.runs.delete(runId);

		return run !== undefined;
	}

	// Progress

	/** Autosaves files, a board, or self-explanations. */
	saveDraft(draft: QuestDraft): void
	{
		const progress = this.host.progress();
		const saved: QuestProgress = { ...(progress.quests[draft.questId] ?? emptyQuestProgress()) };

		if (draft.files) saved.savedFiles = { ...draft.files };
		if (draft.breakdownPlan) saved.breakdownPlan = structuredClone(draft.breakdownPlan);
		if (draft.selfExplanations) saved.selfExplanations = { ...draft.selfExplanations };

		progress.quests = { ...progress.quests, [draft.questId]: saved };
	}

	/** Clears a quest's saved files, board, and explanations. */
	reset(questId: string): QuestProgress
	{
		const progress = this.host.progress();
		const saved: QuestProgress = { ...(progress.quests[questId] ?? emptyQuestProgress()), savedFiles: {} };

		delete saved.breakdownPlan;
		delete saved.selfExplanations;
		progress.quests = { ...progress.quests, [questId]: saved };

		return saved;
	}

	/** Reveals a hint as the progress service does (A501): an index already revealed is answered again for free; otherwise only the next one in order is revealed and counted. */
	revealHint(questId: string, hintIndex?: number): HintReveal
	{
		const quest = this.codeQuest(questId);
		const progress = this.host.progress();
		const saved: QuestProgress = { ...(progress.quests[questId] ?? emptyQuestProgress()) };
		const texts = hintTextsFor(questId, this.host.outline(questId));
		const xpCost = Math.round(quest.xp * this.host.rules().hintCostShare);

		if (hintIndex !== undefined && saved.revealedHints.includes(hintIndex))
		{
			return { hintIndex, text: texts[hintIndex] ?? "", xpCost, hintsRevealed: saved.hintsRevealed, alreadyRevealed: true };
		}

		const nextIndex = saved.revealedHints.length;

		if (hintIndex !== undefined && hintIndex !== nextIndex) throw fail("invalid-payload", "Hints are revealed in order.", "Reveal the next hint first.");

		const text = texts[nextIndex];

		if (text === undefined) throw fail("invalid-payload", "Every hint for this quest is already revealed.", "Use the ones above, or ask why a test fails.");

		saved.revealedHints = [...saved.revealedHints, nextIndex];
		saved.hintsRevealed = saved.revealedHints.length;
		progress.quests = { ...progress.quests, [questId]: saved };

		return { hintIndex: nextIndex, text, xpCost, hintsRevealed: saved.hintsRevealed, alreadyRevealed: false };
	}

	/**
	 * Views a quest's reference solution by the progress service's rules (A1390, A1391): after the failed-submit count, a stone or the quest's XP pays
	 * for the first view of an unpassed quest and a rematch comes due in the rules' days; a repeat view and a passed quest's view are free.
	 */
	viewSolution(questId: string, useSeerStone: boolean): SolutionViewing
	{
		const quest = this.codeQuest(questId);
		const progress = this.host.progress();
		const rules = this.host.rules();
		const saved: QuestProgress = { ...(progress.quests[questId] ?? emptyQuestProgress()) };
		const passed = saved.status === "passed";
		const files = solutionFilesFor(quest.id, this.host.outline(quest.id));

		if (Object.keys(files).length === 0) throw fail("invalid-payload", "This quest has no reference solution to show.", "Use a hint spell or the Parsons fallback instead.");

		if (saved.solutionViewed || passed)
		{
			return { questId, files, stoneSpent: false, seerStonesAfter: progress.seerStones, xpForfeited: saved.solutionViewed && !saved.seerStoneSpent && !passed, rematchDueAt: null, alreadyViewed: saved.solutionViewed };
		}

		if (saved.attempts < rules.failedSubmitsBeforeOffers) throw fail("quest-locked", "The solution opens after two failed submits.", "Submit again, or reveal a hint spell first.");
		if (useSeerStone && progress.seerStones === 0) throw fail("invalid-payload", "You hold no Seer Stone.", "View it with this quest's XP instead, or earn a stone from a daily chest.");

		const rematchDueAt = daysAhead(rules.rematchAfterDays);

		saved.solutionViewed = true;
		saved.seerStoneSpent = useSeerStone;
		progress.quests = { ...progress.quests, [questId]: saved };
		progress.rematches = { ...progress.rematches, [questId]: rematchDueAt };
		if (useSeerStone) progress.seerStones -= 1;

		return { questId, files, stoneSpent: useSeerStone, seerStonesAfter: progress.seerStones, xpForfeited: !useSeerStone, rematchDueAt, alreadyViewed: false };
	}

	/** Grades a finished concept quest; explain answers that only a self-check could grade are left out of the pass share (A315). */
	submitConcept(submission: ConceptSubmission): ConceptOutcome
	{
		const quest = this.quest(submission.questId);

		if (quest.kind !== "concept") throw fail("invalid-payload", "That quest is not a concept quest.", "Open it from the World Map.");

		const results: DrillItemResult[] = quest.questions.map((question, index) =>
		{
			const grade = gradeQuestion(question, submission.answers[index] ?? null);
			const explainGrade = grade.explainAnswer !== undefined ? this.gradeExplain(grade.explainAnswer, grade.modelAnswer) : undefined;
			const correct = explainGrade ? explainGrade.verdict === "correct" : grade.correct;
			const selfChecked = explainGrade?.provider === "tests-only";

			return { itemId: question.id, correct, quality: correct ? 4 : 2, modelAnswer: grade.modelAnswer, nextDueAt: daysAhead(correct ? 3 : 1), ...(explainGrade ? { explainGrade } : {}), ...(selfChecked ? { selfChecked: true } : {}) };
		});

		// A self-checked explain answer is left out of the pass share, as the progress service does (A315, A801).
		const counted = results.filter((result) => !result.selfChecked);
		const share = counted.filter((result) => result.correct).length / Math.max(1, counted.length);
		const outcome = this.record({ quest, score: Math.round(share * 100), passed: share >= this.host.rules().conceptPassShare, compiled: false, movesSpree: false }, "concept");

		for (const termId of quest.terms) this.host.progress().schedule[termId] = daysAhead(3);

		return { results, outcome };
	}

	/** Keeps the first plan and picks the reference plan sharing the most piece words with it (A316). */
	submitBreakdown(submission: BreakdownSubmission): BreakdownReferenceChoice
	{
		const quest = this.quest(submission.questId);

		if (quest.kind !== "breakdown" && quest.kind !== "boss") throw fail("invalid-payload", "That quest is not a breakdown.", "Open it from the World Map.");

		const learnerWords = new Set(submission.plan.pieces.flatMap((piece) => piece.label.toLowerCase().split(/\W+/)));
		const overlaps = quest.referencePlans.map((plan) => plan.pieces.flatMap((piece) => piece.label.toLowerCase().split(/\W+/)).filter((word) => word.length >= 4 && learnerWords.has(word)).length);
		const best = overlaps.reduce((bestIndex, overlap, index) => (overlap > (overlaps[bestIndex] ?? 0) ? index : bestIndex), 0);

		this.shownPlans.set(quest.id, { plan: structuredClone(submission.plan), referencePlanIndex: best });

		return { referencePlanIndex: best };
	}

	/** Grades the revised plan with its note. A boss breakdown is graded but records no pass (A317). */
	reviseBreakdown(revision: BreakdownRevision): BreakdownOutcome
	{
		const quest = this.quest(revision.questId);
		const shown = this.shownPlans.get(revision.questId);

		if (quest.kind !== "breakdown" && quest.kind !== "boss") throw fail("invalid-payload", "That quest is not a breakdown.", "Open it from the World Map.");
		if (!shown) throw fail("invalid-payload", "Submit the first plan before revising it.", "Press Submit plan first.");

		const grade = gradeBreakdown(quest.requiredPieces, revision.revisedPlan, revision.revisionNote, shown.referencePlanIndex, quest.referencePlans.length);
		const passed = grade.score >= this.host.rules().passScore && grade.requiredPiecesCovered.every((piece) => piece.covered);
		const progress = this.host.progress();
		const saved: QuestProgress = { ...(progress.quests[quest.id] ?? emptyQuestProgress()), breakdownPlan: structuredClone(revision.revisedPlan), revisionNote: revision.revisionNote };

		progress.quests = { ...progress.quests, [quest.id]: saved };

		const outcome = quest.kind === "boss" ? this.unchangedOutcome(quest.id, grade.score) : this.record({ quest, score: grade.score, passed, compiled: false, movesSpree: false }, "concept");

		return { grade, outcome };
	}

	// Drills

	/** Starts a drill session. */
	startDrill(request: DrillRequest): DrillSession
	{
		const session = this.drills.start(request, this.host.patternCards());

		if (session.items.length === 0) throw fail("quest-locked", "Nothing to drill yet.", "Pass a concept quest first.");

		return session;
	}

	/** Grades one drill item and reschedules it; a miss is "due for review", never a loss. */
	answerDrillItem(answer: DrillAnswer): DrillItemResult
	{
		const sessionItem = this.drills.item(answer.sessionId, answer.itemId);

		if (!sessionItem) throw fail("invalid-payload", "That drill item is not in this session.", "Start the drill again.");

		const grade = gradeDrillItem(sessionItem.item, answer.response);
		const explainGrade = grade.explainAnswer !== undefined ? this.gradeExplain(grade.explainAnswer, grade.modelAnswer) : undefined;
		const correct = explainGrade ? explainGrade.verdict === "correct" : grade.correct;
		const progress = this.host.progress();

		// Tests-only cannot judge a sentence: the item is self-checked, neither right nor wrong, and keeps its due time (A801).
		if (explainGrade?.provider === "tests-only")
		{
			this.drills.recordAnswer(answer.sessionId, answer.itemId, false, true);

			return { itemId: answer.itemId, correct: false, selfChecked: true, quality: 0, explainGrade, modelAnswer: grade.modelAnswer, nextDueAt: progress.schedule[answer.itemId] ?? new Date().toISOString() };
		}

		const memory = progress.memory[answer.itemId];
		const nextDueAt = daysAhead(correct ? 3 : 1);
		let masteryChange: DrillItemResult["masteryChange"];

		if (!correct && memory && memory.mastery !== "attempted")
		{
			masteryChange = { skillId: memory.skillId ?? answer.itemId, before: memory.mastery, after: LEVEL_BELOW[memory.mastery] };
			progress.memory = { ...progress.memory, [answer.itemId]: { ...memory, mastery: LEVEL_BELOW[memory.mastery] } };
		}

		progress.schedule = { ...progress.schedule, [answer.itemId]: nextDueAt };
		this.drills.recordAnswer(answer.sessionId, answer.itemId, correct);

		return { itemId: answer.itemId, correct, quality: correct ? 4 : 2, modelAnswer: grade.modelAnswer, nextDueAt, ...(explainGrade ? { explainGrade } : {}), ...(masteryChange ? { masteryChange } : {}) };
	}

	/** Ends a session: flat drill XP and the streak for a finished due or test-out drill, nothing for the Parsons fallback (A319). */
	finishDrill(sessionId: string): DrillOutcome
	{
		const finished = this.drills.finish(sessionId);

		if (!finished) throw fail("invalid-payload", "That drill session is not open.", "Start a new drill.");

		const progress = this.host.progress();
		const rules = this.host.rules();
		const { session, correctByItem, selfChecked } = finished;
		const answeredAll = correctByItem.size === session.items.length;

		// Self-checked items leave both counts and are reported on their own (A801).
		const correctCount = [...correctByItem.entries()].filter(([itemId, correct]) => correct && !selfChecked.has(itemId)).length;
		const totalCount = session.items.length - selfChecked.size;

		const { pays, testsOut } = drillReward(session.request.kind, { answeredAll, gradedCount: totalCount, correctCount });
		const chest = pays ? this.finishDailyOffer("drill", undefined) : undefined;
		let milestoneReached: number | undefined;

		if (pays)
		{
			progress.xp += rules.drillXp;

			const streakDay = recordStreakDay(progress.streak, rules);

			progress.streak = streakDay.streak;
			milestoneReached = streakDay.milestoneReached;
		}

		const testedOut = session.request.kind === "test-out" && testsOut ? [worldKeyOf(session.request.packId, session.request.worldId)] : [];
		progress.testedOutWorldIds = [...new Set([...progress.testedOutWorldIds, ...testedOut])];

		const nextDueAt = Object.values(progress.schedule).filter((dueAt) => new Date(dueAt).getTime() > Date.now()).sort()[0] ?? null;

		return { xpGained: pays ? rules.drillXp : 0, streak: { count: progress.streak.count, ...(milestoneReached ? { milestoneReached } : {}) }, correctCount, totalCount, selfCheckedCount: selfChecked.size, nextDueAt, testedOutWorldIds: testedOut, ...(chest ? { chest } : {}) };
	}

	// Review follow-ups

	/** Explains one finding of a recorded review in plain English. */
	explainFinding(request: FindingExplanationRequest): string
	{
		const progress = this.host.progress();
		const attempt = progress.attempts.find((candidate) => candidate.attemptId === request.attemptId);
		const finding = attempt?.review?.findings[request.findingIndex];

		if (!attempt || !finding) throw fail("attempt-not-found", "That finding is not in this review.", "Open the review again and pick a finding from the list.");

		// Kept on the attempt like the real one (A851); the fake keys by index and title, the real one by index and a hash of the finding.
		const key = `${request.findingIndex}:${finding.title}`;
		const kept = attempt.explanations?.[key];
		if (kept !== undefined) return kept;

		// With Tests only, no AI can explain: the finding's detail and why, answered but never kept, so a later ask reaches a reviewer (A855).
		if (this.host.settings().reviewProvider === "tests-only") return `${finding.detail} ${NO_REVIEWER_NOTE}`;

		const explanation = `${finding.title}: ${finding.detail} Reviewers flag this because the next person to read the class, often you in a month, should not have to rebuild the reasoning from the code alone.`;
		progress.attempts = progress.attempts.map((candidate) => (candidate.attemptId === attempt.attemptId ? { ...candidate, explanations: { ...candidate.explanations, [key]: explanation } } : candidate));

		return explanation;
	}

	/** Grades the learner's sentence answering a review's reflection question, against the quest's concepts, and keeps it on the attempt; the same sentence again answers the kept grade (A852). */
	answerReflection(request: ReflectionAnswerRequest): ExplainGrade
	{
		const progress = this.host.progress();
		const attempt = progress.attempts.find((candidate) => candidate.attemptId === request.attemptId);
		const answer = request.answer.trim();

		if (!attempt?.review) throw fail("attempt-not-found", "That attempt has no code review.", "Only build and refactor submits have a review to ask about.");
		if (answer.length === 0) throw fail("invalid-payload", "Write one sentence to answer the question.", "Type your answer, then send it.");
		if (attempt.reflection?.answer === answer && attempt.reflection.grade.provider !== "tests-only") return attempt.reflection.grade;

		// With Tests only, nothing can grade the sentence: a self-check with the reason, never kept (A855).
		if (this.host.settings().reviewProvider === "tests-only") return { score: 70, verdict: "partly", note: SELF_CHECK_NOTE, provider: "tests-only" };

		// With Claude Code chosen, the first reflection times out like the first review, so the self-check offers Ask again (A300, A954).
		if (this.host.settings().reviewProvider === "claude-code" && !this.reflectionTimedOut)
		{
			this.reflectionTimedOut = true;

			return { score: 70, verdict: "partly", note: SELF_CHECK_NOTE, provider: "tests-only", fallbackReason: `Claude Code did not answer within 3 minutes. ${FOLLOW_UP_TIMEOUT_ACTION}`, retryReviewSuggested: true };
		}

		const grade = gradeSentence(answer, this.quest(attempt.questId).concepts.join(" "));
		const reflection = { answer, grade, at: new Date().toISOString() };

		// Like the real one, only an AI grade is kept, so a self-check never blocks a later real grade (A855).
		if (grade.provider !== "tests-only") progress.attempts = progress.attempts.map((candidate) => (candidate.attemptId === attempt.attemptId ? { ...candidate, reflection } : candidate));

		return grade;
	}

	/** A passed quest's alternative and the AI reviewer's hint, like the real one (A850): null for a kind without one, alternative-locked before a pass. */
	getQuestAlternative(questId: string): QuestAlternative | null
	{
		const quest = this.quest(questId);
		const markdown = quest.kind === "build" || quest.kind === "refactor" ? quest.alternative : quest.kind === "breakdown" ? quest.alternativeNote : null;

		if (!markdown || markdown.trim().length === 0) return null;

		const progress = this.host.progress();
		if (progress.quests[questId]?.status !== "passed") throw fail("alternative-locked", "The alternative opens after you pass this quest.", "Pass the quest, then look again: it shows an idiomatic version with its tradeoff.");

		const reviewHint = [...progress.attempts].reverse().find((attempt) => attempt.questId === questId && attempt.passed && attempt.review && attempt.review.provider !== "tests-only" && attempt.review.alternativeHint.trim().length > 0)?.review?.alternativeHint.trim();

		return reviewHint ? { questId, markdown, reviewHint } : { questId, markdown };
	}

	/** Reviews a recorded Submit again from its stored run and replaces the attempt's review; score, pass, and XP stay (A741). */
	retryReview(attemptId: string): CodeReview
	{
		const submitted = this.submittedRuns.get(attemptId);
		const progress = this.host.progress();
		const attempt = progress.attempts.find((candidate) => candidate.attemptId === attemptId);

		if (!submitted || !attempt || !submitted.run.compiled) throw fail("attempt-not-found", "This attempt's code is no longer stored, so it cannot be reviewed again.", "Submit the quest again to get a fresh review.");

		const review = this.review(submitted.quest, submitted.run);

		// The kept explanations explained the old findings, so they go with the old review (A851).
		progress.attempts = progress.attempts.map((candidate) => (candidate.attemptId === attemptId ? { ...withoutExplanations(candidate), review } : candidate));

		return review;
	}

	// Helpers

	/** The explain grader as the review service answers it: with Tests only chosen, a self-check against the model answer (the tests-only provider's wording). */
	private gradeExplain(answer: string, modelAnswer: string): ExplainGrade
	{
		if (this.host.settings().reviewProvider === "tests-only") return { score: 70, verdict: "partly", note: `Self-check against the model answer: ${modelAnswer}`, provider: "tests-only" };

		return gradeSentence(answer, modelAnswer);
	}

	/** A build or refactor quest by id, or the error a screen shows. */
	private codeQuest(questId: string): Extract<LearnerQuest, { kind: "build" | "refactor" }>
	{
		const quest = this.quest(questId);

		if (quest.kind !== "build" && quest.kind !== "refactor") throw fail("invalid-payload", "Only build and refactor quests can be run.", "Open a build quest.");

		return quest;
	}

	/** Plays the run's progress and answers the verdict. */
	private async simulateRun(request: RunRequest, includesReview: boolean): Promise<RunResult>
	{
		const quest = this.codeQuest(request.questId);
		const verdict = judgeBuild(quest, request.files);
		const simulator = new QuestRunSimulator(request.runId, (event) => this.host.emit(event));

		this.runs.set(request.runId, simulator);

		try
		{
			const durationMs = await simulator.run(quest.id, includesReview, verdict.compiled);
			const testsPassed = verdict.tests.filter((test) => test.passed).length;

			return { ok: verdict.compiled && testsPassed === verdict.tests.length && verdict.tests.length > 0, compiled: verdict.compiled, compilerOutput: verdict.compilerOutput, tests: verdict.tests, testsPassed, testsTotal: verdict.tests.length, durationMs, loop: "headless", ...(verdict.unrelatedFailure ? { unrelatedFailure: verdict.unrelatedFailure } : {}) };
		}
		finally
		{
			this.runs.delete(request.runId);
		}
	}

	/** The review of a compiled run. With Claude Code chosen, the first review times out and falls back to tests-only with Retry review (A300). */
	private review(quest: LearnerQuest, run: RunResult): ReturnType<typeof reviewCode>
	{
		if (this.host.settings().reviewProvider === "claude-code" && !this.reviewTimedOut)
		{
			this.reviewTimedOut = true;

			return { ...reviewCode(quest, run, "tests-only", "Claude Code did not answer within 3 minutes. Press Retry review to ask again."), score: Math.round((run.testsPassed / Math.max(1, run.testsTotal)) * 100) };
		}

		// With Tests only chosen, the review is graded by the tests alone and says why, as the review service does (no retry suggested: nothing timed out).
		if (this.host.settings().reviewProvider === "tests-only") return { ...reviewCode(quest, run, "tests-only"), score: Math.round((run.testsPassed / Math.max(1, run.testsTotal)) * 100) };

		return reviewCode(quest, run, "claude-code");
	}

	/** Records an attempt and fills in the quests it unlocked and any daily chest. */
	private record(attempt: Parameters<typeof recordAttempt>[2], dailyKind: DailyOfferKind): AttemptOutcome
	{
		const openBefore = this.host.openQuestIds();
		const chest = attempt.passed ? this.finishDailyOffer(dailyKind, attempt.quest.id) : undefined;
		const outcome = recordAttempt(this.host.progress(), this.host.rules(), attempt, chest);
		const openAfter = this.host.openQuestIds();

		outcome.unlockedQuestIds = [...openAfter].filter((questId) => !openBefore.has(questId));

		return outcome;
	}

	/** Completes today's chosen daily offer when this activity matches it, and returns its chest. */
	private finishDailyOffer(kind: DailyOfferKind, questId: string | undefined): ChestReward | undefined
	{
		const progress = this.host.progress();
		const daily = progress.daily;
		const chosen = daily.chosen === undefined ? undefined : daily.offered[daily.chosen];

		if (!chosen || daily.done) return undefined;
		if (chosen.kind !== kind && !(kind === "build" && chosen.kind === "build")) return undefined;
		if (chosen.questId && chosen.questId !== questId) return undefined;

		// The fake's chest always holds a Seer Stone while one fits, else an XP potion, so the e2e flows know what opens.
		const rules = this.host.rules();
		const chest: ChestReward = progress.seerStones < rules.maxSeerStones ? "seer-stone" : "xp-potion";

		progress.daily = { ...daily, done: true, completedDates: [...daily.completedDates, daily.date], chest };
		if (chest === "seer-stone") progress.seerStones += 1;
		else progress.xpPotionUntil = new Date(Date.now() + rules.xpPotion.minutes * 60_000).toISOString();

		return chest;
	}

	/** Loot that changes nothing, for a boss breakdown grade (A317). */
	private unchangedOutcome(questId: string, score: number): AttemptOutcome
	{
		const progress = this.host.progress();
		const level = levelStanding(progress.xp, this.host.rules()).level;

		return {
			attempt: { attemptId: `fake-boss-plan-${questId}`, questId, at: new Date().toISOString(), score, passed: false, xpGained: 0 },
			xp: { base: 0, difficultyMultiplier: 1, firstPass: 0, spreeBonus: 0, hintCost: 0, effort: 0, potionBonus: 0, total: 0 },
			level: { before: level, after: level },
			role: { before: progress.role, after: progress.role },
			cardChanges: [],
			skillChanges: [],
			spree: { current: progress.spree.current, best: progress.spree.best, armorUsed: false },
			streak: { count: progress.streak.count },
			unlockedQuestIds: [],
			nextDueDates: [],
		};
	}
}
