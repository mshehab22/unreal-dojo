// Checks breakdown and boss plans: at least two reference plans, each covering every required piece, and labels tests-only grading can match.
import type { ContentProblem } from "../../../src/shared/types/content";
import type { ContentCheck } from "../ContentCheck";
import { errorAt } from "./checkHelpers";
import { labelCore } from "./labelCore";

/** Reference plans every breakdown and boss needs, so the grader accepts more than one valid split (author rule 13). */
const MINIMUM_PLANS = 2;

/** Shortest label core tests-only grading can match against (A302: kind words and one-letter prefixes removed). */
const MINIMUM_LABEL_CORE = 4;

/** Plan count, per-plan coverage of the required pieces, and a matchable core in every required piece label. */
export const planCoverageCheck: ContentCheck = {
	name: "plan coverage",
	run(input)
	{
		const problems: ContentProblem[] = [];

		for (const { quest, file } of input.quests)
		{
			if (quest.kind !== "breakdown" && quest.kind !== "boss") continue;

			for (const piece of quest.requiredPieces)
			{
				const core = labelCore(piece.label);

				if (core.length < MINIMUM_LABEL_CORE)
				{
					problems.push(errorAt(file, `required piece "${piece.id}": label "${piece.label}" leaves "${core}" after kind words are removed; tests-only grading needs at least ${MINIMUM_LABEL_CORE} characters (A302)`, "Required Pieces"));
				}
			}

			if (quest.referencePlans.length < MINIMUM_PLANS) problems.push(errorAt(file, `expected at least ${MINIMUM_PLANS} reference plans, found ${quest.referencePlans.length}`, "Reference Plans"));

			for (const plan of quest.referencePlans)
			{
				const covered = new Set(plan.pieces.flatMap((piece) => piece.covers));
				const missing = quest.requiredPieces.map((piece) => piece.id).filter((id) => !covered.has(id));

				if (missing.length > 0) problems.push(errorAt(file, `plan "${plan.id}" does not cover required pieces: ${missing.join(", ")}`, "Reference Plans"));
			}
		}

		return problems;
	},
};
