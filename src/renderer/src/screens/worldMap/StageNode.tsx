// One quest on a world's path: a node shaped by its state (locked, open, in progress, passed, rematch glowing), larger for a boss, with a tooltip.
import { CheckIcon, LockIcon } from "lucide-react";

import type { AuthoredQuest } from "@shared/types/content";
import type { QuestAvailability } from "@shared/types/progress";

import { QUEST_KIND_DISPLAY } from "@/components/questKindIcons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Props for StageNode. */
interface StageNodeProps
{
	readonly quest: AuthoredQuest;
	readonly availability: QuestAvailability | undefined;
}

/** The words for a stage's state in its tooltip. */
function stateLine(availability: QuestAvailability | undefined): string
{
	if (!availability) return "State unknown";
	if (availability.dueForRematch) return "Due for a rematch: half XP, and it locks the idea in";
	if (availability.status === "locked") return availability.lockedReason ?? "Locked";
	if (availability.status === "passed") return "Passed";
	if (availability.status === "in_progress") return "In progress";

	return "Open";
}

/** A node with its short label underneath. Hover or focus shows the title, kind, XP, and state (or why it is locked). */
export function StageNode({ quest, availability }: StageNodeProps)
{
	const status = availability?.status ?? "locked";
	const isBoss = quest.kind === "boss";
	const isRematch = availability?.dueForRematch === true;
	const Icon = QUEST_KIND_DISPLAY[quest.kind].icon;

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					data-testid="stage-node"
					data-status={status}
					data-rematch={isRematch}
					data-kind={quest.kind}
					aria-label={`${quest.title}: ${stateLine(availability)}`}
					className="group relative z-10 flex w-20 shrink-0 flex-col items-center gap-2 text-center outline-none"
				>
					<span
						className={cn(
							"flex items-center justify-center rounded-pill border-2 transition-colors duration-(--duration-fast)",
							isBoss ? "size-14" : "size-10",
							status === "passed" && "border-pack bg-pack text-pack-deep",
							status === "in_progress" && "border-pack bg-pack-soft text-pack",
							status === "available" && "border-pack bg-surface text-pack group-hover:bg-pack-soft",
							status === "locked" && "border-line-strong border-dashed bg-surface text-paper-faint",
							isRematch && "shadow-glow",
							"group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-ink",
						)}
					>
						{status === "locked" ? (
							<LockIcon className="size-4" strokeWidth={2} />
						) : status === "passed" && !isBoss ? (
							<CheckIcon className="size-4" strokeWidth={3} />
						) : (
							<Icon className={isBoss ? "size-6" : "size-4"} strokeWidth={2} />
						)}
					</span>
					<span className={cn("line-clamp-2 text-2xs leading-tight", status === "locked" ? "text-paper-faint" : "text-paper-muted group-hover:text-paper")}>{quest.title.replace(/^Boss: /, "")}</span>
				</button>
			</TooltipTrigger>
			<TooltipContent className="max-w-64">
				<div className="flex flex-col gap-1">
					<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">
						{QUEST_KIND_DISPLAY[quest.kind].label}, {quest.xp} XP, about {quest.estimatedMinutes} min
					</span>
					<span className="font-medium">{quest.title}</span>
					<span className="text-paper-muted">{stateLine(availability)}</span>
				</div>
			</TooltipContent>
		</Tooltip>
	);
}
