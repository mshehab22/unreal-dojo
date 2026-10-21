// The daily quest chest: freeze, armor, Seer Stone, studio cosmetic, or XP potion, never something the learner cannot hold.
import type { ChestReward, PlayerProgress } from "@shared/types/progress";

import type { RandomSource } from "./RandomSource";
import { MAX_ARMOR, MAX_FREEZES, MAX_SEER_STONES, STUDIO_COSMETICS } from "./rules";

/** Chest rules. Pure: randomness comes in as an argument. */
export class ChestRules
{
	/** Rewards the learner can still hold: a capped item at its cap is left out; the potion is always possible. */
	possibleRewards(progress: PlayerProgress): ChestReward[]
	{
		const rewards: ChestReward[] = [];

		if (progress.streak.freezes < MAX_FREEZES) rewards.push("freeze");
		if (progress.spree.armor < MAX_ARMOR) rewards.push("armor");
		if (progress.seerStones < MAX_SEER_STONES) rewards.push("seer-stone");
		if (this.nextCosmetic(progress) !== null) rewards.push("studio-cosmetic");
		rewards.push("xp-potion");

		return rewards;
	}

	/** Rolls one reward with equal odds among the possible ones. */
	roll(progress: PlayerProgress, random: RandomSource): ChestReward
	{
		const rewards = this.possibleRewards(progress);

		return rewards[Math.floor(random.next() * rewards.length)] ?? "xp-potion";
	}

	/** The next studio cosmetic not yet owned, or null when all are owned. */
	nextCosmetic(progress: PlayerProgress): string | null
	{
		return STUDIO_COSMETICS.find((cosmetic) => !progress.studio.cosmetics.includes(cosmetic)) ?? null;
	}
}
