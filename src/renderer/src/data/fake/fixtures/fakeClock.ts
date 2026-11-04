// Dates for the fake's fixtures, relative to now so the screens always look current.

const DAY_MS = 24 * 60 * 60 * 1000;

/** An ISO time this many days from now (negative for the past), plus optional hours. */
export function daysFromNow(days: number, hours = 0): string
{
	return new Date(Date.now() + days * DAY_MS + hours * 60 * 60 * 1000).toISOString();
}

/** The local calendar day of an ISO time as YYYY-MM-DD. An ISO string starts with its UTC day, which is a different day in the evening west of UTC. */
export function localDayOf(iso: string): string
{
	const moment = new Date(iso);
	const month = String(moment.getMonth() + 1).padStart(2, "0");
	const day = String(moment.getDate()).padStart(2, "0");

	return `${moment.getFullYear()}-${month}-${day}`;
}

/** Today's local calendar day as YYYY-MM-DD, as the daily quest stores it. */
export function todayLocal(): string
{
	return localDayOf(new Date().toISOString());
}
