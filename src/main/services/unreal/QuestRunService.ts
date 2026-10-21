// Runs a quest for the renderer: finds the quest and the sandbox, fills skipped prerequisites, and hands the files to the chosen runner.
import type { AuthoredQuest } from "@shared/types/content";
import type { SandboxSetupResult } from "@shared/types/engine";
import type { RunResult, SyntaxCheckResult } from "@shared/types/run";

import { AppErrorException } from "../../errors/AppErrorException";
import type { PassedCheck, PrerequisiteFiller } from "./PrerequisiteFiller";
import type { ProgressListener } from "./ProgressUpdate";
import { prerequisiteQuestIds } from "./QuestDependencies";
import type { RunnerFactory } from "./RunnerFactory";
import type { RunnerContext } from "./Runner";
import type { SandboxProjectService } from "./SandboxProjectService";
import type { SnippetSyntaxChecker } from "./SnippetSyntaxChecker";
import type { UnrealSettingsStore } from "./UnrealSettingsStore";

/** Finds an authored quest by id. ContentCatalog satisfies it. */
export interface AuthoredQuestSource
{
	/** The quest, or undefined for an unknown id. */
	getAuthoredQuest(questId: string): Promise<AuthoredQuest | undefined>;
}

/** What the run service is built from. */
export interface QuestRunDependencies
{
	settings: UnrealSettingsStore;
	quests: AuthoredQuestSource;
	runnerFactory: RunnerFactory;
	prerequisiteFiller: PrerequisiteFiller;
	sandboxService: SandboxProjectService;

	/** The platform's snippet checker, or null where none is built yet (Windows, A402). */
	snippetChecker: SnippetSyntaxChecker | null;

	/** Whether the learner passed a quest themselves (from the progress service). */
	isPassed: PassedCheck;
}

/** `runQuest`, `checkSnippetSyntax`, and `rebuildSandbox` behind one object for the IPC handlers. */
export class QuestRunService
{
	private readonly dependencies: QuestRunDependencies;

	/** Takes everything it uses. */
	constructor(dependencies: QuestRunDependencies)
	{
		this.dependencies = dependencies;
	}

	/** Builds and tests the learner's files for a build or refactor quest. Throws an AppError exception when the quest or sandbox is missing; build and test failures resolve in the RunResult. */
	async runQuest(questId: string, files: Record<string, string>, onProgress: ProgressListener, signal: AbortSignal): Promise<RunResult>
	{
		const context = this.requireContext();
		const quest = await this.requireCodeQuest(questId);

		const prerequisites = prerequisiteQuestIds(quest.brief);

		if (prerequisites.length > 0)
		{
			onProgress({ phase: "preparing", lastLine: `Checking earlier quests this one compiles against: ${prerequisites.join(", ")}` });

			const filled = await this.dependencies.prerequisiteFiller.fill(context.sandboxFolder, prerequisites, this.dependencies.isPassed);

			for (const prerequisite of filled)
			{
				onProgress({ phase: "writing", lastLine: `Using the reference solution for ${prerequisite.questId} (${prerequisite.fileNames.join(", ")}) because ${prerequisite.reason}.` });
			}
		}

		return this.dependencies.runnerFactory.forContext(context).run(quest, files, onProgress, signal);
	}

	/** Syntax-checks a concept quest's scratch buffer with the platform compiler. */
	async checkSnippetSyntax(code: string): Promise<SyntaxCheckResult>
	{
		const checker = this.dependencies.snippetChecker;
		if (!checker) throw new AppErrorException("not-implemented", "The syntax check is not available on this computer yet.", "Use Run on a build quest to compile your code for now.", "No snippet checker for this platform (A402)");

		const context = this.requireContext();

		return checker.check(context.engineRoot, context.sandboxFolder, code);
	}

	/** Runs a clean full build of the sandbox in settings. */
	rebuildSandbox(onProgress: ProgressListener, signal: AbortSignal): Promise<SandboxSetupResult>
	{
		const context = this.requireContext();

		return this.dependencies.sandboxService.rebuild(context.engineRoot, context.sandboxFolder, onProgress, signal);
	}

	/** The engine and sandbox from settings. Throws `sandbox-not-ready` before setup. */
	private requireContext(): RunnerContext
	{
		const engineRoot = this.dependencies.settings.getEnginePath();
		const sandboxFolder = this.dependencies.settings.getSandboxPath();

		if (engineRoot === null || sandboxFolder === null) throw new AppErrorException("sandbox-not-ready", "The sandbox project has not been set up yet.", "Finish first-run setup (pick the engine and create the sandbox), then run again.");

		return { engineRoot, sandboxFolder };
	}

	/** The build or refactor quest with this id. Throws `quest-not-found` for an unknown id or a quest without code. */
	private async requireCodeQuest(questId: string): Promise<Extract<AuthoredQuest, { kind: "build" | "refactor" }>>
	{
		const quest = await this.dependencies.quests.getAuthoredQuest(questId);

		if (!quest || (quest.kind !== "build" && quest.kind !== "refactor")) throw new AppErrorException("quest-not-found", "That quest has no code to build.", "Open a build or refactor quest and run it from there.", questId);

		return quest;
	}
}
