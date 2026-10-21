// Reads one Parsons (reorder-the-lines) block from a build or refactor quest.
import type { ParsonsBlock, ParsonsDistractor } from "@shared/types/content";

import type { ObjectReader } from "./ObjectReader";

/** Reads one distractor line and the mistake it shows. */
function readDistractor(reader: ObjectReader): ParsonsDistractor
{
	return { line: reader.string("line"), mistake: reader.string("mistake") };
}

/** Reads a Parsons block. The caller calls `reader.finish()`. */
export function readParsons(reader: ObjectReader): ParsonsBlock
{
	return {
		id: reader.string("id"),
		prompt: reader.string("prompt"),
		lines: reader.stringList("lines", false),
		distractors: reader.objectList("distractors", readDistractor),
	};
}
