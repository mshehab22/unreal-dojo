// Checks curriculum coverage: each glossary term in a concept and a build quest, each pattern in three build quests.
import type { ContentProblem } from "../../../src/shared/types/content";
import type { ContentCheck } from "../ContentCheck";
import { errorAt, listIds, packQuests, warningAt } from "./checkHelpers";

/** Build quests each pattern card needs across all packs. */
const BUILD_QUESTS_PER_PATTERN = 3;

/**
 * Reports ids missing coverage: one summary warning per rule while the curriculum is incomplete, or one error per
 * id with `--release` (A205).
 */
function report(file: string, missing: readonly string[], total: number, rule: string, sectionPrefix: string, release: boolean): ContentProblem[]
{
	if (missing.length === 0) return [];
	if (release) return missing.map((id) => errorAt(file, rule, `${sectionPrefix} ${id}`));

	return [warningAt(file, `${missing.length} of ${total} ${rule}: ${listIds(missing)} (warning until release; --release lists each as an error)`)];
}

/** Glossary term coverage by concept and build quests, and pattern use counts by build quests. Format examples do not count. */
export const coverageCheck: ContentCheck = {
	name: "coverage",
	run(input)
	{
		const quests = packQuests(input).map((record) => record.quest);
		const conceptTerms = new Set(quests.filter((quest) => quest.kind === "concept").flatMap((quest) => quest.terms));
		const buildTerms = new Set(quests.filter((quest) => quest.kind === "build").flatMap((quest) => quest.terms));
		const glossaryIds = input.content.glossary.map((entry) => entry.id);
		const patternBuildCounts = new Map<string, number>();

		for (const quest of quests)
		{
			if (quest.kind === "build") for (const pattern of quest.patterns) patternBuildCounts.set(pattern, (patternBuildCounts.get(pattern) ?? 0) + 1);
		}

		const thinPatterns = input.content.patterns.map((card) => card.id).filter((id) => (patternBuildCounts.get(id) ?? 0) < BUILD_QUESTS_PER_PATTERN);

		return [
			...report("glossary.json", glossaryIds.filter((id) => !conceptTerms.has(id)), glossaryIds.length, "glossary terms are not in any concept quest's terms", "entry", input.release),
			...report("glossary.json", glossaryIds.filter((id) => !buildTerms.has(id)), glossaryIds.length, "glossary terms are not in any build quest's terms", "entry", input.release),
			...report("patterns.json", thinPatterns, input.content.patterns.length, `patterns are listed by fewer than ${BUILD_QUESTS_PER_PATTERN} build quests`, "pattern", input.release),
		];
	},
};
