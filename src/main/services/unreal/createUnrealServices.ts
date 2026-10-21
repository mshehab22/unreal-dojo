// Builds the real sandbox service and runner factory for this machine; the composition root calls it lazily.
import { homedir } from "node:os";

import { AppErrorException } from "../../errors/AppErrorException";
import { AutomationTestRunner } from "./AutomationTestRunner";
import { createUnrealPlatform } from "./createUnrealPlatform";
import type { EngineInspector } from "./SandboxProjectService";
import { HeadlessRunner } from "./HeadlessRunner";
import { NodeCommandRunner } from "./NodeCommandRunner";
import { NodeProcessLauncher } from "./NodeProcessLauncher";
import { NodeSandboxFileSystem } from "./NodeSandboxFileSystem";
import { QuestFileWriter } from "./QuestFileWriter";
import { RunnerFactory } from "./RunnerFactory";
import { ClangSnippetSyntaxChecker } from "./ClangSnippetSyntaxChecker";
import { type PassedCheck, PrerequisiteFiller } from "./PrerequisiteFiller";
import { type AuthoredQuestSource, QuestRunService } from "./QuestRunService";
import { ReferenceSolutions } from "./ReferenceSolutions";
import type { UnrealSettingsStore } from "./UnrealSettingsStore";
import { SandboxProjectService } from "./SandboxProjectService";
import { SYSTEM_TIMER } from "./SupervisedProcess";
import { platformUnsupported } from "./unrealErrors";
import { UnrealBuilder } from "./UnrealBuilder";

/** What the composition root passes in. */
export interface UnrealServiceInputs
{
	/** `resources/sandbox-template` in the source tree or next to the packaged app. */
	templateFolder: string;

	/** Reads the engine's version for the sandbox's EngineAssociation. */
	engineInspector: EngineInspector;

	/** Remembers and answers the engine and sandbox folders. */
	settings: UnrealSettingsStore;

	/** Finds quests by id (the content catalog). */
	quests: AuthoredQuestSource;

	/** Whether the learner passed a quest themselves (the progress service). */
	isPassed: PassedCheck;

	/** The reference solutions folder (`tools/solutions` in the source tree, A403). */
	solutionsFolder: string;
}

/** The unreal-pipeline services the IPC handlers use. */
export interface UnrealServices
{
	sandboxService: SandboxProjectService;
	runnerFactory: RunnerFactory;
	questFileWriter: QuestFileWriter;
	questRunService: QuestRunService;
}

/** Wires real disk, processes, and clock. Throws `toolchain-missing` with a plain explanation on an unsupported operating system. */
export function createUnrealServices(inputs: UnrealServiceInputs): UnrealServices
{
	const platform = createUnrealPlatform({ platform: process.platform, homeFolder: homedir(), environment: process.env, commandRunner: new NodeCommandRunner() });

	if (!platform)
	{
		const error = platformUnsupported(process.platform);

		throw new AppErrorException(error.code, error.message, error.suggestedAction, error.detail);
	}

	const { paths, commandRunner } = platform;
	const fileSystem = new NodeSandboxFileSystem();
	const launcher = new NodeProcessLauncher(platform.processTreeKiller);
	const builder = new UnrealBuilder(paths, launcher, SYSTEM_TIMER);
	const testRunner = new AutomationTestRunner(paths, launcher, SYSTEM_TIMER, fileSystem);
	const questFileWriter = new QuestFileWriter(paths, fileSystem);

	const sandboxService = new SandboxProjectService({ paths, fileSystem, builder, engineInspector: inputs.engineInspector, pathStore: inputs.settings, timer: SYSTEM_TIMER, templateFolder: inputs.templateFolder });
	const runnerFactory = new RunnerFactory((context) => new HeadlessRunner({ context, paths, fileSystem, writer: questFileWriter, builder, testRunner, timer: SYSTEM_TIMER }));

	const prerequisiteFiller = new PrerequisiteFiller(questFileWriter, new ReferenceSolutions(paths, fileSystem, inputs.solutionsFolder));

	// Only the Mac check exists so far; Windows answers not-implemented (A402).
	const snippetChecker = paths.buildPlatform === "Mac" ? new ClangSnippetSyntaxChecker(paths, fileSystem, commandRunner) : null;

	const questRunService = new QuestRunService({ settings: inputs.settings, quests: inputs.quests, runnerFactory, prerequisiteFiller, sandboxService, snippetChecker, isPassed: inputs.isPassed });

	return { sandboxService, runnerFactory, questFileWriter, questRunService };
}
