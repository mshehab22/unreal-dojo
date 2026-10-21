// Calendar day helpers in the learner's local time, used by the streak, the daily quest, and the due cap.

/** Milliseconds in one day. */
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** Pads a number to two digits. */
function padTwo(value: number): string
{
	return String(value).padStart(2, "0");
}

/** Returns the local calendar day of a moment as YYYY-MM-DD. */
export function localDayKey(moment: Date): string
{
	return `${moment.getFullYear()}-${padTwo(moment.getMonth() + 1)}-${padTwo(moment.getDate())}`;
}

/** Returns the local calendar month of a moment as YYYY-MM. */
export function localMonthKey(moment: Date): string
{
	return `${moment.getFullYear()}-${padTwo(moment.getMonth() + 1)}`;
}

/** Counts whole local calendar days from `earlier` to `later` (0 on the same day, 1 for yesterday to today), ignoring clock changes. */
export function calendarDaysBetween(earlier: Date, later: Date): number
{
	const earlierDay = Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
	const laterDay = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate());

	return Math.round((laterDay - earlierDay) / MILLISECONDS_PER_DAY);
}

/** Returns the moment the given number of days later (fractional days allowed). */
export function addDays(moment: Date, days: number): Date
{
	return new Date(moment.getTime() + days * MILLISECONDS_PER_DAY);
}

/** Returns the moment the given number of minutes later. */
export function addMinutes(moment: Date, minutes: number): Date
{
	return new Date(moment.getTime() + minutes * 60 * 1000);
}

/** Returns the first moment (local midnight) of the local calendar day that holds `moment`. */
export function startOfLocalDay(moment: Date): Date
{
	return new Date(moment.getFullYear(), moment.getMonth(), moment.getDate());
}

/** Returns the last moment of the local calendar day that holds `moment`. */
export function endOfLocalDay(moment: Date): Date
{
	return new Date(moment.getFullYear(), moment.getMonth(), moment.getDate(), 23, 59, 59, 999);
}

/** Returns every local calendar day (YYYY-MM-DD) of the month that holds `moment`. */
export function daysOfLocalMonth(moment: Date): string[]
{
	const dayCount = new Date(moment.getFullYear(), moment.getMonth() + 1, 0).getDate();
	const days: string[] = [];

	for (let day = 1; day <= dayCount; day++)
	{
		days.push(localDayKey(new Date(moment.getFullYear(), moment.getMonth(), day)));
	}

	return days;
}
