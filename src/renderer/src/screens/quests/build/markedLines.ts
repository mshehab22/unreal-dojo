// The worked-level lines a learner explains before the gaps open, gathered from every starter file with the key each explanation is saved under.
import type { QuestFile } from "@shared/types/content";

/** One marked line with where it is and its model reason. */
export interface MarkedLineEntry
{
	key: string;
	fileName: string;
	line: number;
	code: string;
	reason: string;
}

/** The key a self-explanation is saved under: file name and 1-based line, for example "DojoF1TrainingDummy.h:13". */
export function markedLineKey(fileName: string, line: number): string
{
	return `${fileName}:${line}`;
}

/** Every marked line of every file, in file order. */
export function markedLinesOf(files: readonly QuestFile[]): MarkedLineEntry[]
{
	return files.flatMap((file) =>
	{
		const lines = file.starter.split("\n");

		return (file.markedLines ?? []).map((marked) => ({ key: markedLineKey(file.name, marked.line), fileName: file.name, line: marked.line, code: (lines[marked.line - 1] ?? "").trim(), reason: marked.reason }));
	});
}
