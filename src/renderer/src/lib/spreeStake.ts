// Pure: what the next Submit of a build or refactor quest means for the Sharpshooter spree, in plain words for the Build screen (A1396).

/** What the stake is read from. Every number comes from the save and the rules through IPC. */
export interface SpreeStakeInput
{
	readonly questPassed: boolean;

	/** Graded Submits on this quest so far. */
	readonly submitsSoFar: number;
	readonly spree: { readonly current: number; readonly armor: number };
	readonly bonusThreshold: number;
	readonly bonusShare: number;
}

/** The stake: whether the next Submit counts, a headline, and a detail line. */
export interface SpreeStake
{
	readonly counts: boolean;
	readonly headline: string;
	readonly detail: string;
}

/** Words for the next Submit's effect on the spree. Run never counts, so it is never mentioned as a risk. */
export function spreeStakeFor(input: SpreeStakeInput): SpreeStake
{
	const { current, armor } = input.spree;

	if (input.questPassed) return { counts: false, headline: `Spree ${current}`, detail: "Passed already, so Submits here leave your spree alone." };
	if (input.submitsSoFar > 0) return { counts: false, headline: `Spree ${current}`, detail: "The first try here is spent; later Submits leave your spree alone." };

	const after = current + 1;
	const bonus = after >= input.bonusThreshold ? ` with the spree bonus (+${Math.round(input.bonusShare * 100)}% XP)` : `; the bonus starts at ${input.bonusThreshold}`;
	const miss = current === 0 ? "" : armor > 0 ? ` A miss is absorbed by armor (${armor} held).` : " A miss resets it to 0; your best stays.";

	return { counts: true, headline: `First try counts: spree ${current} to ${after}`, detail: `A pass on this Submit makes it ${after}${bonus}.${miss}` };
}
