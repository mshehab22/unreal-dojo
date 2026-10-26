// Lead merge helper: resolves git conflicts in append-only docs by keeping our side followed by theirs.
import { readFileSync, writeFileSync } from "node:fs";

/** One conflict hunk: our lines, then the separator, then their lines, up to the closing marker. */
const CONFLICT_HUNK = /^<<<<<<< [^\n]*\n([\s\S]*?)^=======\n([\s\S]*?)^>>>>>>> [^\n]*\n/gm;

/** Replaces every conflict hunk in the text with our side followed by their side. */
export function keepBothSides(text: string): string
{
	return text.replace(CONFLICT_HUNK, (_hunk, ours: string, theirs: string) => ours + theirs);
}

/** Rewrites each file named on the command line with both sides of every conflict kept. */
function main(paths: readonly string[]): void
{
	for (const path of paths)
	{
		const text = readFileSync(path, "utf8");

		writeFileSync(path, keepBothSides(text));
	}
}

main(process.argv.slice(2));
