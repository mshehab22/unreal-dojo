// One quest on a world's path: a node shaped by its state, larger for a boss, with a tooltip.
// Open is an outline, in progress a thick ring with a center dot, passed a solid fill with a check, a due rematch a warm ring that glows.
import { CheckIcon, LockIcon, RotateCcwIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { QuestOutline } from "@shared/types/catalog";
import type { QuestAvailability } from "@shared/types/progress";

import { useNavigate } from "@/app/router/useRoute";
import { QUEST_KIND_DISPLAY } from "@/components/questKindIcons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { withoutBossPrefix } from "@/lib/formatting";
import { cn } from "@/lib/utils";

/** Props for StageNode. */
interface StageNodeProps
{
	readonly quest: QuestOutline;
	readonly availability: QuestAvailability | undefined;
	readonly rematchShare: number;
}

/** The words for a stage's state in its tooltip. The rematch share comes from the rules through IPC. */
function stateLine(availability: QuestAvailability | undefined, rematchShare: number): string
{
	if (!availability) return "State unknown";
	if (availability.dueForRematch) return `Due for a rematch: ${Math.round(rematchShare * 100)}% of the XP, and it locks the idea in`;
	if (availability.status === "locked") return availability.lockedReason ?? "Locked";
	if (availability.status === "passed") return "Passed";
	if (availability.status === "in_progress") return "In progress";

	return "Open";
}

/** The node's ring and fill for each state. */
function nodeClass(status: QuestAvailability["status"], isRematch: boolean): string
{
	if (isRematch) return "border-warn bg-warn/15 text-warn shadow-[0_0_0_1px_var(--color-warn),0_0_24px_-2px_var(--color-warn)]";

	switch (status)
	{
		case "passed":
			return "border-pack bg-pack text-pack-deep";
		case "in_progress":
			return "border-4 border-pack bg-surface text-pack";
		case "available":
			return "border-pack bg-surface text-pack group-hover:bg-pack-soft";
		case "locked":
			return "border-dashed border-line-strong bg-surface text-paper-faint";
	}
}

/** A node with its short label underneath. Hover or focus shows the title, kind, XP, and state (or why it is locked); a click opens an unlocked quest. */
export function StageNode({ quest, availability, rematchShare }: StageNodeProps)
{
	const navigate = useNavigate();
	const status = availability?.status ?? "locked";
	const isBoss = quest.kind === "boss";
	const isRematch = availability?.dueForRematch === true;
	const Icon = QUEST_KIND_DISPLAY[quest.kind].icon;

	/** The icon inside the node. */
	const glyph = (): ReactNode =>
	{
		if (isRematch) return <RotateCcwIcon className="size-4" strokeWidth={2.5} />;
		if (status === "locked") return <LockIcon className="size-4" strokeWidth={2} />;
		if (status === "passed" && !isBoss) return <CheckIcon className="size-4" strokeWidth={3} />;
		if (status === "in_progress" && !isBoss) return <span className="size-2.5 rounded-pill bg-pack" />;

		return <Icon className={isBoss ? "size-6" : "size-4"} strokeWidth={2} />;
	};

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					data-testid="stage-node"
					data-status={status}
					data-rematch={isRematch}
					data-kind={quest.kind}
					aria-label={`${quest.title}: ${stateLine(availability, rematchShare)}`}
					aria-disabled={status === "locked"}
					onClick={() => status !== "locked" && navigate("quest", { id: quest.id })}
					className="group relative z-10 flex w-20 shrink-0 flex-col items-center gap-2 text-center outline-none"
				>
					<span
						className={cn(
							"flex items-center justify-center rounded-pill border-2 transition-colors duration-(--duration-fast)",
							isBoss ? "size-14" : "size-10",
							nodeClass(status, isRematch),
							"group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-ink",
						)}
					>
						{glyph()}
					</span>
					<span className={cn("line-clamp-2 text-2xs leading-tight", status === "locked" ? "text-paper-faint" : isRematch ? "text-warn" : "text-paper-muted group-hover:text-paper")}>{withoutBossPrefix(quest.title)}</span>
				</button>
			</TooltipTrigger>
			<TooltipContent className="max-w-64">
				<div className="flex flex-col gap-1">
					<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">
						{QUEST_KIND_DISPLAY[quest.kind].label}, {quest.xp} XP, about {quest.estimatedMinutes} min
					</span>
					<span className="font-medium">{quest.title}</span>
					<span className="text-paper-muted">{stateLine(availability, rematchShare)}</span>
				</div>
			</TooltipContent>
		</Tooltip>
	);
}
