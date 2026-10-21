// One Codex entry in full: short and long definitions, related terms, where the learner met it, its review schedule, Epic's docs, and "drill me".
import { CheckIcon, ExternalLinkIcon, RepeatIcon } from "lucide-react";
import { useState } from "react";

import type { GlossaryEntry } from "@shared/types/content";
import type { PlayerProgress, QuestAvailability } from "@shared/types/progress";

import { AppErrorView } from "@/components/AppErrorView";
import { QuestStatusBadge } from "@/components/QuestStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoAction } from "@/data/useDojoAction";
import { formatDue } from "@/lib/formatting";
import type { QuestLocation } from "@/lib/questIndex";

/** Props for CodexEntryDetail. */
interface CodexEntryDetailProps
{
	readonly entry: GlossaryEntry;
	readonly entriesById: ReadonlyMap<string, GlossaryEntry>;
	readonly progress: PlayerProgress | undefined;
	readonly availability: Readonly<Record<string, QuestAvailability>> | undefined;
	readonly quests: ReadonlyMap<string, QuestLocation>;
	readonly onSelect: (termId: string) => void;
}

/** The quests that use a term, its first quest first. */
function questsUsing(entry: GlossaryEntry, quests: ReadonlyMap<string, QuestLocation>): QuestLocation[]
{
	const using = [...quests.values()].filter((location) => location.quest.terms.includes(entry.id) || location.quest.id === entry.firstQuestId);

	return using.slice(0, 5);
}

/** The entry panel on the right of the Codex. */
export function CodexEntryDetail({ entry, entriesById, progress, availability, quests, onSelect }: CodexEntryDetailProps)
{
	const [queuedId, setQueuedId] = useState<string | null>(null);
	const queue = useDojoAction((client, termId: string) => client.queueDrillItem(termId), [QUERY_KEYS.progress, QUERY_KEYS.drillSummary]);
	const dueAt = progress?.schedule[entry.id];
	const met = questsUsing(entry, quests);

	/** Adds the term to the next drill. */
	const drillMe = async (): Promise<void> =>
	{
		await queue.run(entry.id);
		setQueuedId(entry.id);
	};

	return (
		<article data-testid="codex-entry" data-term={entry.id} className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-6 shadow-raised">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex flex-col gap-2">
					<Badge>{entry.category}</Badge>
					<h2 className="font-mono text-3xl font-semibold tracking-tight">{entry.term}</h2>
					{entry.aliases.length > 0 && <p className="text-xs text-paper-faint">Also: {entry.aliases.join(", ")}</p>}
				</div>
				<div className="flex items-center gap-2">
					{queuedId === entry.id && !queue.error ? (
						<span data-testid="drill-queued" className="flex items-center gap-1.5 text-sm text-pass">
							<CheckIcon className="size-4" />
							In your next drill
						</span>
					) : (
						<Button variant="secondary" size="sm" onClick={drillMe} disabled={queue.isPending}>
							<RepeatIcon />
							Drill me
						</Button>
					)}
					<Button variant="ghost" size="sm" asChild>
						<a href={entry.unrealDocsUrl} target="_blank" rel="noreferrer">
							Epic docs
							<ExternalLinkIcon />
						</a>
					</Button>
				</div>
			</div>
			{queue.error && <AppErrorView error={queue.error} compact />}
			<p className="text-lg leading-relaxed text-paper">{entry.short}</p>
			<p className="max-w-3xl text-base leading-relaxed text-paper-muted select-text">{entry.long}</p>

			<div className="grid grid-cols-2 gap-6 border-t border-line pt-4">
				<div className="flex flex-col gap-2">
					<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Where you meet it</span>
					{met.length === 0 ? (
						<p className="text-sm text-paper-faint">No quest on the map uses it yet.</p>
					) : (
						<ul className="flex flex-col gap-1.5">
							{met.map((location) => (
								<li key={location.quest.id} className="flex items-center justify-between gap-2 text-sm">
									<span className="min-w-0 truncate text-paper-muted">{location.quest.title}</span>
									<QuestStatusBadge availability={availability?.[location.quest.id]} />
								</li>
							))}
						</ul>
					)}
				</div>
				<div className="flex flex-col gap-2">
					<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Review</span>
					<p className="text-sm text-paper-muted">{dueAt ? `Due ${formatDue(dueAt)}` : "Not scheduled yet. It joins your drills after the quest that teaches it."}</p>
					{progress?.hoverCounts[entry.id] ? <p className="text-xs text-paper-faint">Looked up {progress.hoverCounts[entry.id]} times</p> : null}
				</div>
			</div>

			{entry.related.length > 0 && (
				<div className="flex flex-col gap-2">
					<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Related</span>
					<div className="flex flex-wrap gap-1.5">
						{entry.related.map((relatedId) =>
						{
							const related = entriesById.get(relatedId);

							return related ? (
								<button
									key={relatedId}
									type="button"
									onClick={() => onSelect(relatedId)}
									className="rounded-sm border border-line bg-raised px-2 py-1 font-mono text-xs text-paper-muted transition-colors duration-(--duration-fast) hover:border-pack hover:text-pack"
								>
									{related.term}
								</button>
							) : null;
						})}
					</div>
				</div>
			)}
		</article>
	);
}
