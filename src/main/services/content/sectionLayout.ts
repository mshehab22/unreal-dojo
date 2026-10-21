// The fixed level-1 section order for each quest kind, and the check that a file follows it.
import type { AuthoredQuestKind } from "@shared/types/content";

import type { ProblemList } from "./ProblemList";
import type { MarkdownSection } from "./splitQuestFile";

/** One section a quest kind expects, in order. */
export interface SectionRule
{
	title: string;
	optional: boolean;
}

/** Shorthand for a required section. */
function required(title: string): SectionRule
{
	return { title, optional: false };
}

/** Shorthand for an optional section. */
function optional(title: string): SectionRule
{
	return { title, optional: true };
}

/** The sections of build and refactor quests, which share one layout. */
const CODE_QUEST_SECTIONS: readonly SectionRule[] = [
	required("Brief"),
	required("Files"),
	required("Tests"),
	required("Hints"),
	required("Rubric"),
	required("Alternative"),
	optional("Parsons"),
];

/** Section order per kind. `docs/systems/content-engine.md` documents the same table; keep both in step. */
export const SECTION_LAYOUT: Readonly<Record<AuthoredQuestKind, readonly SectionRule[]>> = {
	concept: [required("Predict"), required("Card"), required("Example"), required("Questions")],
	breakdown: [required("Spec"), required("Required Pieces"), required("Reference Plans"), required("Rubric"), required("Alternative Note")],
	build: CODE_QUEST_SECTIONS,
	refactor: CODE_QUEST_SECTIONS,
	boss: [required("Spec"), required("Required Pieces"), required("Reference Plans"), required("Integration Rubric")],
};

/**
 * Checks that the sections are exactly the kind's sections in the fixed order, reporting unknown, repeated,
 * out-of-order, and missing ones by name. Returns the sections found, keyed by title.
 */
export function checkSectionLayout(kind: AuthoredQuestKind, sections: readonly MarkdownSection[], problems: ProblemList): Map<string, MarkdownSection>
{
	const rules = SECTION_LAYOUT[kind];
	const expectedOrder = rules.map((rule) => rule.title).join(", ");
	const found = new Map<string, MarkdownSection>();
	let lastIndex = -1;

	for (const section of sections)
	{
		const ruleIndex = rules.findIndex((rule) => rule.title === section.title);
		const location = { section: section.title, line: section.line };

		if (ruleIndex < 0)
		{
			problems.add(`unknown section "# ${section.title}" for a ${kind} quest (expected, in order: ${expectedOrder})`, location);
			continue;
		}

		if (found.has(section.title))
		{
			problems.add(`section "# ${section.title}" appears twice`, location);
			continue;
		}

		if (ruleIndex < lastIndex) problems.add(`section "# ${section.title}" is out of order (expected, in order: ${expectedOrder})`, location);

		lastIndex = Math.max(lastIndex, ruleIndex);
		found.set(section.title, section);
	}

	for (const rule of rules)
	{
		if (!rule.optional && !found.has(rule.title)) problems.add(`missing section "# ${rule.title}"`, { section: rule.title });
	}

	return found;
}
