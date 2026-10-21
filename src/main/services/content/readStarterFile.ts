// Reads one starter file from a `## <FileName>` subsection, pulling out the lines marked for self-explanation.
import type { MarkedLine, QuestFile } from "@shared/types/content";

import type { ProblemList } from "./ProblemList";
import { readSingleCodeBlock, type Subsection } from "./sectionContent";

/** Matches the end-of-line marker `// @explain: <model reason>` that authors put on worked-example lines. */
const EXPLAIN_MARKER_PATTERN = /[ \t]*\/\/[ \t]*@explain:[ \t]*(.*)$/;

/** Matches a plain file name with an extension, such as `DojoW1Door.h`. */
const FILE_NAME_PATTERN = /^[A-Za-z0-9_.-]+\.[A-Za-z0-9]+$/;

/** Reads a starter file; the marker comments are removed from the starter and kept as `markedLines`. */
export function readStarterFile(subsection: Subsection, problems: ProblemList): QuestFile
{
	const name = subsection.title;

	if (!FILE_NAME_PATTERN.test(name)) problems.add(`"## ${name}" is not a file name (expected something like DojoW1Door.h)`, { section: "Files", line: subsection.line });

	const code = readSingleCodeBlock(subsection.body, subsection.line + 1, "cpp", `Files: ${name}`, problems);
	const markedLines: MarkedLine[] = [];

	const starterLines = code.split("\n").map((line, index) =>
	{
		const marker = EXPLAIN_MARKER_PATTERN.exec(line);

		if (marker === null) return line;

		const reason = (marker[1] ?? "").trim();

		if (reason === "") problems.add(`line ${index + 1} has an @explain marker with no reason`, { section: `Files: ${name}`, line: subsection.line });

		markedLines.push({ line: index + 1, reason });
		return line.slice(0, marker.index);
	});

	const file: QuestFile = { name, starter: starterLines.join("\n") };

	if (markedLines.length > 0) file.markedLines = markedLines;

	return file;
}
