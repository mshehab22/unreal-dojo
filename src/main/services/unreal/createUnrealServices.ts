// Builds the real sandbox service and runner factory for this machine; the composition root calls it lazily.
import { homedir } from "node:os";

import { AppErrorException } from "../../errors/AppErrorException";
import { AutomationTestRunner } from "./AutomationTestRunner";
import { BuildFailureExplainer } from "./BuildFailureExplainer";
import { createUnrealPlatform } from "./createUnrealPlatform";
import type { EngineInspector } from "./SandboxProjectService";
import { HeadlessRunner } from "./HeadlessRunner";
import { NodeCommandRunner } from "./NodeCommandRunner";
import { NodeProcessLauncher } from "./NodeProcessLauncher";
import { NodeSandboxFileSystem } from "./NodeSandboxFileSystem";
import { QuestFileWriter } from "./QuestFileWriter";
import { RunnerFactory } from "./RunnerFactory";
import { RunPreflight } from "./RunPreflight";
import { ClangSnippetSyntaxChecker } from "./ClangSnippetSyntaxChecker";
import { EditorLauncher } from "./EditorLauncher";
import { EditorService } from "./EditorService";
import { McpEditorClient } from "./McpEditorClient";
import { NodePortProbe } from "./NodePortProbe";
import { FullBuildLedger } from "./FullBuildLedger";
import { PrerequisiteFiller } from "./PrerequisiteFiller";
import { type AuthoredQuestSource, type LearnerRecord, QuestRunService } from "./QuestRunService";
import { ReferenceSolutions } from "./ReferenceSolutions";
import type { UnrealSettingsStore } from "./UnrealSettingsStore";
import { PROJECT_FILE_NAME, SandboxProjectService, type SandboxBuildHooks } from "./SandboxProjectService";
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

	/** What the progress service knows about the learner's quests. */
	learner: LearnerRecord;

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

	/** The full-build record the fast loop decides with (A481): runs, sandbox create and rebuild, prerequisite fills, and resets all report to it. */
	buildLedger: FullBuildLedger;

	/** The one editor the app opens; the quit hook disposes it (A530). */
	editorLauncher: EditorLauncher;

	/** The openEditor request and the editor chip. */
	editorService: EditorService;
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

	const buildLedger = new FullBuildLedger();
	const editorLauncher = new EditorLauncher({ paths, launcher, timer: SYSTEM_TIMER, portProbe: new NodePortProbe(), createClient: (port) => new McpEditorClient(port) });

	// A full build of the sandbox replaces the code an open editor loaded; close one on this sandbox first (UBT cannot rebuild modules it holds, and a rebuild deletes them), then record the build (A531).
	const buildHooks: SandboxBuildHooks = {
		beforeBuild: async (sandboxFolder) =>
		{
			const session = editorLauncher.current();

			if (session && paths.pathKey(session.projectFile) === paths.pathKey(paths.join(sandboxFolder, PROJECT_FILE_NAME))) await editorLauncher.close();
		},
		afterBuild: (succeeded) =>
		{
			if (succeeded) buildLedger.recordSandboxBuild(SYSTEM_TIMER.now());
		},
	};

	const failureExplainer = new BuildFailureExplainer({ checkToolchain: () => platform.toolchainChecker.check(), inspectEngine: (engineRoot) => inputs.engineInspector.inspectFolder(engineRoot) });

	const sandboxService = new SandboxProjectService({ paths, fileSystem, builder, engineInspector: inputs.engineInspector, pathStore: inputs.settings, timer: SYSTEM_TIMER, templateFolder: inputs.templateFolder, buildHooks, failureExplainer, savedEnginePath: () => inputs.settings.getEnginePath() });
	const runnerFactory = new RunnerFactory((context) => new HeadlessRunner({ context, paths, fileSystem, writer: questFileWriter, builder, testRunner, timer: SYSTEM_TIMER }), {
		paths,
		editorLauncher,
		ledger: buildLedger,
		writer: questFileWriter,
		timer: SYSTEM_TIMER,
		getLoopMode: () => inputs.settings.getLoopMode(),
		engineSupportsFastLoop: async (engineRoot) => (await inputs.engineInspector.inspectFolder(engineRoot)).supportsFastLoop,
	});

	const prerequisiteFiller = new PrerequisiteFiller(questFileWriter, new ReferenceSolutions(paths, fileSystem, inputs.solutionsFolder), (questId, files, replaceFolder) => buildLedger.recordSandboxWrite(questId, files, replaceFolder));

	// Only the Mac check exists so far; Windows answers not-implemented (A402).
	const snippetChecker = paths.buildPlatform === "Mac" ? new ClangSnippetSyntaxChecker(paths, fileSystem, commandRunner) : null;

	const preflight = new RunPreflight({ settings: inputs.settings, paths, engineInspector: inputs.engineInspector, fileSystem });
	const questRunService = new QuestRunService({ settings: inputs.settings, quests: inputs.quests, runnerFactory, prerequisiteFiller, sandboxService, snippetChecker, learner: inputs.learner, questFileWriter, buildLedger, failureExplainer, preflight });
	const editorService = new EditorService({ settings: inputs.settings, engineInspector: inputs.engineInspector, editorLauncher, ledger: buildLedger, paths, checkToolchain: () => platform.toolchainChecker.check() });

	return { sandboxService, runnerFactory, questFileWriter, questRunService, buildLedger, editorLauncher, editorService };
}
