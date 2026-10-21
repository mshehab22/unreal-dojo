// Builds the handler for every DojoApi method. Services replace the stubs here as each system task lands.
import type { DojoMethod } from "@shared/ipc";
import type { ContentStatus, GlossaryAlias, LearnerQuest, LearnerWorld, PackOutline } from "@shared/types/catalog";
import type { GlossaryEntry, PatternCard } from "@shared/types/content";
import type { EngineInstall, SandboxSetupResult, ToolchainCheck } from "@shared/types/engine";
import type { BuildProgressEvent } from "@shared/types/run";

import type { ProgressListener } from "../services/unreal/ProgressUpdate";
import type { RunRegistry } from "../services/unreal/RunRegistry";

import type { ProgressContentService } from "../services/progress/ProgressContentService";
import type { ProgressService } from "../services/progress/ProgressService";
import type { HandlerDefinition, HandlerTable } from "./HandlerDefinition";
import { notImplemented } from "./notImplemented";
import {
	apiKeySchema,
	breakdownRevisionSchema,
	breakdownSubmissionSchema,
	conceptSubmissionSchema,
	dailyOfferIndexSchema,
	drillAnswerSchema,
	drillRequestSchema,
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

	/** Running operations by run id, for `cancelRun`. */
	runRegistry: RunRegistry;

	/** Sends a progress event to the renderer (`sendBuildProgress` in the real app). */
	sendProgress: (event: BuildProgressEvent) => void;

	/** The progress and drill methods that read content: availability, test-out, hints, concept and breakdown grading, daily quest, drills (M1.6b). */
	progressContentService: ProgressContentService;
}

/** The part of SandboxProjectService the handlers use, so tests can pass a fake. */
export interface SandboxSetupService
{
	/** Plain-English warnings about a picked folder (the Windows path length). */
	folderWarnings(pickedFolder: string): string[];

	/** Copies the template into the picked folder and runs the first full build. */
	create(enginePath: string, pickedFolder: string, onProgress: ProgressListener, signal: AbortSignal): Promise<SandboxSetupResult>;
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

/** Task names used in not-implemented messages, so the renderer can say when a feature arrives. */
const ARRIVES_WITH = {
	settings: "the settings service (app-shell)",
	engine: "the engine locator (M1.1)",
	sandbox: "the settings service (sandbox setup itself works, M1.2)",
	editor: "the fast loop (M1.4)",
	runs: "the build and test loop (M1.3 and M1.4)",
	submit: "the build loop, rules, and review (M1.3, M1.6, M1.7)",
	review: "AI review (M1.7)",
} as const;

/** Builds a handler that validates its arguments and then answers `not-implemented`. */
function stub<Method extends DojoMethod>(method: Method, arrivesWith: string, argumentSchemas: HandlerDefinition<Method>["argumentSchemas"]): HandlerDefinition<Method>
{
	return {
		argumentSchemas,
		handle: () =>
		{
			throw notImplemented(method, arrivesWith);
		},
	};
}

/** Returns the full handler table. Every method of DojoApi must appear, or this does not compile. */
export function createHandlers(dependencies: HandlerDependencies): HandlerTable
{
	const { progressService, progressContentService } = dependencies;

	return {
		getAppVersion: { argumentSchemas: [], handle: () => dependencies.getAppVersion() },

		getSettings: stub("getSettings", ARRIVES_WITH.settings, []),
		updateSettings: stub("updateSettings", ARRIVES_WITH.settings, [settingsPatchSchema]),
		setApiKey: stub("setApiKey", ARRIVES_WITH.settings, [apiKeySchema]),
		clearApiKey: stub("clearApiKey", ARRIVES_WITH.settings, []),

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
		getEnvironmentStatus: stub("getEnvironmentStatus", ARRIVES_WITH.engine, []),
		completeFirstRun: stub("completeFirstRun", ARRIVES_WITH.settings, []),

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
		rebuildSandbox: stub("rebuildSandbox", ARRIVES_WITH.sandbox, [idSchema]),
		openEditor: stub("openEditor", ARRIVES_WITH.editor, [idSchema.nullable()]),

		runQuest: stub("runQuest", ARRIVES_WITH.runs, [runRequestSchema]),
		submitQuest: stub("submitQuest", ARRIVES_WITH.submit, [runRequestSchema]),
		checkSnippetSyntax: stub("checkSnippetSyntax", ARRIVES_WITH.runs, [syntaxCheckRequestSchema]),
		cancelRun: { argumentSchemas: [idSchema], handle: (runId) => dependencies.runRegistry.cancel(runId) },

		getProgress: { argumentSchemas: [], handle: () => progressService.getProgress() },
		getRules: { argumentSchemas: [], handle: () => progressService.getRules() },
		getQuestAvailability: { argumentSchemas: [], handle: () => progressContentService.getQuestAvailability() },
		getTestOutStatus: { argumentSchemas: [], handle: () => progressContentService.getTestOutStatus() },
		setPlayerName: { argumentSchemas: [playerNameSchema], handle: (name) => progressService.setPlayerName(name) },
		saveQuestDraft: { argumentSchemas: [questDraftSchema], handle: (draft) => progressService.saveQuestDraft(draft) },
		resetQuest: { argumentSchemas: [idSchema], handle: (questId) => progressService.resetQuest(questId) },
		revealHint: { argumentSchemas: [idSchema], handle: (questId) => progressContentService.revealHint(questId) },
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
		getWorld: { argumentSchemas: [idSchema], handle: (worldId) => dependencies.getContentCatalog().getWorld(worldId) },
		getQuest: { argumentSchemas: [idSchema], handle: (questId) => dependencies.getContentCatalog().getQuest(questId) },
		getGlossary: { argumentSchemas: [], handle: () => dependencies.getContentCatalog().getGlossary() },
		getGlossaryAliases: { argumentSchemas: [], handle: () => dependencies.getContentCatalog().getGlossaryAliases() },
		getPatternCards: { argumentSchemas: [], handle: () => dependencies.getContentCatalog().getPatternCards() },

		startDrill: { argumentSchemas: [drillRequestSchema], handle: (request) => progressContentService.startDrill(request) },
		getDrillSummary: { argumentSchemas: [], handle: () => progressService.getDrillSummary() },
		answerDrillItem: { argumentSchemas: [drillAnswerSchema], handle: (answer) => progressContentService.answerDrillItem(answer) },
		finishDrill: { argumentSchemas: [idSchema], handle: (sessionId) => progressContentService.finishDrill(sessionId) },

		getReviewProviders: stub("getReviewProviders", ARRIVES_WITH.review, []),
		testClaudeCode: stub("testClaudeCode", ARRIVES_WITH.review, []),
		explainFinding: stub("explainFinding", ARRIVES_WITH.review, [findingExplanationRequestSchema]),
		answerReflection: stub("answerReflection", ARRIVES_WITH.review, [reflectionAnswerRequestSchema]),
	};
}
