// Display names of the review providers.
import type { ReviewProviderId } from "@shared/types/review";

/** The name shown for each review provider. */
const LABELS: Readonly<Record<ReviewProviderId, string>> = {
	"claude-code": "Claude Code",
	"anthropic-api": "Anthropic API",
	"tests-only": "Tests only",
};

/** The display name of a review provider. */
export function reviewProviderLabel(id: ReviewProviderId): string
{
	return LABELS[id];
}
