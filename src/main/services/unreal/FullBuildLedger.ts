// Remembers the last successful full build: when it finished, which files it compiled per quest, and whether the sandbox changed since.

/** The files and tests a full build compiled for one quest. */
export interface BuiltQuestSnapshot
{
	files: Record<string, string>;
	tests: string;

	/** When that build finished, on the runner's clock. */
	builtAt: number;
}

/** In memory for this app session. The fast loop compares against it: Windows to spot header changes since the build, macOS to tell whether the open editor has the current code (A45, A481). */
export class FullBuildLedger
{
	private lastBuildAt: number | null = null;
	private readonly snapshots = new Map<string, BuiltQuestSnapshot>();

	/** Learner files on disk per quest as far as the app wrote them, and the same map as it stood at the last full build. */
	private readonly writtenFiles = new Map<string, string>();
	private builtFiles = new Map<string, string>();

	/** Records a successful full build that compiled a quest's files (written by the run itself). */
	recordBuild(questId: string, files: Record<string, string>, tests: string, builtAt: number): void
	{
		this.replaceWritten(questId, files);
		this.snapshots.set(questId, { files: { ...files }, tests, builtAt });
		this.recordSandboxBuild(builtAt);
	}

	/** Records a full build that compiled no particular quest (sandbox create or rebuild), which still replaces the code on disk. */
	recordSandboxBuild(builtAt: number): void
	{
		this.lastBuildAt = builtAt;
		this.builtFiles = new Map(this.writtenFiles);
	}

	/** Records that another quest's files were written into the sandbox outside a run (PrerequisiteFiller), or removed (`files` null, a quest reset). Identical content is not a change. */
	recordSandboxWrite(questId: string, files: Record<string, string> | null): void
	{
		this.replaceWritten(questId, files ?? {});
	}

	/** True when the sandbox's quest files differ from what the last full build compiled, so the editor may run code that is not on disk (fix round 1). */
	sandboxChangedSinceBuild(): boolean
	{
		if (this.writtenFiles.size !== this.builtFiles.size) return true;

		for (const [key, text] of this.writtenFiles)
		{
			if (this.builtFiles.get(key) !== text) return true;
		}

		return false;
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

	/** Replaces one quest's entries in the written map. Keys are `<quest id>/<file name>`. */
	private replaceWritten(questId: string, files: Record<string, string>): void
	{
		const prefix = `${questId}/`;

		for (const key of [...this.writtenFiles.keys()])
		{
			if (key.startsWith(prefix)) this.writtenFiles.delete(key);
		}

		for (const [fileName, text] of Object.entries(files)) this.writtenFiles.set(prefix + fileName, text);
	}
}
