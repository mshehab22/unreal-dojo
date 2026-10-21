// Tracks fenced code blocks line by line, so a `#include` or `# comment` inside code is never read as a heading.

/** Matches an opening or closing code fence and captures the fence characters. */
const FENCE_PATTERN = /^\s{0,3}(`{3,}|~{3,})/;

/** Tracks whether a line is inside a fenced code block. Feed it every line in order. */
export class FenceTracker
{
	private openFence: string | undefined;

	/** Feeds one line; returns true when the line is part of a fence (the fence lines included). */
	consume(line: string): boolean
	{
		const match = FENCE_PATTERN.exec(line);

		if (this.openFence === undefined)
		{
			if (match?.[1] === undefined) return false;

			this.openFence = match[1];
			return true;
		}

		const fence = match?.[1];

		if (fence !== undefined && fence[0] === this.openFence[0] && fence.length >= this.openFence.length && line.trim() === fence)
		{
			this.openFence = undefined;
		}

		return true;
	}

	/** Whether a fence is still open after the last line fed. */
	get isOpen(): boolean
	{
		return this.openFence !== undefined;
	}
}
