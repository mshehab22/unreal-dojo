// Small text formatters for times, durations, and ids shown on screens.

/** Elapsed milliseconds as m:ss, or h:mm:ss past an hour. */
export function formatElapsed(milliseconds: number): string
{
	const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = String(totalSeconds % 60).padStart(2, "0");

	return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

/** A due time relative to now: "now", "in 3 hours", "tomorrow", "in 5 days", or "3 days ago". */
export function formatDue(isoTime: string, now: Date = new Date()): string
{
	const difference = new Date(isoTime).getTime() - now.getTime();
	const hours = Math.round(difference / 3_600_000);
	const days = Math.round(difference / 86_400_000);

	if (Math.abs(difference) < 30 * 60_000) return "now";
	if (difference < 0) return days <= -1 ? `${-days} day${days === -1 ? "" : "s"} ago` : `${-hours} hour${hours === -1 ? "" : "s"} ago`;
	if (hours < 20) return `in ${Math.max(1, hours)} hour${hours <= 1 ? "" : "s"}`;
	if (days <= 1) return "tomorrow";

	return `in ${days} days`;
}

/** A calendar date like "Oct 3". */
export function formatShortDate(isoTime: string): string
{
	return new Date(isoTime).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Turns an id such as "night-market-lighting" into "Night market lighting". */
export function humanizeId(id: string): string
{
	const words = id.replace(/[-_.]+/g, " ").trim();

	return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A month stored as YYYY-MM, written out, for example "September 2026". */
export function formatMonth(yearMonth: string): string
{
	const [year, month] = yearMonth.split("-").map(Number);

	if (!year || !month) return yearMonth;

	return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
