// An in-memory DojoClient with realistic answers, used by the e2e tests and by `npm run dev` with the fake flag (A240).
// It mirrors the IPC contract exactly; services that are not built yet are what it stands in for.
import type { Unsubscribe } from "@shared/ipc";
import type { ContentStatus, GlossaryAlias, LearnerQuest, LearnerWorld, PackOutline } from "@shared/types/catalog";
import type { GlossaryEntry, PatternCard } from "@shared/types/content";
import type { DrillSession } from "@shared/types/drill";
import type { EngineInstall, EnvironmentStatus, SandboxFolderChoice, SandboxSetupResult, ToolchainCheck } from "@shared/types/engine";
import type { AppError } from "@shared/types/errors";
import type {
	BreakdownOutcome,
	BreakdownReferenceChoice,
	ConceptOutcome,
	DailyQuestState,
	DrillItemResult,
	DrillOutcome,
	DrillSummary,
	HintReveal,
	PlayerProgress,
	QuestAvailability,
	QuestProgress,
	RulesSnapshot,
	SubmitOutcome,
	WorldTestOutStatus,
} from "@shared/types/progress";
import type { ExplainGrade, ReviewProviderStatus } from "@shared/types/review";
import type { BuildProgressEvent, RunResult, SandboxSetupRequest, SyntaxCheckResult } from "@shared/types/run";
import type { Settings, SettingsPatch } from "@shared/types/settings";

import glossaryJson from "../../../../../content/glossary.json";
import patternsJson from "../../../../../content/patterns.json";
import type { FakeScenario } from "../dataSourceChoice";
import type { DojoClient } from "../DojoClient";
import { daysFromNow } from "./fixtures/fakeClock";
import { enginesFixture, manualEngineFixture, reviewProvidersFixture, sandboxFolderFixture, sandboxPathIn, toolchainFixture } from "./fixtures/machineFixture";
import { MAP_FIXTURE } from "./fixtures/mapFixture";
import { freshProgressFixture, returningProgressFixture } from "./fixtures/progressFixture";
import { buildQuestOutline } from "./fixtures/questFactory";
import { rulesFixture } from "./fixtures/rulesFixture";
import { FAILED_BUILD_OUTPUT, SandboxBuildSimulator } from "./SandboxBuildSimulator";

/** The real glossary, typed. */
const GLOSSARY = glossaryJson as unknown as GlossaryEntry[];

/** The real pattern cards, typed. */
const PATTERN_CARDS = patternsJson as unknown as PatternCard[];

/** How long every fake answer takes, so loading states are real but short. */
const LATENCY_MS = 60;

/** Waits the fake latency, then answers. Copies the value so callers can never edit the fake's state. */
function answer<Value>(value: Value): Promise<Value>
{
	return new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), LATENCY_MS));
}

/** The error the fake answers for quest-flow methods the M2.1 screens never call (ui-quests builds those flows). */
function notInFake(method: string): Promise<never>
{
	const error: AppError = {
		code: "not-implemented",
		message: "The fake data source has no answer for this yet.",
		suggestedAction: "Quest flows arrive with the quest screens (M2.2).",
		detail: `FakeDojoApi.${method}`,
	};

	return new Promise((_resolve, reject) => setTimeout(() => reject(error), LATENCY_MS));
}

/** The fake's whole mutable state. */
interface FakeState
{
	settings: Settings;
	progress: PlayerProgress;
	editorConnected: boolean;
	failNextBuild: boolean;
}

/** Builds the starting state for a scenario. */
function initialState(scenario: FakeScenario): FakeState
{
	const isFresh = scenario !== "returning";
	const engine = enginesFixture()[0] as EngineInstall;

	return {
		settings: {
			enginePath: isFresh ? null : engine.path,
			sandboxPath: isFresh ? null : sandboxPathIn(sandboxFolderFixture().path),
			loopMode: "auto",
			reviewProvider: "auto",
			modelId: "claude-sonnet-5-5",
			theme: "dark",
			hasApiKey: false,
			firstRunCompletedAt: isFresh ? null : daysFromNow(-32),
		},
		progress: isFresh ? freshProgressFixture() : returningProgressFixture(),
		editorConnected: false,
		failNextBuild: scenario === "first-build-fails",
	};
}

/** A typed, in-memory stand-in for `window.dojo` plus the content methods. */
export class FakeDojoApi implements DojoClient
{
	private readonly state: FakeState;
	private readonly listeners = new Set<(event: BuildProgressEvent) => void>();
	private readonly builds = new Map<string, SandboxBuildSimulator>();

	/** Starts the fake in one scenario's state; the state lives until the page reloads. */
	constructor(scenario: FakeScenario)
	{
		this.state = initialState(scenario);
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

	/** The detected installs. */
	detectEngines(): Promise<EngineInstall[]>
	{
		return answer(enginesFixture());
	}

	/** A manual pick of a 5.7 install. */
	pickEngineFolder(): Promise<EngineInstall | null>
	{
		return answer(manualEngineFixture());
	}

	/** A working toolchain. */
	checkToolchain(): Promise<ToolchainCheck>
	{
		return answer(toolchainFixture());
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

	/** The sandbox folder picker's answer. */
	pickSandboxFolder(): Promise<SandboxFolderChoice | null>
	{
		return answer(sandboxFolderFixture());
	}

	/** Simulates copying the template and the first full build, then remembers the sandbox path on a pass, as the sandbox service does. Fails once in the first-build-fails scenario. */
	async createSandbox(request: SandboxSetupRequest): Promise<SandboxSetupResult>
	{
		const engine = [...enginesFixture(), manualEngineFixture()].find((candidate) => candidate.path === request.enginePath);
		const sandboxPath = sandboxPathIn(request.folder);
		const shouldFail = this.state.failNextBuild;

		this.state.failNextBuild = false;

		const end = await this.simulateBuild(request.runId, engine?.version ?? "5.8.3", shouldFail);

		if (end.ok) this.state.settings = { ...this.state.settings, sandboxPath };

		return { ok: end.ok, sandboxPath, durationMs: end.durationMs, compilerOutput: end.ok ? "" : FAILED_BUILD_OUTPUT };
	}

	/** Simulates a clean rebuild of the existing sandbox. */
	async rebuildSandbox(runId: string): Promise<SandboxSetupResult>
	{
		const sandboxPath = this.state.settings.sandboxPath;

		if (!sandboxPath)
		{
			return Promise.reject<SandboxSetupResult>({ code: "sandbox-not-ready", message: "There is no sandbox to rebuild yet.", suggestedAction: "Run first-run setup to create it." } satisfies AppError);
		}

		const end = await this.simulateBuild(runId, "5.8.3", false);

		return { ok: true, sandboxPath, durationMs: end.durationMs, compilerOutput: "" };
	}

	/** Pretends the editor opened and its MCP server answers. */
	openEditor(_questId: string | null): Promise<void>
	{
		this.state.editorConnected = true;

		return answer(undefined);
	}

	// Runs (the quest screens' flows; not part of M2.1)

	/** Not answered by the fake yet. */
	runQuest(): Promise<RunResult>
	{
		return notInFake("runQuest");
	}

	/** Not answered by the fake yet. */
	submitQuest(): Promise<SubmitOutcome>
	{
		return notInFake("submitQuest");
	}

	/** Not answered by the fake yet. */
	checkSnippetSyntax(): Promise<SyntaxCheckResult>
	{
		return notInFake("checkSnippetSyntax");
	}

	/** Cancels a simulated build. */
	cancelRun(runId: string): Promise<void>
	{
		this.builds.get(runId)?.cancel();
		this.builds.delete(runId);

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

	/** Test-out eligibility by world id. */
	getTestOutStatus(): Promise<Record<string, WorldTestOutStatus>>
	{
		const isFresh = Object.keys(this.state.progress.quests).length === 0;
		const statuses: Record<string, WorldTestOutStatus> = {};

		for (const world of MAP_FIXTURE.flatMap((pack) => pack.worlds))
		{
			statuses[world.id] = { eligible: false, testedOut: false, reason: "Some terms in this world are not proficient yet." };
		}

		if (!isFresh)
		{
			statuses["objects-and-reflection"] = { eligible: false, testedOut: false, reason: "Every quest here is passed already." };
			statuses["foundations.memory"] = { eligible: true, testedOut: false };
		}

		return answer(statuses);
	}

	/** Renames the learner. */
	setPlayerName(playerName: string): Promise<PlayerProgress>
	{
		this.state.progress = { ...this.state.progress, playerName: playerName.trim() };

		return answer(this.state.progress);
	}

	/** Not answered by the fake yet. */
	saveQuestDraft(): Promise<void>
	{
		return notInFake("saveQuestDraft");
	}

	/** Not answered by the fake yet. */
	resetQuest(): Promise<QuestProgress>
	{
		return notInFake("resetQuest");
	}

	/** Not answered by the fake yet. */
	revealHint(): Promise<HintReveal>
	{
		return notInFake("revealHint");
	}

	/** Not answered by the fake yet. */
	submitConcept(): Promise<ConceptOutcome>
	{
		return notInFake("submitConcept");
	}

	/** Not answered by the fake yet. */
	submitBreakdown(): Promise<BreakdownReferenceChoice>
	{
		return notInFake("submitBreakdown");
	}

	/** Not answered by the fake yet. */
	reviseBreakdown(): Promise<BreakdownOutcome>
	{
		return notInFake("reviseBreakdown");
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

	/** Not answered by the fake yet. */
	answerDrillItem(): Promise<DrillItemResult>
	{
		return notInFake("answerDrillItem");
	}

	/** Not answered by the fake yet. */
	finishDrill(): Promise<DrillOutcome>
	{
		return notInFake("finishDrill");
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

	/** Not answered by the fake yet. */
	explainFinding(): Promise<string>
	{
		return notInFake("explainFinding");
	}

	/** Not answered by the fake yet. */
	answerReflection(): Promise<ExplainGrade>
	{
		return notInFake("answerReflection");
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
		const questCount = MAP_FIXTURE.flatMap((pack) => pack.worlds.flatMap((world) => world.stages)).length;

		return answer({ root: "fake", packCount: MAP_FIXTURE.length, questCount, glossaryCount: GLOSSARY.length, patternCount: PATTERN_CARDS.length, problems: [] });
	}

	/** The fixture map as outlines. */
	listPacks(): Promise<PackOutline[]>
	{
		const packs: PackOutline[] = MAP_FIXTURE.map((pack, packIndex) => ({
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

		return answer(packs);
	}

	/** Not answered by the fake yet: full quests belong to the quest screens (M2.2). */
	getWorld(): Promise<LearnerWorld>
	{
		return notInFake("getWorld");
	}

	/** Not answered by the fake yet: full quests belong to the quest screens (M2.2). */
	getQuest(): Promise<LearnerQuest>
	{
		return notInFake("getQuest");
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
		return answer(PATTERN_CARDS);
	}

	/** Not answered by the fake yet: drill sessions belong to the drill screen (M2.2). */
	startDrill(): Promise<DrillSession>
	{
		return notInFake("startDrill");
	}

	// Helpers

	/** Environment status from the current settings. */
	private environment(): EnvironmentStatus
	{
		const engine = [...enginesFixture(), manualEngineFixture()].find((candidate) => candidate.path === this.state.settings.enginePath) ?? null;
		const providers = reviewProvidersFixture(this.state.settings.hasApiKey);
		const reviewProvider = this.state.settings.reviewProvider === "auto"
			? providers.find((provider) => provider.available && provider.id !== "tests-only") ?? null
			: providers.find((provider) => provider.id === this.state.settings.reviewProvider) ?? null;

		return {
			engine,
			sandbox: { path: this.state.settings.sandboxPath, ready: this.state.settings.sandboxPath !== null },
			reviewProvider,
			loopMode: this.state.settings.loopMode,
			editorConnected: this.state.editorConnected,
		};
	}

	/** Availability for every quest. */
	private availability(): Record<string, QuestAvailability>
	{
		const isFresh = Object.keys(this.state.progress.quests).length === 0;
		const result: Record<string, QuestAvailability> = {};

		for (const pack of MAP_FIXTURE)
		{
			pack.worlds.forEach((world, worldIndex) =>
			{
				world.stages.forEach((stage, stageIndex) =>
				{
					if (!isFresh)
					{
						result[stage.id] = { status: stage.status, dueForRematch: stage.dueForRematch ?? false, skippable: false, ...(stage.lockedReason ? { lockedReason: stage.lockedReason } : {}) };
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

	/** Runs one simulated build, forwarding its events to every listener. */
	private async simulateBuild(runId: string, engineVersion: string, shouldFail: boolean): Promise<{ ok: boolean; durationMs: number }>
	{
		const simulator = new SandboxBuildSimulator(runId, (event) =>
		{
			for (const listener of this.listeners) listener(event);
		});

		this.builds.set(runId, simulator);

		try
		{
			return await simulator.run(engineVersion, shouldFail);
		}
		finally
		{
			this.builds.delete(runId);
		}
	}
}
