// The icon and label for each quest kind, shared by quest cards and map stages.
import { BookOpenIcon, CrownIcon, HammerIcon, NetworkIcon, RepeatIcon, WandSparklesIcon, type LucideIcon } from "lucide-react";

import type { QuestKind } from "@shared/types/content";

/** Icon and display label of every quest kind. */
export const QUEST_KIND_DISPLAY: Readonly<Record<QuestKind, { icon: LucideIcon; label: string }>> = {
	concept: { icon: BookOpenIcon, label: "Concept" },
	drill: { icon: RepeatIcon, label: "Drill" },
	breakdown: { icon: NetworkIcon, label: "Breakdown" },
	build: { icon: HammerIcon, label: "Build" },
	refactor: { icon: WandSparklesIcon, label: "Refactor" },
	boss: { icon: CrownIcon, label: "Boss" },
};
