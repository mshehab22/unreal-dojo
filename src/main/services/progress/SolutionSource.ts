// Where the Seer Stone flow reads a quest's reference solution from (A1390). The app reads `tools/solutions/<quest-id>/`; tests pass a map.

/** Reads a quest's reference solution files. */
export interface SolutionSource
{
	/** The quest's reference files by file name, or null when the quest has no reference solution. */
	filesOf(questId: string): Promise<Record<string, string> | null>;
}

/** A source with no solutions, for services built without one (tests that never view a solution). */
export const NO_SOLUTIONS: SolutionSource = { filesOf: async () => null };
