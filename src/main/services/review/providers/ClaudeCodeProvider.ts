// Reviews through the learner's own Claude Code login: `claude -p` with JSON schema output, no tools, and a clean temp folder as cwd (D11).
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { z } from "zod";

import type { ReviewProviderStatus } from "@shared/types/review";

import { cancelledError, refusedError, trimForDetail, unavailableError } from "../reviewErrors";
import type { ClaudeCodeLocator } from "./ClaudeCodeLocator";
import type { IProcessRunner, ProcessRunResult } from "./IProcessRunner";
import type { IReviewProvider, ReviewCompletionRequest } from "./IReviewProvider";

/** Oldest CLI the provider trusts with these flags (research section 10.1). */
export const MINIMUM_CLAUDE_CODE_VERSION = "2.1.275";

/** How long one review may take before it is stopped (spec: 3 minutes). */
const REVIEW_TIMEOUT_MS = 180_000;

/** How long `claude --version` may take. */
const VERSION_TIMEOUT_MS = 15_000;

/** Name used in every message about this provider. */
const PROVIDER_NAME = "Claude Code";

/** The part of `--output-format json`'s result envelope the provider reads. Other fields are ignored. */
const resultEnvelopeSchema = z.looseObject({
	type: z.literal("result"),
	is_error: z.boolean().optional(),
	result: z.string().optional(),
	structured_output: z.unknown().optional(),
	stop_reason: z.string().nullable().optional(),
	terminal_reason: z.string().nullable().optional(),
});

/** Variables removed from the CLI's environment so a key set in a terminal never bills a review instead of the learner's subscription (D11, A155). */
export const STRIPPED_ENVIRONMENT_VARIABLES = ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"] as const;

/** Options the app normally leaves at their defaults; tests shorten them. */
export interface ClaudeCodeProviderOptions
{
	/** Milliseconds before a review is stopped. */
	timeoutMs: number;

	/** Folder the per-review temp folders are made in. */
	temporaryRoot: string;

	/** The environment the CLI starts from, before the API key variables are removed. */
	environment: Record<string, string | undefined>;
}

/** Copies an environment without the variables that would switch Claude Code to API billing. */
export function reviewEnvironment(environment: Record<string, string | undefined>): Record<string, string | undefined>
{
	const copy = { ...environment };

	for (const name of STRIPPED_ENVIRONMENT_VARIABLES) delete copy[name];

	return copy;
}

/** Removes a review's temp folder. A failure here (a virus scanner holding a file on Windows) is ignored so it never replaces the review's own result. */
async function removeQuietly(folder: string): Promise<void>
{
	try
	{
		await rm(folder, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
	}
	catch
	{
		// The folder is in the system temp folder, which the operating system cleans up.
	}
}

/** Splits a version like "2.1.304" into numbers and compares it with another. Negative when `left` is older. */
export function compareVersions(left: string, right: string): number
{
	const leftParts = left.split(".").map(Number);
	const rightParts = right.split(".").map(Number);

	for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index++)
	{
		const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
		if (difference !== 0) return difference;
	}

	return 0;
}

/** The flags from D11 for one review. `textMode` drops the JSON flags for CLIs that reject them. */
export function buildClaudeCodeArguments(systemPromptFile: string, jsonSchema: Record<string, unknown>, textMode: boolean): string[]
{
	const outputFlags = textMode ? ["--output-format", "text"] : ["--output-format", "json", "--json-schema", JSON.stringify(jsonSchema)];

	return [
		"-p",
		...outputFlags,
		"--system-prompt-file", systemPromptFile,
		"--tools", "",
		"--max-turns", "1",
		"--no-session-persistence",
		"--strict-mcp-config",
		"--setting-sources", "user",
	];
}

/** True when stderr says the CLI did not know one of the flags. */
function isRejectedFlag(result: ProcessRunResult): boolean
{
	return result.exitCode !== 0 && /unknown option|unrecognized option|unknown argument|error: option/i.test(result.stderr);
}

/** Reviews through Claude Code. Remembers the CLI path and version after the first check. */
export class ClaudeCodeProvider implements IReviewProvider
{
	/** Which provider this is. */
	readonly id = "claude-code" as const;

	/** The last status check, reused until a refresh. */
	private cachedStatus: ReviewProviderStatus | null = null;

	/** The located CLI, filled by a status check. */
	private commandPath: string | null = null;

	/** True once the CLI rejected the JSON flags; later reviews go straight to text mode and the tolerant parser. */
	private textMode = false;

	/** Timeout and temp folder settings. */
	private readonly options: ClaudeCodeProviderOptions;

	/** Keeps the locator and the process runner, which tests replace. */
	constructor(private readonly locator: ClaudeCodeLocator, private readonly processRunner: IProcessRunner, options: Partial<ClaudeCodeProviderOptions> = {})
	{
		this.options = { timeoutMs: REVIEW_TIMEOUT_MS, temporaryRoot: tmpdir(), environment: process.env, ...options };
	}

	/** Finds the CLI and reads its version. Available only when found and new enough. */
	async status(refresh = false): Promise<ReviewProviderStatus>
	{
		if (this.cachedStatus && !refresh) return this.cachedStatus;

		this.cachedStatus = await this.checkStatus();

		return this.cachedStatus;
	}

	/** Sends one review through `claude -p` and answers the model's JSON as text. */
	async complete(request: ReviewCompletionRequest): Promise<string>
	{
		const status = await this.status();
		if (!status.available || this.commandPath === null) throw unavailableError(status.reason ?? "Claude Code is not available.", "Install Claude Code or pick another review provider in Settings.");

		const reviewFolder = await mkdtemp(join(this.options.temporaryRoot, "unreal-dojo-review-"));

		try
		{
			// The prompt sits beside the working folder, so the model's cwd holds nothing at all: no settings, hooks, or .mcp.json to pick up.
			const workFolder = join(reviewFolder, "work");
			const systemPromptFile = join(reviewFolder, "system-prompt.md");
			await mkdir(workFolder);

			let result = await this.runReview(request, systemPromptFile, workFolder);

			if (!this.textMode && isRejectedFlag(result))
			{
				this.textMode = true;
				result = await this.runReview(request, systemPromptFile, workFolder);
			}

			return this.readReply(result);
		}
		finally
		{
			await removeQuietly(reviewFolder);
		}
	}

	/** Locates the CLI and checks its version. */
	private async checkStatus(): Promise<ReviewProviderStatus>
	{
		this.commandPath = this.locator.locate();
		if (this.commandPath === null) return { id: this.id, available: false, reason: "Claude Code was not found on PATH or in the usual install folders." };

		const result = await this.processRunner.run(this.commandPath, ["--version"], { cwd: this.options.temporaryRoot, timeoutMs: VERSION_TIMEOUT_MS, env: reviewEnvironment(this.options.environment) });
		const version = /(\d+\.\d+\.\d+)/.exec(result.stdout)?.[1];

		if (result.exitCode !== 0 || version === undefined) return { id: this.id, available: false, reason: "Claude Code was found but did not report its version." };

		if (compareVersions(version, MINIMUM_CLAUDE_CODE_VERSION) < 0)
		{
			return { id: this.id, available: false, version, reason: `Claude Code ${version} is older than ${MINIMUM_CLAUDE_CODE_VERSION}. Update it with "claude update".` };
		}

		return { id: this.id, available: true, version };
	}

	/** Writes the system prompt and runs the CLI once. In text mode the schema rides at the end of the system prompt instead of on a flag. */
	private async runReview(request: ReviewCompletionRequest, systemPromptFile: string, workFolder: string): Promise<ProcessRunResult>
	{
		const schemaReminder = `\n\nReply with only one JSON object that matches this JSON schema:\n${JSON.stringify(request.jsonSchema)}`;
		await writeFile(systemPromptFile, this.textMode ? request.systemPrompt + schemaReminder : request.systemPrompt, "utf8");

		const runArguments = buildClaudeCodeArguments(systemPromptFile, request.jsonSchema, this.textMode);

		return this.processRunner.run(this.commandPath as string, runArguments, { cwd: workFolder, stdin: request.userMessage, timeoutMs: this.options.timeoutMs, signal: request.signal, env: reviewEnvironment(this.options.environment) });
	}

	/** Turns the finished process into the model's reply, or the right AppError. */
	private readReply(result: ProcessRunResult): string
	{
		if (result.cancelled) throw cancelledError();

		if (result.timedOut)
		{
			throw unavailableError(`Claude Code took longer than ${Math.round(this.options.timeoutMs / 1000)} seconds and was stopped.`, "Submit again. If it keeps happening, switch the review provider in Settings.");
		}

		if (this.textMode)
		{
			if (result.exitCode !== 0) throw unavailableError("Claude Code stopped with an error.", "Run claude in a terminal to check it works, then submit again.", result.stderr || result.stdout);

			return result.stdout;
		}

		return this.readEnvelope(result);
	}

	/** Reads the `--output-format json` envelope: errors, refusals, then the structured output or the result text. */
	private readEnvelope(result: ProcessRunResult): string
	{
		let parsedJson: unknown;

		try
		{
			parsedJson = JSON.parse(result.stdout);
		}
		catch
		{
			throw unavailableError("Claude Code stopped without a readable answer.", "Run claude in a terminal to check it works, then submit again.", result.stderr || result.stdout);
		}

		const envelope = resultEnvelopeSchema.safeParse(parsedJson);
		if (!envelope.success) throw unavailableError("Claude Code answered in a shape the app does not know.", "Update Claude Code with \"claude update\", then submit again.", result.stdout);

		const { is_error: isError, result: resultText, structured_output: structuredOutput, stop_reason: stopReason } = envelope.data;

		if (stopReason === "refusal") throw refusedError(PROVIDER_NAME, resultText);

		if (isError)
		{
			if (/not logged in|\/login/i.test(resultText ?? "")) throw unavailableError("Claude Code is not signed in.", "Open a terminal, run claude, and sign in with /login. Then submit again.", resultText);

			throw unavailableError("Claude Code reported an error instead of a review.", "Submit again. If it keeps happening, switch the review provider in Settings.", trimForDetail(resultText ?? result.stdout));
		}

		if (structuredOutput !== undefined && structuredOutput !== null) return JSON.stringify(structuredOutput);

		return resultText ?? "";
	}
}
