// After enough failed submits: the Seer Stone offer (view the reference solution) and the Parsons fallback (rebuild a piece from shuffled lines).
import { EyeIcon, ListOrderedIcon } from "lucide-react";

import { useNavigate } from "@/app/router/useRoute";
import { Button } from "@/components/ui/button";

/** Props for FailedSubmitOffers. */
interface FailedSubmitOffersProps
{
	readonly questId: string;
	readonly failedSubmits: number;
	readonly seerStones: number;
	readonly hasParsons: boolean;

	/** True once the solution was viewed: seeing it again is free (A1391). */
	readonly solutionViewed: boolean;
	readonly onViewSolution: () => void;
}

/** Both offers, side by side. Viewing the solution opens the Seer Stone choice, or the solution itself when it was viewed before (A1392). */
export function FailedSubmitOffers({ questId, failedSubmits, seerStones, hasParsons, solutionViewed, onViewSolution }: FailedSubmitOffersProps)
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
			<Button variant="outline" size="sm" className="h-auto min-h-8 min-w-0 shrink self-start py-1.5 text-left whitespace-normal" onClick={onViewSolution} data-testid="seer-stone-offer">
				<EyeIcon />
				{solutionViewed ? "Show the solution again (free)" : `View the solution (${seerStones} Seer ${seerStones === 1 ? "Stone" : "Stones"} held)`}
			</Button>
		</div>
	);
}
