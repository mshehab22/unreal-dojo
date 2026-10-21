// Turns output chunks into whole lines.

/** Buffers text chunks and hands out complete lines, without their line endings. */
export class LineSplitter
{
	private pending = "";
	private readonly onLine: (line: string) => void;

	/** Takes the function that receives each line. */
	constructor(onLine: (line: string) => void)
	{
		this.onLine = onLine;
	}

	/** Adds a chunk and emits every line it completes. */
	push(chunk: string): void
	{
		const parts = (this.pending + chunk).split(/\r?\n/);
		this.pending = parts.pop() ?? "";

		for (const line of parts) this.onLine(line);
	}

	/** Emits whatever is left as a last line. */
	flush(): void
	{
		if (this.pending.length > 0) this.onLine(this.pending);

		this.pending = "";
	}
}
