// The compact title line every quest screen opens with: kind and numbers, the title, and a way back to the map.
import { ArrowLeftIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { LearnerQuest } from "@shared/types/catalog";

import { useNavigate } from "@/app/router/useRoute";
import { DifficultyPips } from "@/components/DifficultyPips";
import { QUEST_KIND_DISPLAY } from "@/components/questKindIcons";
import { Button } from "@/components/ui/button";

/** Props for QuestTitleRow. */
interface QuestTitleRowProps
{
	readonly quest: LearnerQuest;
	readonly actions?: ReactNode;

	/** Extra words after the kind, such as the scaffold level. */
	readonly detail?: string;
}

/**
 * Back button, eyebrow, the title as the page's h1, and optional actions on the right. The row does not wrap (only the eyebrow inside it can): the title truncates instead, so the save
 * status changing from "Saved" to "Unsaved changes" cannot make the row taller and move the buttons under it mid-click (A1264).
 */
export function QuestTitleRow({ quest, actions, detail }: QuestTitleRowProps)
{
	const navigate = useNavigate();
	const Icon = QUEST_KIND_DISPLAY[quest.kind].icon;

	return (
		<header className="flex items-center justify-between gap-x-6">
			<div className="flex min-w-0 items-center gap-3">
				<Button variant="ghost" size="icon" aria-label="Back to the World Map" onClick={() => navigate("worldMap")}>
					<ArrowLeftIcon />
				</Button>
				<div className="flex min-w-0 flex-col gap-1">
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-2xs tracking-widest text-paper-faint uppercase">
						<span className="flex items-center gap-1.5 text-pack">
							<Icon className="size-3.5" />
							{QUEST_KIND_DISPLAY[quest.kind].label}
							{detail ? `, ${detail}` : ""}
						</span>
						<DifficultyPips difficulty={quest.difficulty} />
						<span>{quest.xp} XP</span>
						<span>About {quest.estimatedMinutes} min</span>
					</div>
					<h1 className="truncate text-2xl font-bold tracking-tight">{quest.title}</h1>
				</div>
			</div>
			{actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
		</header>
	);
}
