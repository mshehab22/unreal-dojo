// Dates for the fake's fixtures, relative to now so the screens always look current.

const DAY_MS = 24 * 60 * 60 * 1000;

/** An ISO time this many days from now (negative for the past), plus optional hours. */
export function daysFromNow(days: number, hours = 0): string
{
	return new Date(Date.now() + days * DAY_MS + hours * 60 * 60 * 1000).toISOString();
}

/** Today's local calendar day as YYYY-MM-DD, as the daily quest stores it. */
export function todayLocal(): string
{
	const now = new Date();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");

	return `${now.getFullYear()}-${month}-${day}`;
}
