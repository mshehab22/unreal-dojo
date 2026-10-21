// Reports ids used twice inside one quest or pattern card (question, piece, plan, file, and Parsons ids).
import type { ProblemList, ProblemLocation } from "./ProblemList";

/** Adds a problem for every id in `ids` that already appeared earlier; `owner` names the scope, such as "this quest". */
export function reportRepeatedIds(ids: readonly string[], what: string, owner: string, problems: ProblemList, location: ProblemLocation): void
{
	const seen = new Set<string>();

	for (const id of ids)
	{
		if (seen.has(id)) problems.add(`${what} id "${id}" is used twice in ${owner}`, location);

		seen.add(id);
	}
}
