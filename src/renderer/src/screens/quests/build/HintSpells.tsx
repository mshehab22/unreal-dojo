// Hint spells: how many are left, what the next one costs in XP on a pass, and every hint revealed so far.
import { SparklesIcon } from "lucide-react";

import type { HintReveal } from "@shared/types/progress";

import { Button } from "@/components/ui/button";

/** Props for HintSpells. */
interface HintSpellsProps
{
	readonly hintCount: number;
	readonly hintsRevealed: number;
	readonly revealed: readonly HintReveal[];

	/** XP the next hint costs on a pass, from the quest's XP and the rules' hint share. */
	readonly nextCost: number;
	readonly onReveal: () => void;
	readonly isRevealing: boolean;
}

/** The spell slots and the revealed texts. Hints never contain code. */
export function HintSpells({ hintCount, hintsRevealed, revealed, nextCost, onReveal, isRevealing }: HintSpellsProps)
{
	const remaining = Math.max(0, hintCount - hintsRevealed);
	const lostTexts = hintsRevealed - revealed.length;

	return (
		<div data-testid="hint-spells" className="flex flex-col gap-2">
			<div className="flex items-center justify-between gap-2">
				<span className="flex items-center gap-1.5 text-sm text-paper">
					<SparklesIcon className="size-4 text-patterns" />
					Hint spells
				</span>
				<span className="flex gap-1" aria-label={`${remaining} of ${hintCount} left`}>
					{Array.from({ length: hintCount }, (_value, index) => (
						<span key={index} className={index < hintsRevealed ? "size-2 rounded-pill border border-line-strong" : "size-2 rounded-pill bg-patterns"} />
					))}
				</span>
			</div>
			{revealed.map((hint) => (
				<p key={hint.hintIndex} data-testid="hint-text" className="rounded-md border border-patterns/40 bg-patterns-soft px-3 py-2 text-sm text-paper">
					<span className="mr-1.5 font-mono text-2xs text-patterns">{hint.hintIndex + 1}</span>
					{hint.text}
				</p>
			))}
			{lostTexts > 0 && <p className="text-xs text-paper-faint">{lostTexts === 1 ? "One hint was" : `${lostTexts} hints were`} revealed in an earlier session.</p>}
			{remaining > 0 ? (
				<Button variant="outline" size="sm" className="self-start" onClick={onReveal} disabled={isRevealing} data-testid="reveal-hint">
					{isRevealing ? "Casting" : `Reveal hint ${hintsRevealed + 1} (costs ${nextCost} XP on a pass)`}
				</Button>
			) : (
				<p className="text-xs text-paper-faint">No hints left. "Why?" on a review finding is always free.</p>
			)}
		</div>
	);
}
