// The typed contract between the renderer and the main process: every method the system specs need, its channel, and the progress event channel.
import type { ContentStatus, GlossaryAlias, LearnerQuest, LearnerWorld, PackOutline } from "./types/catalog";
import type { GlossaryEntry, PatternCard } from "./types/content";
import type { DrillRequest, DrillSession } from "./types/drill";
import type { EngineInstall, EnvironmentStatus, SandboxFolderChoice, SandboxSetupResult, ToolchainCheck } from "./types/engine";
import type { AppError } from "./types/errors";
import type {
	BreakdownOutcome,
	BreakdownReferenceChoice,
	BreakdownRevision,
	BreakdownSubmission,
	ConceptOutcome,
	ConceptSubmission,
	DailyQuestState,
	DrillAnswer,
	DrillItemResult,
	DrillOutcome,
	DrillSummary,
	HintReveal,
	PlayerProgress,
	QuestAvailability,
	QuestDraft,
	QuestProgress,
	RulesSnapshot,
	SubmitOutcome,
	WorldTestOutStatus,
} from "./types/progress";
import type { ExplainGrade, FindingExplanationRequest, ReflectionAnswerRequest, ReviewProviderStatus } from "./types/review";
import type { BuildProgressEvent, RunRequest, RunResult, SandboxSetupRequest, SyntaxCheckRequest, SyntaxCheckResult } from "./types/run";
import type { Settings, SettingsPatch } from "./types/settings";

/**
 * Every request the renderer can send to the main process. Each method is one `ipcRenderer.invoke` channel.
 * A call resolves with the answer or rejects with an `AppError` (check with `isAppError`); it never rejects with anything else.
 */
export interface DojoInvokeApi
{
	// App

	/** Returns the app version from package.json, used by the frame's footer and by the smoke test. */
	getAppVersion(): Promise<string>;

	// Settings (app-shell)

	/** Returns the stored settings. The API key itself is never returned, only `hasApiKey`. */
	getSettings(): Promise<Settings>;

	/** Changes some settings and returns all of them after the change. */
	updateSettings(patch: SettingsPatch): Promise<Settings>;

	/** Stores the learner's Anthropic API key through safeStorage. */
	setApiKey(apiKey: string): Promise<void>;

	/** Deletes the stored API key. */
	clearApiKey(): Promise<void>;

	// Engine and first run (unreal-pipeline, app-shell)

	/** Lists Unreal installs found in the default folders and, on Windows, the registry. */
	detectEngines(): Promise<EngineInstall[]>;

	/** Opens a folder picker for a manual engine pick and reads its version. Resolves null when the learner cancels. */
	pickEngineFolder(): Promise<EngineInstall | null>;

	/** Checks the platform build toolchain (vswhere on Windows, xcode-select on macOS). */
	checkToolchain(): Promise<ToolchainCheck>;

	/** Returns engine, sandbox, review provider, loop mode, and editor connection in one answer, for the Title chips. */
	getEnvironmentStatus(): Promise<EnvironmentStatus>;

	/** Marks first-run setup as finished and returns the settings with `firstRunCompletedAt` set. */
	completeFirstRun(): Promise<Settings>;

	// Sandbox (unreal-pipeline)

	/** Opens a folder picker for the sandbox and returns the choice with any warnings. Resolves null when the learner cancels. */
	pickSandboxFolder(): Promise<SandboxFolderChoice | null>;

	/** Copies the sandbox template, writes EngineAssociation, and runs the first full build. Streams progress under `request.runId`. */
	createSandbox(request: SandboxSetupRequest): Promise<SandboxSetupResult>;

	/** Runs a clean full build of the existing sandbox (Settings "rebuild sandbox"). Streams progress under `runId`. */
	rebuildSandbox(runId: string): Promise<SandboxSetupResult>;

	/** Opens the Unreal editor on the sandbox project, with the MCP server on 5.8+. With a quest id it opens that quest's map for "See it run". */
	openEditor(questId: string | null): Promise<void>;

	// Runs (unreal-pipeline, then ai-review and progress-and-rules for Submit)

	/** Builds and tests the learner's files. Free; never counts against the spree. Streams progress under `request.runId`. */
	runQuest(request: RunRequest): Promise<RunResult>;

	/** Builds, tests, reviews, and records the attempt. Streams progress under `request.runId`. */
	submitQuest(request: RunRequest): Promise<SubmitOutcome>;

	/** Syntax-checks a concept quest's scratch buffer example with the platform compiler, without building the sandbox. */
	checkSnippetSyntax(request: SyntaxCheckRequest): Promise<SyntaxCheckResult>;

	/** Cancels a running build, test, or sandbox setup and kills its process tree. The cancelled call rejects with `run-cancelled`. */
	cancelRun(runId: string): Promise<void>;

	// Progress and rules (progress-and-rules)

	/** Returns the whole save file. */
	getProgress(): Promise<PlayerProgress>;

	/** Returns the rule constants the UI shows, so the renderer never duplicates rules.ts. */
	getRules(): Promise<RulesSnapshot>;

	/** Returns availability of every quest by quest id, with locked reasons, for the World Map. */
	getQuestAvailability(): Promise<Record<string, QuestAvailability>>;

	/** Returns test-out eligibility of every world by world id, for the World Map's test-out button. */
	getTestOutStatus(): Promise<Record<string, WorldTestOutStatus>>;

	/** Sets the learner's display name. */
	setPlayerName(playerName: string): Promise<PlayerProgress>;

	/** Autosaves a quest in progress (files, breakdown board, or worked-level self-explanations). */
	saveQuestDraft(draft: QuestDraft): Promise<void>;

	/** Clears a quest's saved files and board and removes its files from the sandbox. */
	resetQuest(questId: string): Promise<QuestProgress>;

	/** Reveals the next hint spell for a quest and returns its text and XP cost. */
	revealHint(questId: string): Promise<HintReveal>;

	/** Grades a finished concept quest and records it. */
	submitConcept(submission: ConceptSubmission): Promise<ConceptOutcome>;

	/** Takes the first breakdown plan and answers which reference plan to show beside it. Not graded yet. */
	submitBreakdown(submission: BreakdownSubmission): Promise<BreakdownReferenceChoice>;

	/** Grades the revised breakdown plan with its revision note and records it. */
	reviseBreakdown(revision: BreakdownRevision): Promise<BreakdownOutcome>;

	/** Counts one hover on a glossary term; three or more hovers on an unpassed term push it into the next drill. */
	recordTermHover(termId: string): Promise<void>;

	/** Adds an item (glossary term or pattern card) to the next drill ("Drill me"). */
	queueDrillItem(itemId: string): Promise<void>;

	/** Returns today's daily quest, creating today's three offers on the first call of the day. */
	getDailyQuest(): Promise<DailyQuestState>;

	/** Chooses one of today's three daily offers by index. */
	chooseDailyOffer(offerIndex: number): Promise<DailyQuestState>;

	/** Deletes all progress and returns the fresh save. The renderer asks for confirmation first. */
	resetProgress(): Promise<PlayerProgress>;

	// Content (content-engine, loaded once at startup by app-shell)

	/** Returns how the content load went: counts and every problem found. Rejects with `content-invalid` only when nothing could be read. */
	getContentStatus(): Promise<ContentStatus>;

	/** Returns every pack with its worlds and quest outlines, in order: the whole World Map in one answer. */
	listPacks(): Promise<PackOutline[]>;

	/** Returns one world with its full quests (hint texts left out). Rejects with `world-not-found` for an unknown id. */
	getWorld(worldId: string): Promise<LearnerWorld>;

	/** Returns one full quest (hint texts left out). Rejects with `quest-not-found` for an unknown id. */
	getQuest(questId: string): Promise<LearnerQuest>;

	/** Returns every glossary entry, for the Codex and the hover cards. */
	getGlossary(): Promise<GlossaryEntry[]>;

	/** Returns the flat alias table (every term and alias, longest first) for Monaco's hover and completion and for the TermLinker. */
	getGlossaryAliases(): Promise<GlossaryAlias[]>;

	/** Returns every pattern card, for the Character screen and pattern chips. */
	getPatternCards(): Promise<PatternCard[]>;

	// Drills (progress-and-rules)

	/** Starts a drill session: today's due items, a world's test-out, or the one-item Parsons fallback for a quest. */
	startDrill(request: DrillRequest): Promise<DrillSession>;

	/** Returns due counts for the Studio home. */
	getDrillSummary(): Promise<DrillSummary>;

	/** Grades one drill item (explain items through the AI grader, free) and reschedules it. */
	answerDrillItem(answer: DrillAnswer): Promise<DrillItemResult>;

	/** Ends a drill session, grants the drill XP, and keeps the streak. */
	finishDrill(sessionId: string): Promise<DrillOutcome>;

	// AI review (ai-review)

	/** Returns every review provider and whether it is available now. */
	getReviewProviders(): Promise<ReviewProviderStatus[]>;

	/** Runs one tiny request through Claude Code (Settings "test Claude Code") and reports the result. */
	testClaudeCode(): Promise<ReviewProviderStatus>;

	/** Explains in plain English why a review finding is a finding. Free and cached. */
	explainFinding(request: FindingExplanationRequest): Promise<string>;

	/** Grades the learner's one-sentence answer to a review's reflection question. Free. */
	answerReflection(request: ReflectionAnswerRequest): Promise<ExplainGrade>;
}

/** Stops a subscription started by `onBuildProgress`. */
export type Unsubscribe = () => void;

/** Everything the renderer can reach as `window.dojo`: the request methods plus the build progress subscription. */
export interface DojoApi extends DojoInvokeApi
{
	/** Calls `listener` for every progress event of every long operation. Filter by `event.runId`. Returns the unsubscribe function. */
	onBuildProgress(listener: (event: BuildProgressEvent) => void): Unsubscribe;
}

/** The name of a DojoInvokeApi method. */
export type DojoMethod = keyof DojoInvokeApi;

/** Channel name of every DojoInvokeApi method. The type forces each channel to be `dojo:` plus its method name, so the two can never drift apart. */
export const IPC_CHANNELS = {
	getAppVersion: "dojo:getAppVersion",
	getSettings: "dojo:getSettings",
	updateSettings: "dojo:updateSettings",
	setApiKey: "dojo:setApiKey",
	clearApiKey: "dojo:clearApiKey",
	detectEngines: "dojo:detectEngines",
	pickEngineFolder: "dojo:pickEngineFolder",
	checkToolchain: "dojo:checkToolchain",
	getEnvironmentStatus: "dojo:getEnvironmentStatus",
	completeFirstRun: "dojo:completeFirstRun",
	pickSandboxFolder: "dojo:pickSandboxFolder",
	createSandbox: "dojo:createSandbox",
	rebuildSandbox: "dojo:rebuildSandbox",
	openEditor: "dojo:openEditor",
	runQuest: "dojo:runQuest",
	submitQuest: "dojo:submitQuest",
	checkSnippetSyntax: "dojo:checkSnippetSyntax",
	cancelRun: "dojo:cancelRun",
	getProgress: "dojo:getProgress",
	getRules: "dojo:getRules",
	getQuestAvailability: "dojo:getQuestAvailability",
	getTestOutStatus: "dojo:getTestOutStatus",
	setPlayerName: "dojo:setPlayerName",
	saveQuestDraft: "dojo:saveQuestDraft",
	resetQuest: "dojo:resetQuest",
	revealHint: "dojo:revealHint",
	submitConcept: "dojo:submitConcept",
	submitBreakdown: "dojo:submitBreakdown",
	reviseBreakdown: "dojo:reviseBreakdown",
	recordTermHover: "dojo:recordTermHover",
	queueDrillItem: "dojo:queueDrillItem",
	getDailyQuest: "dojo:getDailyQuest",
	chooseDailyOffer: "dojo:chooseDailyOffer",
	resetProgress: "dojo:resetProgress",
	getContentStatus: "dojo:getContentStatus",
	listPacks: "dojo:listPacks",
	getWorld: "dojo:getWorld",
	getQuest: "dojo:getQuest",
	getGlossary: "dojo:getGlossary",
	getGlossaryAliases: "dojo:getGlossaryAliases",
	getPatternCards: "dojo:getPatternCards",
	startDrill: "dojo:startDrill",
	getDrillSummary: "dojo:getDrillSummary",
	answerDrillItem: "dojo:answerDrillItem",
	finishDrill: "dojo:finishDrill",
	getReviewProviders: "dojo:getReviewProviders",
	testClaudeCode: "dojo:testClaudeCode",
	explainFinding: "dojo:explainFinding",
	answerReflection: "dojo:answerReflection",
} as const satisfies { [Method in DojoMethod]: `dojo:${Method}` };

/** Every DojoInvokeApi method name, in declaration order. */
export const DOJO_METHODS = Object.keys(IPC_CHANNELS) as DojoMethod[];

/** The one channel main uses to push `BuildProgressEvent`s to the renderer. Not an invoke channel. */
export const BUILD_PROGRESS_CHANNEL = "dojo:event:buildProgress";

/** What a main-process handler sends back over IPC. The preload unwraps it: `ok` resolves the call, otherwise it rejects with the AppError. */
export type IpcResponse<Value> = { ok: true; value: Value } | { ok: false; error: AppError };
