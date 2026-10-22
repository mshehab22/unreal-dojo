// Groups due times that read the same ("tomorrow", "in 3 days") so a list says "3 reviews tomorrow" instead of repeating the word.
import { formatDue } from "./formatting";

/** Due times as words with counts, in time order: "3 reviews tomorrow, 1 review in 5 days". */
export function describeDueGroups(dueTimes: readonly string[], now: Date = new Date()): string
{
	const counts = new Map<string, number>();

	for (const dueAt of [...dueTimes].sort()) counts.set(formatDue(dueAt, now), (counts.get(formatDue(dueAt, now)) ?? 0) + 1);

	return [...counts.entries()].map(([when, count]) => `${count} ${count === 1 ? "review" : "reviews"} ${when}`).join(", ");
}
