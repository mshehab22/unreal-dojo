// The alternative after a pass, from `getQuestAlternative` (A850): the authored idiomatic version with its tradeoff, and the reviewer's own pointer when an AI reviewer wrote one.
import { AppErrorView } from "@/components/AppErrorView";
import { LoadingBlock } from "@/components/LoadingBlock";
import { Panel } from "@/components/Panel";
import { PatternChips } from "@/components/quests/PatternChips";
import { TermText } from "@/components/TermText";
import { alternativeKey } from "@/data/queryKeys";
import { useDojoQuery } from "@/data/useDojoQuery";

/** Props for AlternativePanel. */
interface AlternativePanelProps
{
	readonly questId: string;
	readonly patternIds: readonly string[];
}

/** Shown only after a pass. Loading shows the panel's placeholder; a quest kind with no alternative, or a locked one, shows nothing; any other error shows with a retry. */
export function AlternativePanel({ questId, patternIds }: AlternativePanelProps)
{
	const alternative = useDojoQuery(alternativeKey(questId), (client) => client.getQuestAlternative(questId));

	if (alternative.data === null) return null;
	if (alternative.error?.code === "alternative-locked" && alternative.data === undefined) return null;

	return (
		<Panel title="An alternative" testId="loot-alternative">
			{alternative.data === undefined && alternative.error && <AppErrorView error={alternative.error} onRetry={alternative.reload} />}
			{alternative.data === undefined && !alternative.error && <LoadingBlock height="h-32" />}
			{alternative.data && (
				<>
					<PatternChips patternIds={patternIds} />
					<TermText markdown={alternative.data.markdown} />
					{alternative.data.reviewHint && (
						<p data-testid="alternative-review-hint" className="border-l-2 border-pack pl-3 text-sm text-paper-muted">
							<span className="font-medium text-paper">Your reviewer suggests: </span>
							{alternative.data.reviewHint}
						</p>
					)}
				</>
			)}
		</Panel>
	);
}
