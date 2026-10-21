// Collects content problems for one file so every reader can report without throwing.
import type { ContentProblem } from "@shared/types/content";

/** Where in a file a reader is working, so each problem it reports names the section and line. */
export interface ProblemLocation
{
	section?: string;
	line?: number;
}

/** The problems found in one file; readers add to it and the loader merges every list at the end. */
export class ProblemList
{
	readonly file: string;
	readonly problems: ContentProblem[] = [];

	/** Starts an empty list for the file at `file` (relative to the content folder). */
	constructor(file: string)
	{
		this.file = file;
	}

	/** Records one problem at the given section and line. */
	add(message: string, location: ProblemLocation = {}): void
	{
		const problem: ContentProblem = { file: this.file, message };

		if (location.section !== undefined) problem.section = location.section;
		if (location.line !== undefined) problem.line = location.line;

		this.problems.push(problem);
	}

	/** How many problems have been recorded so far; readers compare counts to see if a step failed. */
	get count(): number
	{
		return this.problems.length;
	}
}
