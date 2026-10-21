// Shared pieces for the review tests: recorded replies, sample quest inputs, a scripted provider, and an AppError matcher.
import { chmodSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect } from "vitest";

import type { AppErrorCode } from "@shared/types/errors";
import type { BreakdownPlan } from "@shared/types/progress";
import type { ReviewProviderId, ReviewProviderStatus } from "@shared/types/review";
import type { RunResult } from "@shared/types/run";

import { AppErrorException } from "../../src/main/errors/AppErrorException";
import type { IReviewProvider, ReviewCompletionRequest } from "../../src/main/services/review/providers/IReviewProvider";
import type { BreakdownGradeInput, CodeReviewInput, ExplainGradeInput } from "../../src/main/services/review/ReviewInputs";
import type { IReviewSettings } from "../../src/main/services/review/settings/IReviewSettings";
import type { ReviewProviderSetting } from "@shared/types/settings";

/** Temp folders made by the current test, removed by `removeTestFolders` in afterEach. */
const createdTestFolders: string[] = [];

/** Makes a fresh folder in the system temp folder and remembers it for cleanup. Every test that needs a temp folder uses this. */
export function makeTestFolder(prefix: string): string
{
	const folder = mkdtempSync(join(tmpdir(), prefix));
	createdTestFolders.push(folder);

	return folder;
}

/** Removes every folder `makeTestFolder` made, even after a failed test. A folder a test made read-only is made writable first. */
export function removeTestFolders(): void
{
	for (const folder of createdTestFolders.splice(0))
	{
		try
		{
			chmodSync(folder, 0o755);
		}
		catch
		{
			// Already gone.
		}

		rmSync(folder, { recursive: true, force: true });
	}
}

/** Folder of recorded model replies. */
const RECORDED_FOLDER = join(import.meta.dirname, "recorded");

/** Reads one recorded reply, for example `recorded("code-review", "good.json")`. */
export function recorded(grader: string, fileName: string): string
{
	return readFileSync(join(RECORDED_FOLDER, grader, fileName), "utf8");
}

/** A provider that answers from a script of replies (or throws scripted errors) and records every request. */
export class ScriptedProvider implements IReviewProvider
{
	/** Every request received, in order. */
	readonly requests: ReviewCompletionRequest[] = [];

	/** Keeps the id, the replies, and the availability. */
	constructor(readonly id: ReviewProviderId, private readonly replies: Array<string | Error> = [], private readonly availability: ReviewProviderStatus = { id, available: true })
	{
	}

	/** Answers the scripted availability. */
	async status(): Promise<ReviewProviderStatus>
	{
		return this.availability;
	}

	/** Records the request and answers the next scripted reply. */
	async complete(request: ReviewCompletionRequest): Promise<string>
	{
		this.requests.push(request);

		const reply = this.replies.shift();
		if (reply === undefined) throw new Error("ScriptedProvider ran out of replies.");
		if (reply instanceof Error) throw reply;

		return reply;
	}
}

/** Settings with fixed values. */
export function fixedSettings(choice: ReviewProviderSetting, options: { modelId?: string; apiKey?: string | null } = {}): IReviewSettings
{
	const apiKey = options.apiKey === undefined ? "sk-ant-test-key" : options.apiKey;

	return {
		providerChoice: () => choice,
		modelId: () => options.modelId ?? "claude-sonnet-5-5",
		hasApiKey: () => apiKey !== null,
		readApiKey: async () => apiKey,
	};
}

/** Checks that a promise rejects with an AppErrorException of the given code, and answers it for further checks. */
export async function expectAppError(promise: Promise<unknown>, code: AppErrorCode): Promise<AppErrorException>
{
	const error = await promise.then(() => undefined, (rejection: unknown) => rejection);

	expect(error, "expected the call to reject").toBeInstanceOf(AppErrorException);
	expect((error as AppErrorException).appError.code).toBe(code);

	return error as AppErrorException;
}

/** A compiled run with one failing test. */
export function sampleRun(overrides: Partial<RunResult> = {}): RunResult
{
	return {
		ok: false,
		compiled: true,
		compilerOutput: "DojoHealthComponent.h(40): warning C4458: declaration hides class member",
		tests: [
			{ name: "Dojo.W1.HealthComponent.TakesDamage", passed: true },
			{ name: "Dojo.W1.HealthComponent.BroadcastsChange", passed: false, message: "Expected OnHealthChanged to fire once, fired 0 times." },
		],
		testsPassed: 1,
		testsTotal: 2,
		durationMs: 4200,
		loop: "fast",
		...overrides,
	};
}

/** A compiled run where every test passed: the only kind the API provider reviews (A70). */
export function passingRun(): RunResult
{
	return sampleRun({ ok: true, testsPassed: 2, tests: [{ name: "Dojo.W1.HealthComponent.TakesDamage", passed: true }, { name: "Dojo.W1.HealthComponent.BroadcastsChange", passed: true }] });
}

/** A health component submit with three rubric lines. */
export function sampleCodeInput(overrides: Partial<CodeReviewInput> = {}): CodeReviewInput
{
	const header = Array.from({ length: 45 }, (_, index) => (index === 39 ? "\tAActor* OwnerActor;" : `// header line ${index + 1}`)).join("\n");
	const source = Array.from({ length: 20 }, (_, index) => `// source line ${index + 1}`).join("\n");

	return {
		questId: "w1.health-component",
		questTitle: "Health Component",
		brief: "Build a health component that takes damage, clamps at zero, and broadcasts every change.",
		rubric: ["Health lives in a UActorComponent", "Damage is clamped at zero", "Changes are broadcast through a delegate"],
		patternNames: ["Observer"],
		files: { "DojoHealthComponent.h": header, "DojoHealthComponent.cpp": source },
		run: sampleRun(),
		...overrides,
	};
}

/** A small plan with the given labels as components and no arrows. */
export function planWithLabels(labels: string[]): BreakdownPlan
{
	return { pieces: labels.map((label, index) => ({ id: `piece-${index}`, kind: "component", label, purpose: `does the ${label} job` })), edges: [] };
}

/** A breakdown with three required pieces and two reference plans. */
export function sampleBreakdownInput(overrides: Partial<BreakdownGradeInput> = {}): BreakdownGradeInput
{
	return {
		questId: "w1.door-breakdown",
		spec: "When the player's health reaches zero, the exit door opens.",
		requiredPieces: [
			{ kind: "component", label: "HealthComponent", why: "Owns hit points." },
			{ kind: "event", label: "OnDeath event", why: "Lets the door react without knowing the player." },
			{ kind: "class", label: "DoorActor", why: "Opens itself." },
		],
		referencePlans: [planWithLabels(["HealthComponent", "OnDeath event", "DoorActor"]), planWithLabels(["Health", "GameMode", "Door"])],
		rubric: ["Gameplay never calls UI"],
		firstPlan: planWithLabels(["Health"]),
		revisedPlan: planWithLabels(["Health", "Died", "HUD"]),
		revisionNote: "I added a Died event so the door can listen.",
		...overrides,
	};
}

/** An explain item about UPROPERTY. */
export function sampleExplainInput(overrides: Partial<ExplainGradeInput> = {}): ExplainGradeInput
{
	return {
		prompt: "Explain UPROPERTY in one sentence.",
		modelAnswer: "UPROPERTY registers a member with the reflection system so the garbage collector, the editor, and serialization can see it.",
		answer: "It marks a member so reflection and the garbage collector can see it.",
		...overrides,
	};
}
