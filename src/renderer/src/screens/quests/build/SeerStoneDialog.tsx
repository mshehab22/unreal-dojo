// The Seer Stone flow (A1392): choose how to pay for the reference solution (a Seer Stone, or this quest's XP), then read it. A repeat view skips the choice.
import { CoinsIcon, GemIcon } from "lucide-react";

import type { AppError } from "@shared/types/errors";
import type { SolutionViewing } from "@shared/types/progress";

import { AppErrorView } from "@/components/AppErrorView";
import { DisabledWithReason } from "@/components/DisabledWithReason";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

import { ReferenceSolutionView } from "./ReferenceSolutionView";

/** Props for SeerStoneDialog. */
interface SeerStoneDialogProps
{
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;

	/** The answer once the solution was viewed; null while the learner is still choosing. */
	readonly viewing: SolutionViewing | null;
	readonly seerStones: number;
	readonly questXp: number;
	readonly rematchAfterDays: number;
	readonly rematchShare: number;
	readonly isPending: boolean;
	readonly error: AppError | undefined;
	readonly onChoose: (useSeerStone: boolean) => void;
}

/** The choice, then the solution. Both choices schedule a rematch; only the stone keeps the quest's XP. */
export function SeerStoneDialog({ open, onOpenChange, viewing, seerStones, questXp, rematchAfterDays, rematchShare, isPending, error, onChoose }: SeerStoneDialogProps)
{
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent data-testid="seer-stone-dialog" {...(viewing ? { "aria-describedby": undefined } : {})} className="top-[6%] max-h-[88vh] max-w-[min(60rem,calc(100%-4rem))] overflow-y-auto">
				<DialogTitle>{viewing ? "Reference solution" : "View the reference solution?"}</DialogTitle>
				{viewing ? (
					<ReferenceSolutionView viewing={viewing} rematchShare={rematchShare} />
				) : (
					<>
						<DialogDescription>
							Reading it now gets you unstuck; a rematch in {rematchAfterDays} days asks you to build it from memory for {Math.round(rematchShare * 100)}% of the XP. Choose how to pay.
						</DialogDescription>
						<div className="grid grid-cols-2 gap-3">
							<div className="flex flex-col gap-2 rounded-lg border border-patterns/50 bg-patterns-soft p-4">
								<span className="flex items-center gap-2 font-medium text-paper">
									<GemIcon className="size-4 text-patterns" />
									Spend a Seer Stone
								</span>
								<span className="text-xs text-paper-muted">
									Keeps this quest's full first-pass XP (base {questXp}). You hold {seerStones} {seerStones === 1 ? "stone" : "stones"}.
								</span>
								{seerStones === 0 ? (
									<DisabledWithReason testId="seer-stone-spend-reason" reason="You hold no Seer Stone. A daily chest can hold one.">
										<Button variant="pack" size="sm" data-testid="seer-stone-spend" disabled>
											<GemIcon />
											Use a stone
										</Button>
									</DisabledWithReason>
								) : (
									<Button variant="pack" size="sm" className="self-start" data-testid="seer-stone-spend" disabled={isPending} onClick={() => onChoose(true)}>
										<GemIcon />
										Use a stone
									</Button>
								)}
							</div>
							<div className="flex flex-col gap-2 rounded-lg border border-line bg-raised/60 p-4">
								<span className="flex items-center gap-2 font-medium text-paper">
									<CoinsIcon className="size-4 text-warn" />
									Pay with this quest's XP
								</span>
								<span className="text-xs text-paper-muted">Nothing leaves your total, but a pass before the rematch pays no XP; the rematch pays {Math.round(rematchShare * 100)}%.</span>
								<Button variant="outline" size="sm" className="self-start" data-testid="seer-stone-pay-xp" disabled={isPending} onClick={() => onChoose(false)}>
									<CoinsIcon />
									Pay with XP
								</Button>
							</div>
						</div>
					</>
				)}
				{error && <AppErrorView error={error} compact />}
			</DialogContent>
		</Dialog>
	);
}
