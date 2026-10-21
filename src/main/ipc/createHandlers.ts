// Builds the handler for every DojoApi method. Services replace the stubs here as each system task lands.
import type { DojoMethod } from "@shared/ipc";

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
} from "./requestSchemas";

/** What the handlers need from the outside world. Grows as services are built; tests pass fakes. */
export interface HandlerDependencies
{
	/** Returns the app version (`app.getVersion()` in the real app). */
	getAppVersion: () => string;
}

/** Task names used in not-implemented messages, so the renderer can say when a feature arrives. */
const ARRIVES_WITH = {
	settings: "the settings service (app-shell)",
	engine: "the engine locator (M1.1)",
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
	return {
		getAppVersion: { argumentSchemas: [], handle: () => dependencies.getAppVersion() },

		getSettings: stub("getSettings", ARRIVES_WITH.settings, []),
		updateSettings: stub("updateSettings", ARRIVES_WITH.settings, [settingsPatchSchema]),
		setApiKey: stub("setApiKey", ARRIVES_WITH.settings, [apiKeySchema]),
		clearApiKey: stub("clearApiKey", ARRIVES_WITH.settings, []),

		detectEngines: stub("detectEngines", ARRIVES_WITH.engine, []),
		pickEngineFolder: stub("pickEngineFolder", ARRIVES_WITH.engine, []),
		checkToolchain: stub("checkToolchain", ARRIVES_WITH.engine, []),
		getEnvironmentStatus: stub("getEnvironmentStatus", ARRIVES_WITH.engine, []),
		completeFirstRun: stub("completeFirstRun", ARRIVES_WITH.settings, []),

		pickSandboxFolder: stub("pickSandboxFolder", ARRIVES_WITH.sandbox, []),
		createSandbox: stub("createSandbox", ARRIVES_WITH.sandbox, [sandboxSetupRequestSchema]),
		rebuildSandbox: stub("rebuildSandbox", ARRIVES_WITH.sandbox, [idSchema]),
		openEditor: stub("openEditor", ARRIVES_WITH.editor, [idSchema.nullable()]),

		runQuest: stub("runQuest", ARRIVES_WITH.runs, [runRequestSchema]),
		submitQuest: stub("submitQuest", ARRIVES_WITH.submit, [runRequestSchema]),
		cancelRun: stub("cancelRun", ARRIVES_WITH.runs, [idSchema]),

		getProgress: stub("getProgress", ARRIVES_WITH.progress, []),
		getRules: stub("getRules", ARRIVES_WITH.progress, []),
		getQuestAvailability: stub("getQuestAvailability", ARRIVES_WITH.progress, []),
		setPlayerName: stub("setPlayerName", ARRIVES_WITH.progress, [playerNameSchema]),
		saveQuestDraft: stub("saveQuestDraft", ARRIVES_WITH.progress, [questDraftSchema]),
		resetQuest: stub("resetQuest", ARRIVES_WITH.progress, [idSchema]),
		revealHint: stub("revealHint", ARRIVES_WITH.progress, [idSchema]),
		submitConcept: stub("submitConcept", ARRIVES_WITH.progress, [conceptSubmissionSchema]),
		submitBreakdown: stub("submitBreakdown", ARRIVES_WITH.progress, [breakdownSubmissionSchema]),
		reviseBreakdown: stub("reviseBreakdown", ARRIVES_WITH.review, [breakdownRevisionSchema]),
		recordTermHover: stub("recordTermHover", ARRIVES_WITH.progress, [idSchema]),
		queueDrillItem: stub("queueDrillItem", ARRIVES_WITH.progress, [idSchema]),
		getDailyQuest: stub("getDailyQuest", ARRIVES_WITH.progress, []),
		chooseDailyOffer: stub("chooseDailyOffer", ARRIVES_WITH.progress, [dailyOfferIndexSchema]),
		resetProgress: stub("resetProgress", ARRIVES_WITH.progress, []),

		getDrillSummary: stub("getDrillSummary", ARRIVES_WITH.progress, []),
		answerDrillItem: stub("answerDrillItem", ARRIVES_WITH.progress, [drillAnswerSchema]),
		finishDrill: stub("finishDrill", ARRIVES_WITH.progress, [idSchema]),

		getReviewProviders: stub("getReviewProviders", ARRIVES_WITH.review, []),
		testClaudeCode: stub("testClaudeCode", ARRIVES_WITH.review, []),
		explainFinding: stub("explainFinding", ARRIVES_WITH.review, [findingExplanationRequestSchema]),
		answerReflection: stub("answerReflection", ARRIVES_WITH.review, [reflectionAnswerRequestSchema]),
	};
}
