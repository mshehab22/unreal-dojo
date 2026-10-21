// The short label each drill item shows above its prompt, so the learner knows what kind of recall is asked.
import type { DrillItem } from "@shared/types/content";

/** "Parsons reorder", "Pattern discrimination", "Explain in one sentence", "Pattern recall", or "Recall". */
export function drillItemLabel(item: DrillItem): string
{
	if (item.source === "parsons") return "Parsons reorder";
	if (item.question.type === "explain-in-one-sentence") return "Explain in one sentence";
	if (item.source === "pattern-scenario" || item.question.type === "which-pattern") return "Pattern discrimination";
	if (item.source === "pattern-recall") return "Pattern recall";

	return "Recall";
}
