// Remembers the last successful full build: when it finished and, per quest, which files it compiled.

/** The files and tests a full build compiled for one quest. */
export interface BuiltQuestSnapshot
{
	files: Record<string, string>;
	tests: string;

	/** When that build finished, on the runner's clock. */
	builtAt: number;
}

/** In memory for this app session. The fast loop compares against it: Windows to spot header changes since the build, macOS to tell whether the open editor has the current code (A45). */
export class FullBuildLedger
{
	private lastBuildAt: number | null = null;
	private readonly snapshots = new Map<string, BuiltQuestSnapshot>();

	/** Records a successful full build of a quest's files. */
	recordBuild(questId: string, files: Record<string, string>, tests: string, builtAt: number): void
	{
		this.lastBuildAt = builtAt;
		this.snapshots.set(questId, { files: { ...files }, tests, builtAt });
	}

	/** Records a full build that compiled no particular quest (sandbox create or rebuild), which still replaces the code on disk. */
	recordSandboxBuild(builtAt: number): void
	{
		this.lastBuildAt = builtAt;
	}

	/** When the last full build of any kind finished, or null when none has this session. */
	lastFullBuildAt(): number | null
	{
		return this.lastBuildAt;
	}

	/** What the last full build compiled for this quest, or null when this session has not built it. */
	snapshotFor(questId: string): BuiltQuestSnapshot | null
	{
		return this.snapshots.get(questId) ?? null;
	}
}
