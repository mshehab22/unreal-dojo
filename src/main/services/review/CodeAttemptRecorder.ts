// Scores a build or refactor Submit with the pass rules and records it through ProgressService.
import type { PackOutline } from "@shared/types/catalog";
import type { AttemptOutcome } from "@shared/types/progress";

import { AppErrorException } from "../../errors/AppErrorException";
import { PassRules } from "../progress/PassRules";
import type { AttemptInput } from "../progress/ProgressService";
import type { RuleQuest } from "../progress/RuleQuest";
import { toRuleQuests } from "../progress/toRuleQuests";
import type { CodeAttemptSubmission } from "./QuestSubmitService";

/** What the recorder needs: the pack outlines (for the rule quests) and ProgressService's `recordAttempt`. */
export interface CodeAttemptRecorderSources
{
	/** Every pack as an outline, in order. */
	listPacks: () => Promise<PackOutline[]>;

	/** `ProgressService.recordAttempt`. */
	recordAttempt: (input: AttemptInput, allQuests: RuleQuest[]) => Promise<AttemptOutcome>;
}

/** Applies the spec's code score (0.6 tests plus 0.4 review) and pass rule, then records the attempt as a Submit. */
export class CodeAttemptRecorder
{
	/** The pass rules from progress-and-rules. */
	private readonly passRules = new PassRules();

	/** Keeps the sources. */
	constructor(private readonly sources: CodeAttemptRecorderSources)
	{
	}

	/** Scores and records one Submit with its review and files. A tests-only review counts as no review score, so the score is the tests alone (review = tests, A462). */
	async record(submission: CodeAttemptSubmission): Promise<AttemptOutcome>
	{
		const quests = toRuleQuests(await this.sources.listPacks());
		const quest = quests.find((candidate) => candidate.id === submission.questId);
		if (!quest) throw new AppErrorException("quest-not-found", "That quest is not in the content.", "Go back to the World Map and open it again.", submission.questId);

		const { run, review } = submission;
		const reviewScore = review && review.provider !== "tests-only" ? review.score : null;
		const result = { compiled: run.compiled, testsPassed: run.testsPassed, testsTotal: run.testsTotal, reviewScore };

		// The review, the files, and the run are stored on the attempt record for the follow-ups and Retry review (A466, A467, A740).
		return this.sources.recordAttempt({ quest, score: this.passRules.codeScore(result), passed: this.passRules.isCodePass(result), compiled: run.compiled, isSubmit: true, review, files: submission.files, run }, quests);
	}
}
