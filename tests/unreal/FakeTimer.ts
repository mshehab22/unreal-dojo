// A clock tests move by hand, so timeouts fire without waiting.
import type { Timer } from "../../src/main/services/unreal/SupervisedProcess";

/** Time starts at 0 and moves only through `advance`. */
export class FakeTimer implements Timer
{
	private currentTime = 0;
	private pending: { at: number; callback: () => void; cancelled: boolean }[] = [];

	/** The fake time. */
	now(): number
	{
		return this.currentTime;
	}

	/** Records the callback to run once time reaches it. */
	schedule(callback: () => void, delayMs: number): () => void
	{
		const entry = { at: this.currentTime + delayMs, callback, cancelled: false };
		this.pending.push(entry);

		return () => (entry.cancelled = true);
	}

	/** Moves time forward and runs every callback that came due. */
	advance(milliseconds: number): void
	{
		this.currentTime += milliseconds;

		const due = this.pending.filter((entry) => !entry.cancelled && entry.at <= this.currentTime);
		this.pending = this.pending.filter((entry) => !due.includes(entry));

		for (const entry of due) entry.callback();
	}
}
