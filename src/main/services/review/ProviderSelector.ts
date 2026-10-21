// Picks who reviews: the learner's choice from Settings, or in `auto` the first available of Claude Code, API key, tests only (D11).
import type { ReviewProviderId, ReviewProviderStatus } from "@shared/types/review";

import type { IReviewProvider } from "./providers/IReviewProvider";
import type { TestsOnlyProvider } from "./providers/TestsOnlyProvider";
import type { IReviewSettings } from "./settings/IReviewSettings";

/** How long a provider that failed a review stays skipped before it is tried again (A154). */
export const UNAVAILABLE_MARK_MS = 10 * 60 * 1000;

/** The pick: an AI provider, or tests only with the reason no AI provider was used. */
export type ProviderSelection = { kind: "ai"; provider: IReviewProvider } | { kind: "tests-only"; provider: TestsOnlyProvider; reason?: string };

/** A provider marked unavailable after it failed, with when and why. */
interface UnavailableMark
{
	/** Plain-English reason, shown in Settings and on a tests-only review. */
	reason: string;

	/** When the mark was made, in `now()` milliseconds. */
	markedAt: number;
}

/** Chooses a provider per review, reading settings each time and skipping providers that just failed. */
export class ProviderSelector
{
	/** Providers that failed a review recently, by id. */
	private readonly marks = new Map<ReviewProviderId, UnavailableMark>();

	/** Keeps the settings, the providers in D11's order for `auto`, and a clock tests can replace. */
	constructor(private readonly settings: IReviewSettings, private readonly aiProvidersInOrder: readonly IReviewProvider[], private readonly testsOnly: TestsOnlyProvider, private readonly now: () => number = Date.now)
	{
	}

	/** Picks the provider for the next review. A chosen provider that is unavailable or marked falls back to tests only, with its reason. */
	async select(): Promise<ProviderSelection>
	{
		const choice = this.settings.providerChoice();
		if (choice === "tests-only") return { kind: "tests-only", provider: this.testsOnly };

		const candidates = choice === "auto" ? this.aiProvidersInOrder : this.aiProvidersInOrder.filter((provider) => provider.id === choice);
		const reasons: string[] = [];

		for (const provider of candidates)
		{
			const status = await this.statusOf(provider, false);
			if (status.available) return { kind: "ai", provider };
			if (status.reason) reasons.push(status.reason);
		}

		return { kind: "tests-only", provider: this.testsOnly, reason: reasons.length > 0 ? reasons.join(" ") : undefined };
	}

	/** Skips a provider for a while after it could not review, so the next submit goes to the next provider instead of failing again. */
	markUnavailable(id: ReviewProviderId, reason: string): void
	{
		this.marks.set(id, { reason, markedAt: this.now() });
	}

	/** Clears a mark, for example after the Settings test proved the provider works. */
	clearMark(id: ReviewProviderId): void
	{
		this.marks.delete(id);
	}

	/** Every provider's status, AI providers first, for the Settings screen. Marked providers show as unavailable with their reason. */
	async statuses(refresh = false): Promise<ReviewProviderStatus[]>
	{
		const aiStatuses = await Promise.all(this.aiProvidersInOrder.map((provider) => this.statusOf(provider, refresh)));

		return [...aiStatuses, await this.testsOnly.status()];
	}

	/** One provider's status, overridden by a mark that has not expired. */
	private async statusOf(provider: IReviewProvider, refresh: boolean): Promise<ReviewProviderStatus>
	{
		const status = await provider.status(refresh);
		const mark = this.marks.get(provider.id);
		if (!mark) return status;

		if (this.now() - mark.markedAt >= UNAVAILABLE_MARK_MS)
		{
			this.marks.delete(provider.id);

			return status;
		}

		return { ...status, available: false, reason: mark.reason };
	}
}
