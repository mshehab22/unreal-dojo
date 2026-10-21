// The most recent graded attempts: when, which quest, score, pass or not, and XP.
import type { AttemptRecord } from "@shared/types/progress";

import { Panel } from "@/components/Panel";
import { Badge } from "@/components/ui/badge";
import { formatShortDate } from "@/lib/formatting";
import type { QuestLocation } from "@/lib/questIndex";

/** Props for AttemptHistory. */
interface AttemptHistoryProps
{
	readonly attempts: readonly AttemptRecord[];
	readonly quests: ReadonlyMap<string, QuestLocation>;
}

/** How many attempts the table shows. */
const SHOWN = 8;

/** A table of the latest attempts, newest first. */
export function AttemptHistory({ attempts, quests }: AttemptHistoryProps)
{
	const recent = [...attempts].sort((first, second) => second.at.localeCompare(first.at)).slice(0, SHOWN);

	return (
		<Panel title="Attempt history" testId="character-attempts" className="col-span-12">
			{recent.length === 0 ? (
				<p className="text-sm text-paper-faint">Graded attempts show up here.</p>
			) : (
				<table className="w-full text-sm">
					<thead>
						<tr className="text-left font-mono text-2xs tracking-widest text-paper-faint uppercase">
							<th className="pb-2 font-normal">When</th>
							<th className="pb-2 font-normal">Quest</th>
							<th className="pb-2 text-right font-normal">Score</th>
							<th className="pb-2 pl-4 font-normal">Result</th>
							<th className="pb-2 text-right font-normal">XP</th>
						</tr>
					</thead>
					<tbody>
						{recent.map((attempt) =>
						{
							const location = quests.get(attempt.questId);

							return (
								<tr key={attempt.attemptId} className="border-t border-line">
									<td className="py-2 font-mono text-xs text-paper-faint">{formatShortDate(attempt.at)}</td>
									<td className="py-2">
										<span className="text-paper">{location?.quest.title ?? attempt.questId}</span>
										{location && <span className="text-paper-faint"> in {location.world.title}</span>}
									</td>
									<td className="py-2 text-right tabular-nums">{attempt.score}</td>
									<td className="py-2 pl-4">{attempt.passed ? <Badge variant="pass">Passed</Badge> : <Badge>Not yet</Badge>}</td>
									<td className="py-2 text-right text-paper-muted tabular-nums">+{attempt.xpGained}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			)}
		</Panel>
	);
}
