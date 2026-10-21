// Picks who reviews: the learner's choice from Settings, or in `auto` the first available of Claude Code, API key, tests only (D11).
import type { ReviewProviderStatus } from "@shared/types/review";

import type { IReviewProvider } from "./providers/IReviewProvider";
import type { TestsOnlyProvider } from "./providers/TestsOnlyProvider";
import type { IReviewSettings } from "./settings/IReviewSettings";

/** The pick: an AI provider, or tests only with the reason no AI provider was used. */
export type ProviderSelection = { kind: "ai"; provider: IReviewProvider } | { kind: "tests-only"; provider: TestsOnlyProvider; reason?: string };

/** Chooses a provider per review, reading settings each time. */
export class ProviderSelector
{
	/** Keeps the settings and the providers, in D11's order for `auto`. */
	constructor(private readonly settings: IReviewSettings, private readonly aiProvidersInOrder: readonly IReviewProvider[], private readonly testsOnly: TestsOnlyProvider)
	{
	}

	/** Picks the provider for the next review. A chosen provider that is not available falls back to tests only, with its reason. */
	async select(): Promise<ProviderSelection>
	{
		const choice = this.settings.providerChoice();
		if (choice === "tests-only") return { kind: "tests-only", provider: this.testsOnly };

		const candidates = choice === "auto" ? this.aiProvidersInOrder : this.aiProvidersInOrder.filter((provider) => provider.id === choice);
		const reasons: string[] = [];

		for (const provider of candidates)
		{
			const status = await provider.status();
			if (status.available) return { kind: "ai", provider };
			if (status.reason) reasons.push(status.reason);
		}

		return { kind: "tests-only", provider: this.testsOnly, reason: reasons.length > 0 ? reasons.join(" ") : undefined };
	}

	/** Every provider's status, AI providers first, for the Settings screen. `refresh` checks again instead of using cached answers. */
	async statuses(refresh = false): Promise<ReviewProviderStatus[]>
	{
		const aiStatuses = await Promise.all(this.aiProvidersInOrder.map((provider) => provider.status(refresh)));

		return [...aiStatuses, await this.testsOnly.status()];
	}
}
