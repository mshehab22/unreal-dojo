// What the review service reads from settings. Read on every call, so a change in Settings applies without a restart.
import type { ReviewProviderSetting } from "@shared/types/settings";

/** The review settings and the learner's API key. */
export interface IReviewSettings
{
	/** The provider the learner picked, or `auto`. */
	providerChoice(): ReviewProviderSetting;

	/** Model id for the Anthropic API provider. */
	modelId(): string;

	/** True when an API key is stored. Cheap; does not decrypt. */
	hasApiKey(): boolean;

	/** Decrypts and answers the stored API key, or null when none is stored. The key never leaves the main process. */
	readApiKey(): Promise<string | null>;
}
