// An in-memory DojoClient with realistic answers, used by the e2e tests and by `npm run dev` with the fake flag (A240).
// It mirrors the IPC contract exactly; services that are not built yet are what it stands in for.
import type { Unsubscribe } from "@shared/ipc";
import type { ContentStatus, GlossaryAlias, LearnerQuest, LearnerWorld, PackOutline } from "@shared/types/catalog";
import type { GlossaryEntry, PatternCard } from "@shared/types/content";
import type { DrillRequest, DrillSession } from "@shared/types/drill";
import type { EngineInstall, EnvironmentStatus, SandboxFolderChoice, SandboxSetupResult, ToolchainCheck } from "@shared/types/engine";
import type { AppError } from "@shared/types/errors";
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
	SolutionViewing,
	SubmitOutcome,
	WorldTestOutStatus,
} from "@shared/types/progress";
import { worldKeyOf } from "@shared/types/progress";
import type { CodeReview, ExplainGrade, FindingExplanationRequest, QuestAlternative, ReflectionAnswerRequest, ReviewProviderStatus } from "@shared/types/review";
import type { BuildProgressEvent, RunAnswer, RunRequest, RunResult, RunStatus, SandboxSetupRequest, SyntaxCheckRequest, SyntaxCheckResult } from "@shared/types/run";
import type { Settings, SettingsPatch } from "@shared/types/settings";

import glossaryJson from "../../../../../content/glossary.json";
import patternsJson from "../../../../../content/patterns.json";
import type { FakeScenario } from "../dataSourceChoice";
import type { DojoClient } from "../DojoClient";
import { toAppError } from "../toAppError";
import { daysFromNow } from "./fixtures/fakeClock";
import {
	blockedSandboxFolderFixture,
	enginesFixture,
	folderNotEmptyFixture,
	manualEngineFixture,
	missingEngineFixture,
	missingSandboxFixture,
	missingToolchainFixture,
	saveNoticeFixture,
	reviewProvidersFixture,
	sandboxFolderFixture,
	sandboxPathIn,
	sandboxSetupFailureFixture,
	toolchainFixture,
} from "./fixtures/machineFixture";
import { FakeQuestFlow } from "./FakeQuestFlow";
import { economyProgressFixture } from "./fixtures/economyFixture";
import { WORLD_ONE, WORLD_ONE_PACK_ID, worldOneQuest } from "./fixtures/fakeQuests";
import { MAP_FIXTURE, type PackFixture } from "./fixtures/mapFixture";
import { freshProgressFixture, returningProgressFixture } from "./fixtures/progressFixture";
import { questFlowMapFixture, questFlowProgressFixture } from "./fixtures/questFlowFixture";
import { buildQuestOutline } from "./fixtures/questFactory";
import { rulesFixture } from "./fixtures/rulesFixture";
import { FAILED_BUILD_OUTPUT, SandboxBuildSimulator } from "./SandboxBuildSimulator";

/** The real glossary, typed. */
const GLOSSARY = glossaryJson as unknown as GlossaryEntry[];

/** The real pattern cards, typed. */
const PATTERN_CARDS = patternsJson as unknown as PatternCard[];

/** How many events a quiet build sends before it goes silent: the three setup steps, as in the tester's hang. It sends none after, even once it goes on. */
const QUIET_BUILD_FORWARDED_EVENTS = 3;

/** How long a quiet build stays silent but alive after its setup steps, like UBT waiting for another build's mutex. */
const QUIET_BUILD_STALL_MS = 32_000;

/** How long every fake answer takes, so loading states are real but short. */
const LATENCY_MS = 60;

/** Waits the fake latency, then answers. Copies the value so callers can never edit the fake's state. */
function answer<Value>(value: Value): Promise<Value>
{
	return new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), LATENCY_MS));
}

/** Waits the fake latency, then answers what `compute` returns, or rejects with the AppError it throws. */
function answerFrom<Value>(compute: () => Value): Promise<Value>
{
	return new Promise((resolve, reject) => setTimeout(() =>
	{
		try
		{
			resolve(structuredClone(compute()));
		}
		catch (thrown)
		{
			reject(thrown);
		}
	}, LATENCY_MS));
}

/** The fake's whole mutable state. */
interface FakeState
{
	settings: Settings;
	progress: PlayerProgress;
	editorConnected: boolean;
	failNextBuild: boolean;

	/** True when the next sandbox build should go quiet: progress stops after setup and the call never answers, though the build finishes (A821). */
	quietNextBuild: boolean;

	/** True when the next failed sandbox build carries the AppError from the main process (M5.1a) instead of leaving the screen to guess from the compiler output. */
	explainNextBuildFailure: boolean;

	/** True when the next sandbox folder pick answers with a blocker: the folder sits inside the engine folder. */
	blockNextFolder: boolean;

	/** Sandbox folders that hold a copy of the template, so a second create there is refused as main refuses it (the one in settings, unless it is gone). */
	copiedSandboxes: string[];

	/** True while the sandbox folder in settings no longer holds the project (`sandbox-deleted`): the environment says not ready and a rebuild is refused, until a new sandbox is created. */
	sandboxGone: boolean;

	/** The packs, worlds, and stages this scenario's map shows. */
	map: PackFixture[];
}

/** Builds the starting state for a scenario. */
function initialState(scenario: FakeScenario): FakeState
{
	const isFresh = scenario === "fresh" || scenario === "first-build-fails" || scenario === "first-build-goes-quiet" || scenario === "sandbox-setup-fails" || scenario === "folder-blocked";
	const engine = enginesFixture()[0] as EngineInstall;

	return {
		settings: {
			enginePath: isFresh ? null : engine.path,
			sandboxPath: isFresh ? null : sandboxPathIn(sandboxFolderFixture().path),
			loopMode: "auto",
			reviewProvider: "auto",
			modelId: "claude-sonnet-5-5",
			theme: "dark",
			mcpPort: 8000,
			hasApiKey: false,
			firstRunCompletedAt: isFresh ? null : daysFromNow(-32),
		},
		progress: isFresh ? freshProgressFixture() : scenario === "quests" ? questFlowProgressFixture() : scenario === "economy" ? economyProgressFixture() : returningProgressFixture(),
		editorConnected: false,
		failNextBuild: scenario === "first-build-fails" || scenario === "sandbox-setup-fails",
		quietNextBuild: scenario === "first-build-goes-quiet",
		explainNextBuildFailure: scenario === "sandbox-setup-fails",
		blockNextFolder: scenario === "folder-blocked",
		sandboxGone: scenario === "sandbox-deleted",
		copiedSandboxes: isFresh || scenario === "sandbox-deleted" ? [] : [sandboxPathIn(sandboxFolderFixture().path)],
		map: scenario === "quests" || scenario === "economy" ? questFlowMapFixture() : MAP_FIXTURE,
	};
}

/** A typed, in-memory stand-in for `window.dojo` plus the content methods. */
export class FakeDojoApi implements DojoClient
{
	private readonly state: FakeState;
	private readonly listeners = new Set<(event: BuildProgressEvent) => void>();
	private readonly builds = new Map<string, SandboxBuildSimulator>();
	private readonly runStatuses = new Map<string, RunStatus>();
	private readonly quests: FakeQuestFlow;

	/** True once checkToolchain ran in the toolchain-recovers scenario; the environment then reports a working toolchain. */
	private toolchainRechecked = false;

	/** Starts the fake in one scenario's state; the state lives until the page reloads. */
	constructor(private readonly scenario: FakeScenario)
	{
		this.state = initialState(scenario);
		this.quests = new FakeQuestFlow({
			progress: () => this.state.progress,
			settings: () => this.state.settings,
			rules: rulesFixture,
			patternCards: () => PATTERN_CARDS,
			emit: (event) => this.emit(event),
			outline: (questId) => this.outlines().find((outline) => outline.id === questId),
			worldOutline: (worldId) => this.worldOutlines().find((world) => world.id === worldId),
			openQuestIds: () => new Set(Object.entries(this.availability()).filter(([, availability]) => availability.status !== "locked").map(([questId]) => questId)),
		});
	}

	// App

	/** The app version the fake reports. */
	getAppVersion(): Promise<string>
	{
		return answer("0.1.0");
	}

	// Settings

	/** The stored settings. */
	getSettings(): Promise<Settings>
	{
		return answer(this.state.settings);
	}

	/** Applies a settings patch. */
	updateSettings(patch: SettingsPatch): Promise<Settings>
	{
		this.state.settings = { ...this.state.settings, ...patch };

		return answer(this.state.settings);
	}

	/** Marks an API key as stored; the key itself is dropped, as safeStorage would keep it out of reach. */
	setApiKey(apiKey: string): Promise<void>
	{
		if (apiKey.trim().length < 8)
		{
			return Promise.reject<void>({ code: "invalid-payload", message: "That does not look like an API key.", suggestedAction: "Paste the whole key from the Anthropic console." } satisfies AppError);
		}

		this.state.settings = { ...this.state.settings, hasApiKey: true };

		return answer(undefined);
	}

	/** Forgets the stored API key. */
	clearApiKey(): Promise<void>
	{
		this.state.settings = { ...this.state.settings, hasApiKey: false };

		return answer(undefined);
	}

	// Engine and first run

	/** The detected installs. In the engine-missing scenario the install in settings is not among them while it is gone. */
	detectEngines(): Promise<EngineInstall[]>
	{
		return answer(enginesFixture().filter((engine) => !(this.isEngineGone() && engine.path === this.state.settings.enginePath)));
	}

	/** A manual pick of a 5.7 install. */
	pickEngineFolder(): Promise<EngineInstall | null>
	{
		return answer(manualEngineFixture());
	}

	/** A working toolchain; in the toolchain-missing scenario one whose C++ pieces stay missing; in toolchain-recovers the first check finds them fixed, as for a learner who installed them. */
	checkToolchain(): Promise<ToolchainCheck>
	{
		if (this.scenario === "toolchain-recovers") this.toolchainRechecked = true;

		return answer(this.scenario === "toolchain-missing" ? missingToolchainFixture() : toolchainFixture());
	}

	/** Environment chips derived from the current settings. */
	getEnvironmentStatus(): Promise<EnvironmentStatus>
	{
		return answer(this.environment());
	}

	/** Finishes first run. */
	completeFirstRun(): Promise<Settings>
	{
		this.state.settings = { ...this.state.settings, firstRunCompletedAt: new Date().toISOString() };

		return answer(this.state.settings);
	}

	// Sandbox

	/** The sandbox folder picker's answer. In the folder-blocked scenario the first pick sits inside the engine folder and carries a blocker; the next pick is fine. */
	pickSandboxFolder(): Promise<SandboxFolderChoice | null>
	{
		if (this.state.blockNextFolder)
		{
			this.state.blockNextFolder = false;

			return answer(blockedSandboxFolderFixture((enginesFixture()[0] as EngineInstall).path));
		}

		return answer(sandboxFolderFixture());
	}

	/**
	 * Simulates copying the template and the first full build. As the sandbox service does, it refuses a folder that already holds a copy
	 * (a sandbox made earlier, or one whose build failed or was cancelled) and remembers the new sandbox before building, which also replaces
	 * a deleted one. Fails once in the first-build-fails scenario.
	 */
	async createSandbox(request: SandboxSetupRequest): Promise<SandboxSetupResult>
	{
		const engine = [...enginesFixture(), manualEngineFixture()].find((candidate) => candidate.path === request.enginePath);
		const sandboxPath = sandboxPathIn(request.folder);

		if (this.state.copiedSandboxes.includes(sandboxPath)) return Promise.reject<SandboxSetupResult>(folderNotEmptyFixture(sandboxPath));

		this.state.copiedSandboxes.push(sandboxPath);
		this.state.settings = { ...this.state.settings, sandboxPath };
		this.state.sandboxGone = false;

		const shouldFail = this.state.failNextBuild;
		const goesQuiet = this.state.quietNextBuild;
		const failure = shouldFail && this.state.explainNextBuildFailure ? sandboxSetupFailureFixture() : undefined;

		this.state.failNextBuild = false;
		this.state.quietNextBuild = false;
		this.state.explainNextBuildFailure = false;

		const result = await this.rememberAnswer(request.runId, async () =>
		{
			const end = await this.simulateBuild(request.runId, engine?.version ?? "5.8.3", shouldFail, goesQuiet);

			if (end.ok) return { ok: true, sandboxPath, durationMs: end.durationMs, compilerOutput: "" };

			return { ok: false, sandboxPath, durationMs: end.durationMs, compilerOutput: failure?.detail ?? FAILED_BUILD_OUTPUT, ...(failure ? { failure } : {}) };
		});

		// The hang the tester saw once: the build finished, but its answer never reached the window. Only getRunStatus can tell.
		if (goesQuiet) return new Promise<SandboxSetupResult>(() => undefined);

		return result;
	}

	/** Simulates a clean rebuild of the existing sandbox. A sandbox that is gone is refused the way main's preflight refuses it. */
	async rebuildSandbox(runId: string): Promise<SandboxSetupResult>
	{
		const sandboxPath = this.state.settings.sandboxPath;

		if (sandboxPath && this.state.sandboxGone) return Promise.reject<SandboxSetupResult>(missingSandboxFixture(sandboxPath));

		if (!sandboxPath)
		{
			return Promise.reject<SandboxSetupResult>({ code: "sandbox-not-ready", message: "There is no sandbox to rebuild yet.", suggestedAction: "Use Set up the sandbox again to create it." } satisfies AppError);
		}

		return this.rememberAnswer(runId, async () =>
		{
			const end = await this.simulateBuild(runId, "5.8.3", false);

			return { ok: true, sandboxPath, durationMs: end.durationMs, compilerOutput: "" };
		});
	}

	/** Pretends the editor opened and its MCP server answers. */
	openEditor(_questId: string | null): Promise<void>
	{
		this.state.editorConnected = true;

		return answer(undefined);
	}

	// Runs

	/** Simulates a free Run with progress events and the fake engine's verdict. */
	runQuest(request: RunRequest): Promise<RunResult>
	{
		return this.quests.runQuest(request).then(answer);
	}

	/** Simulates a Submit: run, review, recorded attempt, loot. */
	submitQuest(request: RunRequest): Promise<SubmitOutcome>
	{
		return this.quests.submitQuest(request).then(answer);
	}

	/** Checks a scratch buffer's brackets. */
	checkSnippetSyntax(request: SyntaxCheckRequest): Promise<SyntaxCheckResult>
	{
		return answerFrom(() => this.quests.checkSnippetSyntax(request));
	}

	/** Where a simulated build stands, as main's run registry would say. Quest runs are not tracked here and read as unknown. */
	getRunStatus(runId: string): Promise<RunStatus>
	{
		const status: RunStatus = this.runStatuses.get(runId) ?? { runId, state: "unknown", lastEvent: null, eventCount: 0, answer: null };

		return answer(status);
	}

	/** Cancels a simulated sandbox build or quest run. */
	cancelRun(runId: string): Promise<void>
	{
		this.builds.get(runId)?.cancel();
		this.builds.delete(runId);
		this.quests.cancel(runId);

		return answer(undefined);
	}

	// Progress and rules

	/** The save file. */
	getProgress(): Promise<PlayerProgress>
	{
		return answer(this.state.progress);
	}

	/** The rule constants. */
	getRules(): Promise<RulesSnapshot>
	{
		return answer(rulesFixture());
	}

	/** Availability by quest id: the fixture's states for a returning learner, the start of the map for a fresh one. */
	getQuestAvailability(): Promise<Record<string, QuestAvailability>>
	{
		return answer(this.availability());
	}

	/** Test-out eligibility by world key (`<packId>/<worldId>`, A700), with each reason taken from the world's standing in this scenario. */
	getTestOutStatus(): Promise<Record<string, WorldTestOutStatus>>
	{
		const isFresh = Object.keys(this.state.progress.quests).length === 0;
		const availability = this.availability();
		const statuses: Record<string, WorldTestOutStatus> = {};

		// The reason follows the world's real standing in this scenario: all passed, or terms still short of proficient.
		for (const pack of this.state.map)
		{
			for (const world of pack.worlds)
			{
				const worldKey = worldKeyOf(pack.id, world.id);
				const testedOut = this.state.progress.testedOutWorldIds.includes(worldKey);
				const allPassed = world.stages.every((stage) => availability[stage.id]?.status === "passed");

				statuses[worldKey] = { eligible: false, testedOut, reason: allPassed ? "Every quest here is passed already." : "Some terms in this world are not proficient yet." };
			}
		}

		if (!isFresh) statuses[worldKeyOf("foundations", "foundations.memory")] = { eligible: true, testedOut: false };

		// The economy scenario's World 1 is ready to test out (A1399); once tested out it stays so.
		const worldOneKey = worldKeyOf(WORLD_ONE_PACK_ID, WORLD_ONE.id);
		if (this.scenario === "economy") statuses[worldOneKey] = this.state.progress.testedOutWorldIds.includes(worldOneKey) ? { eligible: true, testedOut: true } : { eligible: true, testedOut: false };

		return answer(statuses);
	}

	/** Renames the learner. */
	setPlayerName(playerName: string): Promise<PlayerProgress>
	{
		this.state.progress = { ...this.state.progress, playerName: playerName.trim() };

		return answer(this.state.progress);
	}

	/** Autosaves a quest in progress. */
	saveQuestDraft(draft: QuestDraft): Promise<void>
	{
		return answerFrom(() => this.quests.saveDraft(draft));
	}

	/** Clears a quest's saved work. */
	resetQuest(questId: string): Promise<QuestProgress>
	{
		return answerFrom(() => this.quests.reset(questId));
	}

	/** Reveals the next hint spell, or answers an already revealed one again for free (A501). */
	revealHint(questId: string, hintIndex?: number): Promise<HintReveal>
	{
		return answerFrom(() => this.quests.revealHint(questId, hintIndex));
	}

	/** Views a quest's reference solution: a Seer Stone or the quest's XP, as the progress service prices it (A1390, A1391). */
	viewSolution(questId: string, useSeerStone: boolean): Promise<SolutionViewing>
	{
		return answerFrom(() => this.quests.viewSolution(questId, useSeerStone));
	}

	/** Grades a finished concept quest. */
	submitConcept(submission: ConceptSubmission): Promise<ConceptOutcome>
	{
		return answerFrom(() => this.quests.submitConcept(submission));
	}

	/** Takes the first breakdown plan and picks the reference plan to show. */
	submitBreakdown(submission: BreakdownSubmission): Promise<BreakdownReferenceChoice>
	{
		return answerFrom(() => this.quests.submitBreakdown(submission));
	}

	/** Grades the revised breakdown plan. */
	reviseBreakdown(revision: BreakdownRevision): Promise<BreakdownOutcome>
	{
		return answerFrom(() => this.quests.reviseBreakdown(revision));
	}

	/** Counts a hover on a term. */
	recordTermHover(termId: string): Promise<void>
	{
		const hoverCounts = { ...this.state.progress.hoverCounts, [termId]: (this.state.progress.hoverCounts[termId] ?? 0) + 1 };
		this.state.progress = { ...this.state.progress, hoverCounts };

		return answer(undefined);
	}

	/** Schedules an item for the next drill by making it due now. */
	queueDrillItem(itemId: string): Promise<void>
	{
		this.state.progress = { ...this.state.progress, schedule: { ...this.state.progress.schedule, [itemId]: new Date().toISOString() } };

		return answer(undefined);
	}

	/** Today's daily quest. */
	getDailyQuest(): Promise<DailyQuestState>
	{
		return answer(this.state.progress.daily);
	}

	/** Chooses one of today's offers. */
	chooseDailyOffer(offerIndex: number): Promise<DailyQuestState>
	{
		this.state.progress = { ...this.state.progress, daily: { ...this.state.progress.daily, chosen: offerIndex } };

		return answer(this.state.progress.daily);
	}

	/** Wipes progress but keeps settings. */
	resetProgress(): Promise<PlayerProgress>
	{
		this.state.progress = { ...freshProgressFixture(), playerName: this.state.progress.playerName };

		return answer(this.state.progress);
	}

	// Drills

	/** Due counts from the schedule. */
	getDrillSummary(): Promise<DrillSummary>
	{
		const endOfToday = new Date();
		endOfToday.setHours(23, 59, 59, 999);

		const dueTimes = Object.values(this.state.progress.schedule).sort();
		const dueToday = dueTimes.filter((dueAt) => new Date(dueAt) <= endOfToday).length;
		const nextDueAt = dueTimes.find((dueAt) => new Date(dueAt) > new Date()) ?? null;

		return answer({ dueToday: dueToday + (dueToday > 0 ? 5 : 0), overflow: 0, nextDueAt });
	}

	/** Grades one drill item. */
	answerDrillItem(answer: DrillAnswer): Promise<DrillItemResult>
	{
		return answerFrom(() => this.quests.answerDrillItem(answer));
	}

	/** Ends a drill session. */
	finishDrill(sessionId: string): Promise<DrillOutcome>
	{
		return answerFrom(() => this.quests.finishDrill(sessionId));
	}

	// AI review

	/** The three providers. */
	getReviewProviders(): Promise<ReviewProviderStatus[]>
	{
		return answer(reviewProvidersFixture(this.state.settings.hasApiKey));
	}

	/** A successful Claude Code test, after a pause like a real request. */
	testClaudeCode(): Promise<ReviewProviderStatus>
	{
		return new Promise((resolve) => setTimeout(() => resolve({ id: "claude-code", available: true, version: "2.4.1" }), 900));
	}

	/** Explains why a review finding is a finding. */
	explainFinding(request: FindingExplanationRequest): Promise<string>
	{
		return answerFrom(() => this.quests.explainFinding(request));
	}

	/** Grades the answer to a review's reflection question. */
	answerReflection(request: ReflectionAnswerRequest): Promise<ExplainGrade>
	{
		return answerFrom(() => this.quests.answerReflection(request));
	}

	/** Reviews a recorded Submit again without a new run. */
	retryReview(attemptId: string): Promise<CodeReview>
	{
		return answerFrom(() => this.quests.retryReview(attemptId));
	}

	/** A passed quest's alternative, locked before a pass. */
	getQuestAlternative(questId: string): Promise<QuestAlternative | null>
	{
		return answerFrom(() => this.quests.getQuestAlternative(questId));
	}

	// Progress events

	/** Adds a progress listener. */
	onBuildProgress(listener: (event: BuildProgressEvent) => void): Unsubscribe
	{
		this.listeners.add(listener);

		return () => void this.listeners.delete(listener);
	}

	/** The fake only ever runs unpackaged; the real bridge answers this from main. */
	isPackaged(): boolean
	{
		return false;
	}

	// Content

	/** Counts of what the fake serves. */
	getContentStatus(): Promise<ContentStatus>
	{
		const questCount = this.state.map.flatMap((pack) => pack.worlds.flatMap((world) => world.stages)).length;

		return answer({ root: "fake", packCount: this.state.map.length, questCount, glossaryCount: GLOSSARY.length, patternCount: PATTERN_CARDS.length, problems: [] });
	}

	/** The scenario's map as outlines. */
	listPacks(): Promise<PackOutline[]>
	{
		return answer(this.packOutlines());
	}

	/** A full world: the real World 1, or stand-ins for an invented world. */
	getWorld(worldId: string): Promise<LearnerWorld>
	{
		return answerFrom(() => this.quests.world(worldId));
	}

	/** A full quest: real World 1 content, or a stand-in of the same kind for an invented stage. */
	getQuest(questId: string): Promise<LearnerQuest>
	{
		return answerFrom(() => this.quests.quest(questId));
	}

	/** The real glossary from `content/glossary.json`. */
	getGlossary(): Promise<GlossaryEntry[]>
	{
		return answer(GLOSSARY);
	}

	/** Every term and alias of the real glossary, longest first. */
	getGlossaryAliases(): Promise<GlossaryAlias[]>
	{
		const aliases = GLOSSARY.flatMap((entry) => [entry.term, ...entry.aliases].map((text) => ({
			text,
			entryId: entry.id,
			caseSensitive: /[A-Z]/.test(text.slice(1)) || text === text.toUpperCase(),
			codeOnly: entry.linkMode === "code-only",
			short: entry.short,
		})));

		return answer(aliases.sort((first, second) => second.text.length - first.text.length));
	}

	/** The real pattern cards from `content/patterns.json`. */
	getPatternCards(): Promise<PatternCard[]>
	{
		// The screen-crash scenario hands every screen that reads the cards a broken list (Character, Drill, Loot, concept quests), so rendering it throws and the screen error view shows (M5.1i). Title, Studio and Settings do not read the cards.
		if (this.scenario === "screen-crash") return answer([null] as unknown as PatternCard[]);

		return answer(PATTERN_CARDS);
	}

	/** Starts a drill session from real World 1 questions, pattern cards, and a Parsons block. */
	startDrill(request: DrillRequest): Promise<DrillSession>
	{
		return answerFrom(() => this.quests.startDrill(request));
	}

	// Helpers

	/** Sends a progress event to every listener. */
	private emit(event: BuildProgressEvent): void
	{
		for (const listener of this.listeners) listener(event);
	}

	/** The map as pack outlines, as `listPacks` answers. */
	private packOutlines(): PackOutline[]
	{
		return this.state.map.map((pack, packIndex) => ({
			id: pack.id,
			title: pack.title,
			summary: pack.summary,
			order: packIndex + 1,
			worlds: pack.worlds.map((world, worldIndex) => ({
				id: world.id,
				title: world.title,
				summary: world.summary,
				order: worldIndex + 1,
				quests: world.stages.map((stage, stageIndex) => buildQuestOutline(stage, stageIndex + 1)),
			})),
		}));
	}

	/** Every world outline on the map. */
	private worldOutlines(): PackOutline["worlds"]
	{
		return this.packOutlines().flatMap((pack) => pack.worlds);
	}

	/** Every quest outline on the map. */
	private outlines(): PackOutline["worlds"][number]["quests"]
	{
		return this.worldOutlines().flatMap((world) => world.quests);
	}

	/** Environment status from the current settings. */
	private environment(): EnvironmentStatus
	{
		const isGone = this.isEngineGone();
		const toolchain = this.reportedToolchain();
		const engine = isGone ? null : [...enginesFixture(), manualEngineFixture()].find((candidate) => candidate.path === this.state.settings.enginePath) ?? null;
		const providers = reviewProvidersFixture(this.state.settings.hasApiKey);
		const reviewProvider = this.state.settings.reviewProvider === "auto"
			? providers.find((provider) => provider.available && provider.id !== "tests-only") ?? null
			: providers.find((provider) => provider.id === this.state.settings.reviewProvider) ?? null;

		return {
			engine,
			sandbox: { path: this.state.settings.sandboxPath, ready: this.state.settings.sandboxPath !== null && !this.state.sandboxGone },
			reviewProvider,
			loopMode: this.state.settings.loopMode,
			editorConnected: this.state.editorConnected,
			...(isGone && this.state.settings.enginePath ? { engineProblem: missingEngineFixture(this.state.settings.enginePath) } : {}),
			...(toolchain ? { toolchain } : {}),
			...(this.scenario === "save-notice" ? { saveNotice: saveNoticeFixture() } : {}),
		};
	}

	/** The toolchain the environment reports: none in most scenarios, the broken one in toolchain-missing, and in toolchain-recovers the broken one until the first re-check. */
	private reportedToolchain(): ToolchainCheck | null
	{
		if (this.scenario === "toolchain-missing") return missingToolchainFixture();

		if (this.scenario === "toolchain-recovers") return this.toolchainRechecked ? toolchainFixture() : missingToolchainFixture();

		return null;
	}

	/** True in the engine-missing scenario while settings still point at the install that is gone; picking another engine fixes it. */
	private isEngineGone(): boolean
	{
		return this.scenario === "engine-missing" && this.state.settings.enginePath === (enginesFixture()[0] as EngineInstall).path;
	}

	/** Availability for every quest. A quest the learner passed or started here shows that, over the fixture's state; the boss of a world opens once the rest is passed. */
	private availability(): Record<string, QuestAvailability>
	{
		const progress = this.state.progress;
		const isFresh = Object.keys(progress.quests).length === 0;
		const result: Record<string, QuestAvailability> = {};

		for (const pack of this.state.map)
		{
			pack.worlds.forEach((world, worldIndex) =>
			{
				world.stages.forEach((stage, stageIndex) =>
				{
					if (!isFresh)
					{
						const saved = progress.quests[stage.id]?.status;
						const restPassed = world.stages.every((other) => other.id === stage.id || other.status === "passed" || progress.quests[other.id]?.status === "passed");
						const status = saved === "passed" || saved === "in_progress" ? saved : stage.kind === "boss" && stage.status === "locked" && restPassed ? "available" : stage.status;

						result[stage.id] = { status, dueForRematch: stage.dueForRematch ?? false, skippable: this.isSkippable(pack.id, world.id, stage.id), ...(status === "locked" && stage.lockedReason ? { lockedReason: stage.lockedReason } : {}) };
						return;
					}

					const opensFirst = worldIndex === 0 && stageIndex === 0 && (pack.id === "foundations" || pack.id === "patterns");
					const previous = world.stages[stageIndex - 1];
					const lockedReason = previous ? `Pass ${previous.title} first.` : stage.lockedReason ?? `Finish ${pack.worlds[worldIndex - 1]?.title ?? "the world before"} first.`;

					result[stage.id] = opensFirst ? { status: "available", dueForRematch: false, skippable: false } : { status: "locked", lockedReason, dueForRematch: false, skippable: false };
				});
			});
		}

		return result;
	}

	/** True for a worked or faded build of a tested-out world, as the unlock graph says. Only World 1's real quests know their scaffold, so only they can be skipped in the fake. */
	private isSkippable(packId: string, worldId: string, questId: string): boolean
	{
		const quest = worldOneQuest(questId);

		return this.state.progress.testedOutWorldIds.includes(worldKeyOf(packId, worldId)) && quest?.kind === "build" && (quest.scaffold === "worked" || quest.scaffold === "faded");
	}

	/** Runs a build call and remembers how it ended for getRunStatus, as main's trackRun does. */
	private async rememberAnswer<Value>(runId: string, call: () => Promise<Value>): Promise<Value>
	{
		try
		{
			const value = await call();
			this.finishRun(runId, { ok: true, value });
			return value;
		}
		catch (thrown)
		{
			this.finishRun(runId, { ok: false, error: toAppError(thrown) });
			throw thrown;
		}
	}

	/** Marks a run finished with its answer, keeping its last event. */
	private finishRun(runId: string, runAnswer: RunAnswer): void
	{
		const previous = this.runStatuses.get(runId);

		this.runStatuses.set(runId, { runId, state: "finished", lastEvent: previous?.lastEvent ?? null, eventCount: previous?.eventCount ?? 0, answer: runAnswer });
	}

	/** Runs one simulated build, forwarding its events to every listener (a quiet build stops forwarding after the setup steps). */
	private async simulateBuild(runId: string, engineVersion: string, shouldFail: boolean, goesQuiet = false): Promise<{ ok: boolean; durationMs: number }>
	{
		let forwarded = 0;

		let eventCount = 0;

		this.runStatuses.set(runId, { runId, state: "running", lastEvent: null, eventCount, answer: null });

		const simulator = new SandboxBuildSimulator(runId, (event) =>
		{
			eventCount += 1;
			this.runStatuses.set(runId, { runId, state: "running", lastEvent: event, eventCount, answer: null });

			// A quiet build still records every event for getRunStatus but stops sending them after the setup steps.
			if (goesQuiet && forwarded >= QUIET_BUILD_FORWARDED_EVENTS) return;

			forwarded += 1;
			this.emit(event);
		});

		this.builds.set(runId, simulator);

		try
		{
			return await simulator.run(engineVersion, shouldFail, goesQuiet ? { afterSteps: QUIET_BUILD_FORWARDED_EVENTS, milliseconds: QUIET_BUILD_STALL_MS } : null);
		}
		finally
		{
			this.builds.delete(runId);
		}
	}
}
