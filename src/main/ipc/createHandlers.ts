// Builds the handler for every DojoApi method. Services replace the stubs here as each system task lands.
import type { DojoMethod } from "@shared/ipc";
import type { EngineInstall, ToolchainCheck } from "@shared/types/engine";

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

/** What the handlers need from the outside world. Grows as services are built; tests pass fakes. */
export interface HandlerDependencies
{
	/** Returns the app version (`app.getVersion()` in the real app). */
	getAppVersion: () => string;

	/** Returns the engine locator (M1.1). A function so an unsupported platform fails on the call, not at startup. */
	getEngineLocator: () => EngineLocatorService;

	/** The learner's progress and the game rules (M1.6). */
	progressService: ProgressService;
}

/** The part of EngineLocator the handlers use, so tests can pass a fake. */
export interface EngineLocatorService
{
	/** Every supported engine found on this machine. */
	findEngines(): Promise<EngineInstall[]>;

	/** The platform build toolchain check. */
	checkToolchain(): Promise<ToolchainCheck>;
}

/** Task names used in not-implemented messages, so the renderer can say when a feature arrives. */
const ARRIVES_WITH = {
	settings: "the settings service (app-shell)",
	engine: "the engine locator (M1.1) and its folder picker",
	sandbox: "sandbox setup (M1.2)",
	editor: "the fast loop (M1.4)",
	runs: "the build and test loop (M1.3 and M1.4)",
	submit: "the build loop, rules, and review (M1.3, M1.6, M1.7)",
	progress: "progress and rules (M1.6)",
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
	const { progressService } = dependencies;

	return {
		getAppVersion: { argumentSchemas: [], handle: () => dependencies.getAppVersion() },

		getSettings: stub("getSettings", ARRIVES_WITH.settings, []),
		updateSettings: stub("updateSettings", ARRIVES_WITH.settings, [settingsPatchSchema]),
		setApiKey: stub("setApiKey", ARRIVES_WITH.settings, [apiKeySchema]),
		clearApiKey: stub("clearApiKey", ARRIVES_WITH.settings, []),

		detectEngines: { argumentSchemas: [], handle: () => dependencies.getEngineLocator().findEngines() },
		pickEngineFolder: stub("pickEngineFolder", ARRIVES_WITH.engine, []),
		checkToolchain: { argumentSchemas: [], handle: () => dependencies.getEngineLocator().checkToolchain() },
		getEnvironmentStatus: stub("getEnvironmentStatus", ARRIVES_WITH.engine, []),
		completeFirstRun: stub("completeFirstRun", ARRIVES_WITH.settings, []),

		pickSandboxFolder: stub("pickSandboxFolder", ARRIVES_WITH.sandbox, []),
		createSandbox: stub("createSandbox", ARRIVES_WITH.sandbox, [sandboxSetupRequestSchema]),
		rebuildSandbox: stub("rebuildSandbox", ARRIVES_WITH.sandbox, [idSchema]),
		openEditor: stub("openEditor", ARRIVES_WITH.editor, [idSchema.nullable()]),

		runQuest: stub("runQuest", ARRIVES_WITH.runs, [runRequestSchema]),
		submitQuest: stub("submitQuest", ARRIVES_WITH.submit, [runRequestSchema]),
		checkSnippetSyntax: stub("checkSnippetSyntax", ARRIVES_WITH.runs, [syntaxCheckRequestSchema]),
		cancelRun: stub("cancelRun", ARRIVES_WITH.runs, [idSchema]),

		getProgress: { argumentSchemas: [], handle: () => progressService.getProgress() },
		getRules: { argumentSchemas: [], handle: () => progressService.getRules() },
		getQuestAvailability: stub("getQuestAvailability", ARRIVES_WITH.progress, []),
		getTestOutStatus: stub("getTestOutStatus", ARRIVES_WITH.progress, []),
		setPlayerName: { argumentSchemas: [playerNameSchema], handle: (name) => progressService.setPlayerName(name) },
		saveQuestDraft: { argumentSchemas: [questDraftSchema], handle: (draft) => progressService.saveQuestDraft(draft) },
		resetQuest: { argumentSchemas: [idSchema], handle: (questId) => progressService.resetQuest(questId) },
		revealHint: stub("revealHint", ARRIVES_WITH.progress, [idSchema]),
		submitConcept: stub("submitConcept", ARRIVES_WITH.progress, [conceptSubmissionSchema]),
		submitBreakdown: stub("submitBreakdown", ARRIVES_WITH.progress, [breakdownSubmissionSchema]),
		reviseBreakdown: stub("reviseBreakdown", ARRIVES_WITH.review, [breakdownRevisionSchema]),
		recordTermHover: { argumentSchemas: [idSchema], handle: (termId) => progressService.recordTermHover(termId) },
		queueDrillItem: { argumentSchemas: [idSchema], handle: (itemId) => progressService.queueDrillItem(itemId) },
		getDailyQuest: stub("getDailyQuest", ARRIVES_WITH.progress, []),
		chooseDailyOffer: { argumentSchemas: [dailyOfferIndexSchema], handle: (index) => progressService.chooseDailyOffer(index) },
		resetProgress: { argumentSchemas: [], handle: () => progressService.resetProgress() },

		getDrillSummary: { argumentSchemas: [], handle: () => progressService.getDrillSummary() },
		answerDrillItem: stub("answerDrillItem", ARRIVES_WITH.progress, [drillAnswerSchema]),
		finishDrill: stub("finishDrill", ARRIVES_WITH.progress, [idSchema]),

		getReviewProviders: stub("getReviewProviders", ARRIVES_WITH.review, []),
		testClaudeCode: stub("testClaudeCode", ARRIVES_WITH.review, []),
		explainFinding: stub("explainFinding", ARRIVES_WITH.review, [findingExplanationRequestSchema]),
		answerReflection: stub("answerReflection", ARRIVES_WITH.review, [reflectionAnswerRequestSchema]),
	};
}
