// Readable names for skill ids, skill prefixes, and mastery levels, so the skill tree never shows raw ids.
import type { MasteryLevel } from "@shared/types/progress";

import { humanizeId } from "./formatting";

/** Short words and Unreal macros that read better in capitals. */
const UPPERCASE_WORDS = new Set(["gc", "ui", "ai", "gas", "uclass", "ufunction", "uproperty", "ustruct", "uenum"]);

/** Turns one id part into words, keeping short acronyms in capitals: "soft-refs" to "Soft refs", "gc" to "GC". */
function partToWords(part: string): string
{
	return part
		.split(/[-_]/)
		.map((word, index) => (UPPERCASE_WORDS.has(word) ? word.toUpperCase() : index === 0 ? humanizeId(word) : word))
		.join(" ");
}

/** The heading of a skill branch: "ue.objects" reads "Objects", "breakdown" reads "Breakdown". */
export function skillGroupName(prefix: string): string
{
	const parts = prefix.split(".").filter((part) => part !== "ue");

	return parts.map(partToWords).join(" ") || partToWords(prefix);
}

/** The label of one skill inside its branch: "soft-refs" reads "Soft refs". */
export function skillLabel(labelPart: string): string
{
	return partToWords(labelPart);
}

/** The display name of each mastery level. */
export const MASTERY_NAMES: Readonly<Record<MasteryLevel, string>> = {
	attempted: "Attempted",
	familiar: "Familiar",
	proficient: "Proficient",
	mastered: "Mastered",
};
