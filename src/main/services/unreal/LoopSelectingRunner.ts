// Picks the fast or headless loop at the start of each run and keeps the full-build record the choice depends on.
import type { RunResult } from "@shared/types/run";
import type { LoopModeSetting } from "@shared/types/settings";

import { chooseLoop } from "./chooseLoop";
import type { EditorLauncher, EditorSession } from "./EditorLauncher";
import type { FullBuildLedger } from "./FullBuildLedger";
import { LiveEditorRunner } from "./LiveEditorRunner";
import type { PlatformPaths } from "./PlatformPaths";
import type { ProgressListener, ProgressUpdate } from "./ProgressUpdate";
import type { QuestFileWriter, QuestForWriting } from "./QuestFileWriter";
import type { IRunner, RunnerContext } from "./Runner";
import { PROJECT_FILE_NAME } from "./SandboxProjectService";
import type { Timer } from "./SupervisedProcess";

/** What the fast loop needs beyond the headless runner. One set per app, shared by every run. */
export interface FastLoopDependencies
{
	paths: PlatformPaths;
	editorLauncher: EditorLauncher;
	ledger: FullBuildLedger;
	writer: QuestFileWriter;
	timer: Timer;

	/** The `loopMode` setting, read at the start of each run. */
	getLoopMode: () => LoopModeSetting;

	/** True when the engine at this root is 5.8 or later. */
	engineSupportsFastLoop: (engineRoot: string) => Promise<boolean>;
}

/** The IRunner RunnerFactory hands out once the fast loop exists. Chooses with chooseLoop, announces the loop and reason once, and records every successful full build. */
export class LoopSelectingRunner implements IRunner
{
	private readonly context: RunnerContext;
	private readonly headlessRunner: IRunner;
	private readonly fastLoop: FastLoopDependencies;

	/** Takes the run context, its headless runner, and the shared fast loop pieces. */
	constructor(context: RunnerContext, headlessRunner: IRunner, fastLoop: FastLoopDependencies)
	{
		this.context = context;
		this.headlessRunner = headlessRunner;
		this.fastLoop = fastLoop;
	}

	/** Chooses the loop and runs it. Never throws. */
	async run(quest: QuestForWriting, files: Record<string, string>, onProgress: ProgressListener, signal: AbortSignal): Promise<RunResult>
	{
		const { ledger, getLoopMode, engineSupportsFastLoop, paths } = this.fastLoop;
		const loopMode = getLoopMode();
		const session = this.sandboxEditor();
		const engineSupports = loopMode !== "headless" && (await engineSupportsFastLoop(this.context.engineRoot).catch(() => false));
		const answering = engineSupports && session !== null && (await session.client.isAnswering());

		const choice = chooseLoop({
			loopMode,
			engineSupportsFastLoop: engineSupports,
			liveCodingAvailable: paths.liveCodingAvailable,
			editor: session ? { launchedAt: session.launchedAt, answering } : null,
			lastFullBuildAt: ledger.lastFullBuildAt(),
			builtSnapshot: ledger.snapshotFor(quest.id),
			sandboxChangedSinceBuild: ledger.sandboxChangedSinceBuild(),
			files,
			tests: quest.tests,
		});

		if (choice.loop === "headless" || session === null) return this.runHeadless(quest, files, onProgress, signal, choice.reason);

		onProgress({ phase: "preparing", lastLine: choice.reason, loop: "fast", loopReason: choice.reason });

		const fastRunner = new LiveEditorRunner({
			context: this.context,
			session,
			writer: this.fastLoop.writer,
			timer: this.fastLoop.timer,
			liveCodingAvailable: paths.liveCodingAvailable,
			fallBackToHeadless: (fallbackQuest, fallbackFiles, fallbackProgress, fallbackSignal, reason) => this.runHeadless(fallbackQuest, fallbackFiles, fallbackProgress, fallbackSignal, reason),
		});

		return fastRunner.run(quest, files, onProgress, signal);
	}

	/** The open editor when it is on this run's engine and sandbox; null otherwise. */
	private sandboxEditor(): EditorSession | null
	{
		const session = this.fastLoop.editorLauncher.current();
		const paths = this.fastLoop.paths;
		const projectFile = paths.join(this.context.sandboxFolder, PROJECT_FILE_NAME);

		if (!session) return null;
		if (paths.pathKey(session.engineRoot) !== paths.pathKey(this.context.engineRoot) || paths.pathKey(session.projectFile) !== paths.pathKey(projectFile)) return null;

		return session;
	}

	/** Runs the headless loop with this reason. On Windows an open editor is closed first, since UBT cannot build modules it has loaded, and reopened afterwards. */
	private async runHeadless(quest: QuestForWriting, files: Record<string, string>, onProgress: ProgressListener, signal: AbortSignal, reason: string): Promise<RunResult>
	{
		const { editorLauncher, ledger, timer, paths } = this.fastLoop;
		const closeEditor = paths.liveCodingAvailable && editorLauncher.current() !== null;

		onProgress({ phase: "preparing", lastLine: reason, loop: "headless", loopReason: reason });

		if (closeEditor)
		{
			onProgress({ phase: "preparing", lastLine: "Closing the editor for the full build; it opens again afterwards" });
			await editorLauncher.close();
		}

		// The headless runner announces its own loop; the reason above is the one that counts.
		const result = await this.headlessRunner.run(quest, files, (update) => onProgress(withoutLoopFields(update)), signal);

		if (result.compiled) ledger.recordBuild(quest.id, files, quest.tests, timer.now());

		if (closeEditor) void editorLauncher.reopen().catch(() => null);

		return result;
	}
}

/** The update without `loop` and `loopReason`. */
function withoutLoopFields(update: ProgressUpdate): ProgressUpdate
{
	const { loop: _loop, loopReason: _loopReason, ...rest } = update;

	return rest;
}
