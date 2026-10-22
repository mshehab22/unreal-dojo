// Builds the handler for every DojoApi method from the services the composition root passes in. No method is a stub any more.
import type { ContentStatus, GlossaryAlias, LearnerQuest, LearnerWorld, PackOutline } from "@shared/types/catalog";
import type { GlossaryEntry, PatternCard } from "@shared/types/content";
import type { EngineInstall, EnvironmentStatus, SandboxSetupResult, ToolchainCheck } from "@shared/types/engine";
import type { SubmitOutcome } from "@shared/types/progress";
import type { CodeReview, ExplainGrade, FindingExplanationRequest, ReflectionAnswerRequest, ReviewProviderStatus } from "@shared/types/review";
import type { BuildProgressEvent, RunRequest, RunResult, SyntaxCheckResult } from "@shared/types/run";
import type { Settings, SettingsPatch } from "@shared/types/settings";

import type { ProgressListener } from "../services/unreal/ProgressUpdate";
import type { RunRegistry } from "../services/unreal/RunRegistry";

import type { ProgressContentService } from "../services/progress/ProgressContentService";
import type { ProgressService } from "../services/progress/ProgressService";
import type { HandlerTable } from "./HandlerDefinition";
import {
	apiKeySchema,
	breakdownRevisionSchema,
	breakdownSubmissionSchema,
	conceptSubmissionSchema,
	dailyOfferIndexSchema,
	drillAnswerSchema,
	drillRequestSchema,
	hintIndexSchema,
	findingExplanationRequestSchema,
	idSchema,
	playerNameSchema,
	questDraftSchema,
	reflectionAnswerRequestSchema,
	runRequestSchema,
	sandboxSetupRequestSchema,
	settingsPatchSchema,
	syntaxCheckRequestSchema,
} from "./requestSchemas";
import { runCancelled } from "../services/unreal/sandboxErrors";
import { trackRun } from "./trackRun";

/** What the handlers need from the outside world. Grows as services are built; tests pass fakes. */
export interface HandlerDependencies
{
	/** Returns the app version (`app.getVersion()` in the real app). */
	getAppVersion: () => string;

	/** Returns the engine locator (M1.1). A function so an unsupported platform fails on the call, not at startup. */
	getEngineLocator: () => EngineLocatorService;

	/** Returns the content catalog loaded at startup. */
	getContentCatalog: () => ContentCatalogService;

	/** Opens the native folder picker with a title and resolves the chosen folder, or null when the learner cancels. */
	pickFolder: (title: string) => Promise<string | null>;

	/** The learner's progress and the game rules (M1.6). */
	progressService: ProgressService;

	/** Returns the sandbox service (M1.2). A function for the same reason. */
	getSandboxService: () => SandboxSetupService;

	/** Returns the quest run service (M1.3b): runs, the snippet syntax check, sandbox rebuilds, and removing a reset quest's files. */
	getQuestRunService: () => QuestRunApi;

	/** Returns the editor service (M1.4b): opens the editor on the sandbox with its MCP server. */
	getEditorService: () => EditorApi;

	/** Running operations by run id, for `cancelRun`. */
	runRegistry: RunRegistry;

	/** Sends a progress event to the renderer (`sendBuildProgress` in the real app). */
	sendProgress: (event: BuildProgressEvent) => void;

	/** The progress and drill methods that read content: availability, test-out, hints, concept and breakdown grading, daily quest, drills (M1.6b). */
	progressContentService: ProgressContentService;

	/** The learner's settings and API key. */
	settingsService: SettingsHandlerService;

	/** Reads the engine, sandbox, review provider, loop mode, and editor connection for the Title chips. */
	readEnvironmentStatus: () => Promise<EnvironmentStatus>;

	/** Returns the review methods and Submit (M1.7c). A function so the review service is built on first use. */
	getReviewHandlers: () => ReviewHandlerService;
}

/** The review methods and Submit the handlers call, so tests can pass a fake (ai-review, M1.7c). */
export interface ReviewHandlerService
{
	/** Every review provider and whether it is available now. */
	getProviderStatuses(): Promise<ReviewProviderStatus[]>;

	/** Rechecks Claude Code with one tiny real request. */
	testClaudeCode(): Promise<ReviewProviderStatus>;

	/** Explains a finding of a stored review in plain English. */
	explainFinding(request: FindingExplanationRequest): Promise<string>;

	/** Grades the learner's answer to a stored review's reflection question. */
	answerReflection(request: ReflectionAnswerRequest): Promise<ExplainGrade>;

	/** Runs, reviews, and records a build or refactor Submit. `onRecording` ends the run in the registry once recording starts, so a late cancel cannot report a saved Submit as cancelled (A601). */
	submitQuest(request: RunRequest, onProgress: ProgressListener, signal: AbortSignal, onRecording?: () => void): Promise<SubmitOutcome>;

	/** Reviews an earlier Submit's stored files and run again, with no new build, and replaces its stored review (A740, A741). */
	retryReview(attemptId: string): Promise<CodeReview>;
}

/** The part of SettingsService the handlers use, so tests can pass a fake. */
export interface SettingsHandlerService
{
	/** The current settings, without the key. */
	current(): Settings;

	/** Applies a validated patch; throws the engine locator's error for a folder that is not a supported engine. */
	update(patch: SettingsPatch): Promise<Settings>;

	/** Encrypts and stores the key; throws `secure-storage-unavailable`. */
	setApiKey(apiKey: string): void;

	/** Deletes the stored key. */
	clearApiKey(): void;

	/** Marks first run finished; throws `settings-invalid`, the locator's error, or `sandbox-not-ready` while setup is not really done. */
	completeFirstRun(): Promise<Settings>;
}

/** The part of SandboxProjectService the handlers use, so tests can pass a fake. */
export interface SandboxSetupService
{
	/** Plain-English warnings about a picked folder (the Windows path length). */
	folderWarnings(pickedFolder: string): string[];

	/** Copies the template into the picked folder and runs the first full build. */
	create(enginePath: string, pickedFolder: string, onProgress: ProgressListener, signal: AbortSignal): Promise<SandboxSetupResult>;
}

/** The part of QuestRunService the handlers use, so tests can pass a fake. */
export interface QuestRunApi
{
	/** Builds and tests a quest's files. */
	runQuest(questId: string, files: Record<string, string>, onProgress: ProgressListener, signal: AbortSignal): Promise<RunResult>;

	/** Syntax-checks a scratch buffer. */
	checkSnippetSyntax(code: string): Promise<SyntaxCheckResult>;

	/** Clean full build of the sandbox in settings. */
	rebuildSandbox(onProgress: ProgressListener, signal: AbortSignal): Promise<SandboxSetupResult>;

	/** Removes a reset quest's files from the sandbox; does nothing before setup. */
	removeQuestFiles(questId: string): Promise<void>;
}

/** The part of EditorService the handlers use, so tests can pass a fake. */
export interface EditorApi
{
	/** Opens the editor on the sandbox (with the MCP server on 5.8 and later) and resolves once it answers. */
	openEditor(): Promise<void>;
}

/** The part of EngineLocator the handlers use, so tests can pass a fake. */
export interface EngineLocatorService
{
	/** Every supported engine found on this machine. */
	findEngines(): Promise<EngineInstall[]>;

	/** The platform build toolchain check. */
	checkToolchain(): Promise<ToolchainCheck>;

	/** Reads a folder the learner picked; throws `engine-not-found` or `engine-version-unsupported`. */
	inspectFolder(folder: string): Promise<EngineInstall>;
}

/** The part of ContentCatalog the handlers use, so tests can pass a fake. */
export interface ContentCatalogService
{
	/** Load counts and problems. */
	getStatus(): Promise<ContentStatus>;

	/** Every pack as an outline. */
	listPacks(): Promise<PackOutline[]>;

	/** One full world; throws `world-not-found`. */
	getWorld(worldId: string): Promise<LearnerWorld>;

	/** One full quest; throws `quest-not-found`. */
	getQuest(questId: string): Promise<LearnerQuest>;

	/** Every glossary entry. */
	getGlossary(): Promise<GlossaryEntry[]>;

	/** The flat alias table. */
	getGlossaryAliases(): Promise<GlossaryAlias[]>;

	/** Every pattern card. */
	getPatternCards(): Promise<PatternCard[]>;
}

/** Title of the native folder picker for a manual engine pick. */
const PICK_ENGINE_TITLE = "Choose your Unreal Engine folder (the one that contains Engine)";

/** Title of the folder picker for the sandbox. */
const PICK_SANDBOX_TITLE = "Choose where to create the Unreal Dojo sandbox project";

/** Returns the full handler table. Every method of DojoApi must appear, or this does not compile. */
export function createHandlers(dependencies: HandlerDependencies): HandlerTable
{
	const { progressService, progressContentService } = dependencies;

	/** Checks the quest is open (A802), then stops with `run-cancelled` if the run was cancelled while it checked. */
	const openQuestOrCancel = async (questId: string, signal: AbortSignal): Promise<void> =>
	{
		await progressContentService.assertQuestOpen(questId);

		if (signal.aborted) throw runCancelled();
	};

	return {
		getAppVersion: { argumentSchemas: [], handle: () => dependencies.getAppVersion() },

		getSettings: { argumentSchemas: [], handle: () => dependencies.settingsService.current() },
		updateSettings: { argumentSchemas: [settingsPatchSchema], handle: (patch) => dependencies.settingsService.update(patch) },
		setApiKey: { argumentSchemas: [apiKeySchema], handle: (apiKey) => dependencies.settingsService.setApiKey(apiKey) },
		clearApiKey: { argumentSchemas: [], handle: () => dependencies.settingsService.clearApiKey() },

		detectEngines: { argumentSchemas: [], handle: () => dependencies.getEngineLocator().findEngines() },
		pickEngineFolder: {
			argumentSchemas: [],
			handle: async () =>
			{
				const folder = await dependencies.pickFolder(PICK_ENGINE_TITLE);
				return folder === null ? null : dependencies.getEngineLocator().inspectFolder(folder);
			},
		},
		checkToolchain: { argumentSchemas: [], handle: () => dependencies.getEngineLocator().checkToolchain() },
		getEnvironmentStatus: { argumentSchemas: [], handle: () => dependencies.readEnvironmentStatus() },
		completeFirstRun: { argumentSchemas: [], handle: () => dependencies.settingsService.completeFirstRun() },

		pickSandboxFolder: {
			argumentSchemas: [],
			handle: async () =>
			{
				const folder = await dependencies.pickFolder(PICK_SANDBOX_TITLE);
				return folder === null ? null : { path: folder, warnings: dependencies.getSandboxService().folderWarnings(folder) };
			},
		},
		createSandbox: {
			argumentSchemas: [sandboxSetupRequestSchema],
			handle: (request) => trackRun(request.runId, dependencies.runRegistry, dependencies.sendProgress, (onProgress, signal) => dependencies.getSandboxService().create(request.enginePath, request.folder, onProgress, signal)),
		},
		rebuildSandbox: {
			argumentSchemas: [idSchema],
			handle: (runId) => trackRun(runId, dependencies.runRegistry, dependencies.sendProgress, (onProgress, signal) => dependencies.getQuestRunService().rebuildSandbox(onProgress, signal)),
		},
		// Per-quest maps for "See it run" do not exist yet, so a quest id opens the sandbox like null does (A533).
		openEditor: { argumentSchemas: [idSchema.nullable()], handle: () => dependencies.getEditorService().openEditor() },

		runQuest: {
			argumentSchemas: [runRequestSchema],
			// The run is registered first, so a cancel during the availability check finds it; a locked or unknown quest is then refused before any build starts (A802, A803).
			handle: (request) => trackRun(request.runId, dependencies.runRegistry, dependencies.sendProgress, async (onProgress, signal) =>
			{
				await openQuestOrCancel(request.questId, signal);

				return dependencies.getQuestRunService().runQuest(request.questId, request.files, onProgress, signal);
			}),
		},
		submitQuest: {
			argumentSchemas: [runRequestSchema],
			handle: (request) => trackRun(request.runId, dependencies.runRegistry, dependencies.sendProgress, async (onProgress, signal) =>
			{
				await openQuestOrCancel(request.questId, signal);

				return dependencies.getReviewHandlers().submitQuest(request, onProgress, signal, () => dependencies.runRegistry.end(request.runId));
			}),
		},
		checkSnippetSyntax: { argumentSchemas: [syntaxCheckRequestSchema], handle: (request) => dependencies.getQuestRunService().checkSnippetSyntax(request.code) },
		cancelRun: { argumentSchemas: [idSchema], handle: (runId) => dependencies.runRegistry.cancel(runId) },

		getProgress: { argumentSchemas: [], handle: () => progressService.getProgress() },
		getRules: { argumentSchemas: [], handle: () => progressService.getRules() },
		getQuestAvailability: { argumentSchemas: [], handle: () => progressContentService.getQuestAvailability() },
		getTestOutStatus: { argumentSchemas: [], handle: () => progressContentService.getTestOutStatus() },
		setPlayerName: { argumentSchemas: [playerNameSchema], handle: (name) => progressService.setPlayerName(name) },
		saveQuestDraft: { argumentSchemas: [questDraftSchema], handle: (draft) => progressService.saveQuestDraft(draft) },
		resetQuest: {
			argumentSchemas: [idSchema],
			handle: async (questId) =>
			{
				const progress = await progressService.resetQuest(questId);

				// The save is reset either way; a sandbox that cannot be reached (no engine, another platform) only keeps the old files, which the next run replaces (A534).
				// Getting the service can throw too (an unsupported platform), so the whole call is guarded (A610).
				try
				{
					await dependencies.getQuestRunService().removeQuestFiles(questId);
				}
				catch (error)
				{
					console.warn(`Reset ${questId}: sandbox files not removed: ${(error as Error).message}`);
				}

				return progress;
			},
		},
		revealHint: { argumentSchemas: [idSchema, hintIndexSchema.optional()], handle: (questId, hintIndex) => progressContentService.revealHint(questId, hintIndex) },
		submitConcept: { argumentSchemas: [conceptSubmissionSchema], handle: (submission) => progressContentService.submitConcept(submission) },
		submitBreakdown: { argumentSchemas: [breakdownSubmissionSchema], handle: (submission) => progressContentService.submitBreakdown(submission) },
		reviseBreakdown: { argumentSchemas: [breakdownRevisionSchema], handle: (revision) => progressContentService.reviseBreakdown(revision) },
		recordTermHover: { argumentSchemas: [idSchema], handle: (termId) => progressService.recordTermHover(termId) },
		queueDrillItem: { argumentSchemas: [idSchema], handle: (itemId) => progressService.queueDrillItem(itemId) },
		getDailyQuest: { argumentSchemas: [], handle: () => progressContentService.getDailyQuest() },
		chooseDailyOffer: { argumentSchemas: [dailyOfferIndexSchema], handle: (index) => progressService.chooseDailyOffer(index) },
		resetProgress: { argumentSchemas: [], handle: () => progressService.resetProgress() },

		getContentStatus: { argumentSchemas: [], handle: () => dependencies.getContentCatalog().getStatus() },
		listPacks: { argumentSchemas: [], handle: () => dependencies.getContentCatalog().listPacks() },
		getWorld: { argumentSchemas: [idSchema], handle: (worldId) => progressContentService.getWorld(worldId) },
		getQuest: { argumentSchemas: [idSchema], handle: (questId) => progressContentService.getQuest(questId) },
		getGlossary: { argumentSchemas: [], handle: () => dependencies.getContentCatalog().getGlossary() },
		getGlossaryAliases: { argumentSchemas: [], handle: () => dependencies.getContentCatalog().getGlossaryAliases() },
		getPatternCards: { argumentSchemas: [], handle: () => dependencies.getContentCatalog().getPatternCards() },

		startDrill: { argumentSchemas: [drillRequestSchema], handle: (request) => progressContentService.startDrill(request) },
		getDrillSummary: { argumentSchemas: [], handle: () => progressService.getDrillSummary() },
		answerDrillItem: { argumentSchemas: [drillAnswerSchema], handle: (answer) => progressContentService.answerDrillItem(answer) },
		finishDrill: { argumentSchemas: [idSchema], handle: (sessionId) => progressContentService.finishDrill(sessionId) },

		getReviewProviders: { argumentSchemas: [], handle: () => dependencies.getReviewHandlers().getProviderStatuses() },
		testClaudeCode: { argumentSchemas: [], handle: () => dependencies.getReviewHandlers().testClaudeCode() },
		explainFinding: { argumentSchemas: [findingExplanationRequestSchema], handle: (request) => dependencies.getReviewHandlers().explainFinding(request) },
		answerReflection: { argumentSchemas: [reflectionAnswerRequestSchema], handle: (request) => dependencies.getReviewHandlers().answerReflection(request) },
		retryReview: { argumentSchemas: [idSchema], handle: (attemptId) => dependencies.getReviewHandlers().retryReview(attemptId) },
	};
}
