// Says when the next reviews come without repeating a day: "due now, tomorrow and in 5 days". The list holds only the soonest few times, so it never claims a count (A811).
import { formatDue } from "./formatting";

/** How one due time reads here: anything already due (past or within the half hour) is "due now", later times as formatDue says them. */
function whenDue(dueAt: string, now: Date): string
{
	return new Date(dueAt).getTime() - now.getTime() < 30 * 60_000 ? "due now" : formatDue(dueAt, now);
}

/** The distinct ways the times read, in time order, joined as a sentence ("due now, tomorrow and in 5 days"). */
export function describeDueGroups(dueTimes: readonly string[], now: Date = new Date()): string
{
	const words = [...new Set([...dueTimes].sort().map((dueAt) => whenDue(dueAt, now)))];

	if (words.length <= 1) return words[0] ?? "";

	return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}
