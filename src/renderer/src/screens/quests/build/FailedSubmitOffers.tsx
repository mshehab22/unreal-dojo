// After enough failed submits: the Seer Stone offer (view the reference solution) and the Parsons fallback (rebuild a piece from shuffled lines).
import { EyeIcon, ListOrderedIcon } from "lucide-react";

import { useNavigate } from "@/app/router/useRoute";
import { DisabledWithReason } from "@/components/DisabledWithReason";
import { Button } from "@/components/ui/button";

/** Props for FailedSubmitOffers. */
interface FailedSubmitOffersProps
{
	readonly questId: string;
	readonly failedSubmits: number;
	readonly seerStones: number;
	readonly hasParsons: boolean;
}

/** Both offers, side by side. Viewing the solution has no contract method yet, so it explains itself instead of acting. */
export function FailedSubmitOffers({ questId, failedSubmits, seerStones, hasParsons }: FailedSubmitOffersProps)
{
	const navigate = useNavigate();

	return (
		<div data-testid="failed-submit-offers" className="flex flex-col gap-2 rounded-md border border-warn/40 bg-warn/5 p-3">
			<p className="text-sm text-paper">{failedSubmits} submits without a pass. Two ways to get unstuck:</p>
			{hasParsons && (
				<Button variant="secondary" size="sm" className="h-auto min-h-8 self-start py-1.5 text-left whitespace-normal" onClick={() => navigate("drill", { kind: "parsons-fallback", quest: questId })} data-testid="parsons-fallback">
					<ListOrderedIcon />
					Rebuild it from shuffled lines
				</Button>
			)}
			<DisabledWithReason testId="seer-stone-offer" reason="Viewing the reference solution arrives with the Seer Stone flow (M3.3). It will cost this quest's XP, or a Seer Stone, and schedule a rematch.">
				<Button variant="outline" size="sm" className="h-auto min-h-8 min-w-0 shrink py-1.5 text-left whitespace-normal" disabled>
					<EyeIcon />
					View the solution ({seerStones} Seer {seerStones === 1 ? "Stone" : "Stones"} held)
				</Button>
			</DisabledWithReason>
		</div>
	);
}
