// A quest as a card: kind, title, difficulty, XP, time, and state, with an optional action below.
import type { ReactNode } from "react";

import type { QuestOutline } from "@shared/types/catalog";
import type { QuestAvailability } from "@shared/types/progress";

import { cn } from "@/lib/utils";

import { DifficultyPips } from "./DifficultyPips";
import { QUEST_KIND_DISPLAY } from "./questKindIcons";
import { QuestStatusBadge } from "./QuestStatusBadge";

/** Props for QuestCard. */
interface QuestCardProps
{
	readonly quest: QuestOutline;
	readonly availability?: QuestAvailability;
	readonly context?: string;
	readonly action?: ReactNode;
	readonly className?: string;
}

/** One quest summarized for lists such as the Studio's continue slot and daily offers. */
export function QuestCard({ quest, availability, context, action, className }: QuestCardProps)
{
	const kind = QUEST_KIND_DISPLAY[quest.kind];
	const KindIcon = kind.icon;
	const isLocked = availability?.status === "locked";

	return (
		<article data-testid="quest-card" className={cn("flex flex-col gap-3 rounded-lg border border-line bg-raised/60 p-4", isLocked && "opacity-70", className)}>
			<div className="flex items-center justify-between gap-3">
				<span className="flex items-center gap-2 font-mono text-2xs tracking-widest text-pack uppercase">
					<KindIcon className="size-3.5" strokeWidth={2} />
					{kind.label}
				</span>
				{availability && <QuestStatusBadge availability={availability} />}
			</div>
			<div className="flex flex-col gap-1">
				<h3 className="font-display text-lg leading-snug font-semibold">{quest.title}</h3>
				{context && <p className="text-xs text-paper-faint">{context}</p>}
			</div>
			<div className="flex items-center gap-4 text-xs text-paper-muted">
				<DifficultyPips difficulty={quest.difficulty} />
				<span className="tabular-nums">{quest.xp} XP</span>
				<span className="tabular-nums">about {quest.estimatedMinutes} min</span>
			</div>
			{isLocked && availability?.lockedReason && <p className="text-xs text-paper-faint">{availability.lockedReason}</p>}
			{action}
		</article>
	);
}
