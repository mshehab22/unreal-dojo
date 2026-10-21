// Runs a quest for the renderer: finds the quest and the sandbox, fills skipped prerequisites, and hands the files to the chosen runner.
import type { PackOutline } from "@shared/types/catalog";
import type { AuthoredQuest } from "@shared/types/content";
import type { SandboxSetupResult } from "@shared/types/engine";
import type { RunResult, SyntaxCheckResult } from "@shared/types/run";

import { AppErrorException } from "../../errors/AppErrorException";
import type { FullBuildLedger } from "./FullBuildLedger";
import type { FilledPrerequisite, PrerequisiteFiller } from "./PrerequisiteFiller";
import type { ProgressListener } from "./ProgressUpdate";
import { prerequisiteQuestIds } from "./QuestDependencies";
import type { QuestFileWriter } from "./QuestFileWriter";
import type { RunnerFactory } from "./RunnerFactory";
import type { RunnerContext } from "./Runner";
import type { SandboxProjectService } from "./SandboxProjectService";
import type { SnippetSyntaxChecker } from "./SnippetSyntaxChecker";
import type { UnrealSettingsStore } from "./UnrealSettingsStore";

/** Finds quests. ContentCatalog satisfies it. */
export interface AuthoredQuestSource
{
	/** The quest, or undefined for an unknown id. */
	getAuthoredQuest(questId: string): Promise<AuthoredQuest | undefined>;

	/** Every pack with its worlds and quest ids, for matching quest ids on a dependency line (A407). */
	listPacks(): Promise<PackOutline[]>;
}

/** What the run service reads about the learner (the progress service). */
export interface LearnerRecord
{
	/** Whether the learner passed a quest themselves. */
	isPassed(questId: string): boolean;

	/** The learner's autosaved files for a quest, or an empty map (A408). */
	savedFiles(questId: string): Record<string, string>;
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

	/** What the progress service knows about the learner's quests. */
	learner: LearnerRecord;

	/** Removes a quest's files from the sandbox on reset. */
	questFileWriter: QuestFileWriter;

	/** The fast loop's build record, told when a reset removes files (A481). */
	buildLedger: FullBuildLedger;
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

		const { prerequisites, bossIds } = await this.allPrerequisites(quest);

		if (prerequisites.length > 0)
		{
			onProgress({ phase: "preparing", lastLine: `Checking earlier quests this one compiles against: ${prerequisites.join(", ")}` });

			const learner = this.dependencies.learner;
			const filled = await this.dependencies.prerequisiteFiller.fill(context.sandboxFolder, prerequisites, {
				isPassed: (questId) => learner.isPassed(questId),
				savedFiles: (questId) => learner.savedFiles(questId),
				isBoss: (questId) => bossIds.has(questId),
			});

			for (const prerequisite of filled) onProgress({ phase: "writing", lastLine: describeFill(prerequisite) });
		}

		return this.dependencies.runnerFactory.forContext(context).run(quest, files, onProgress, signal);
	}

	/** Removes a reset quest's files and test from the sandbox in settings and records the change, so the fast loop does not trust the editor's copy (A481). Does nothing before setup. */
	async removeQuestFiles(questId: string): Promise<void>
	{
		const sandboxFolder = this.dependencies.settings.getSandboxPath();
		if (sandboxFolder === null) return;

		await this.dependencies.questFileWriter.remove(sandboxFolder, questId);
		this.dependencies.buildLedger.recordSandboxWrite(questId, null);
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

	/** The quest's prerequisites and theirs, transitively (a boss's spec names its own, A413), each once and never the quest itself, with the bosses among them. */
	private async allPrerequisites(quest: AuthoredQuest): Promise<{ prerequisites: string[]; bossIds: Set<string> }>
	{
		const knownIds = await this.knownQuestIds();
		const prerequisites: string[] = [];
		const bossIds = new Set<string>();
		const queue = prerequisiteQuestIds(dependencyProse(quest), knownIds);

		while (queue.length > 0)
		{
			const questId = queue.shift() ?? "";
			if (questId === quest.id || prerequisites.includes(questId)) continue;

			prerequisites.push(questId);

			const prerequisite = await this.dependencies.quests.getAuthoredQuest(questId);
			if (prerequisite?.kind === "boss") bossIds.add(questId);
			if (prerequisite) queue.push(...prerequisiteQuestIds(dependencyProse(prerequisite), knownIds));
		}

		return { prerequisites, bossIds };
	}

	/** Every quest id in the content. */
	private async knownQuestIds(): Promise<string[]>
	{
		const packs = await this.dependencies.quests.listPacks();

		return packs.flatMap((pack) => pack.worlds.flatMap((world) => world.quests.map((outline) => outline.id)));
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

/** One progress line naming every filled file and where it came from, for example "Filled f1-training-dummy because ...: DojoF1TrainingDummy.h from your saved code." */
export function describeFill(prerequisite: FilledPrerequisite): string
{
	const files = prerequisite.files.map((file) => `${file.name} from ${file.source}`).join(", ");

	return `Filled ${prerequisite.questId} because ${prerequisite.reason}: ${files}.`;
}

/** The prose that carries a quest's "Compiles against earlier quests:" line: a code quest's brief, a boss's spec. */
function dependencyProse(quest: AuthoredQuest): string
{
	if (quest.kind === "build" || quest.kind === "refactor") return quest.brief;

	if (quest.kind === "boss") return quest.spec;

	return "";
}
