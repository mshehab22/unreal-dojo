// The Claude Code provider with the process spawn mocked: D11's exact flags, a clean cwd, recorded envelopes, timeouts, cancel, and the text-mode fallback.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ClaudeCodeLocator } from "../../src/main/services/review/providers/ClaudeCodeLocator";
import { buildClaudeCodeArguments, ClaudeCodeProvider, compareVersions } from "../../src/main/services/review/providers/ClaudeCodeProvider";
import type { IProcessRunner, ProcessRunOptions, ProcessRunResult } from "../../src/main/services/review/providers/IProcessRunner";
import { expectAppError, recorded } from "./reviewTestKit";

/** One recorded spawn: what was run, and what the cwd held while it ran. */
interface SpawnRecord
{
	command: string;
	args: string[];
	options: ProcessRunOptions;
	cwdContents: string[];
	systemPromptText?: string;
}

/** A process runner that answers `--version` and then scripted review results. */
class FakeProcessRunner implements IProcessRunner
{
	/** Every spawn, in order. */
	readonly spawns: SpawnRecord[] = [];

	/** Keeps the version line and the scripted review results. */
	constructor(private readonly versionLine: string, private readonly reviewResults: Array<Partial<ProcessRunResult>>)
	{
	}

	/** Records the spawn and answers the next scripted result. */
	async run(command: string, args: string[], options: ProcessRunOptions): Promise<ProcessRunResult>
	{
		const promptIndex = args.indexOf("--system-prompt-file");
		const promptFile = promptIndex >= 0 ? args[promptIndex + 1] : undefined;

		this.spawns.push({
			command,
			args,
			options,
			cwdContents: existsSync(options.cwd) ? readdirSync(options.cwd) : ["(missing)"],
			systemPromptText: promptFile ? readFileSync(promptFile, "utf8") : undefined,
		});

		const base: ProcessRunResult = { exitCode: 0, stdout: "", stderr: "", timedOut: false, cancelled: false };
		if (args[0] === "--version") return { ...base, stdout: this.versionLine };

		return { ...base, ...(this.reviewResults.shift() ?? { exitCode: 1, stderr: "no scripted result" }) };
	}
}

/** A locator that finds `claude` in one fixed place. */
function locatorFindingClaude(): ClaudeCodeLocator
{
	return new ClaudeCodeLocator({ platform: "darwin", env: { PATH: "/fake/bin" }, homeFolder: "/Users/learner", isExecutable: (filePath) => filePath === "/fake/bin/claude" });
}

/** A provider over a fake runner, with its temp folders in a fresh test folder. */
function providerWith(runner: FakeProcessRunner, locator = locatorFindingClaude()): { provider: ClaudeCodeProvider; temporaryRoot: string }
{
	const temporaryRoot = mkdtempSync(join(tmpdir(), "dojo-claude-code-test-"));

	return { provider: new ClaudeCodeProvider(locator, runner, { temporaryRoot, timeoutMs: 1000 }), temporaryRoot };
}

/** A review request with a tiny schema. */
const REQUEST = { systemPrompt: "Grade the sentence.", userMessage: "Learner sentence here.", jsonSchema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"], additionalProperties: false } };

describe("ClaudeCodeProvider", () =>
{
	it("spawns claude -p with exactly the D11 flags, the message on stdin, and an empty temp cwd", async () =>
	{
		const runner = new FakeProcessRunner("2.1.304 (Claude Code)", [{ stdout: recorded("claude-code", "success-structured.json") }]);
		const { provider } = providerWith(runner);

		await provider.complete(REQUEST);

		const review = runner.spawns[1];
		expect(review?.command).toBe("/fake/bin/claude");
		expect(review?.args).toEqual([
			"-p",
			"--output-format", "json",
			"--json-schema", JSON.stringify(REQUEST.jsonSchema),
			"--system-prompt-file", expect.stringMatching(/system-prompt\.md$/),
			"--tools", "",
			"--max-turns", "1",
			"--no-session-persistence",
			"--strict-mcp-config",
			"--setting-sources", "user",
		]);
		expect(review?.options.stdin).toBe("Learner sentence here.");
		expect(review?.options.timeoutMs).toBe(1000);
		expect(review?.cwdContents).toEqual([]);
		expect(review?.systemPromptText).toBe("Grade the sentence.");
	});

	it("removes the temp folder after the review, even when it fails", async () =>
	{
		const runner = new FakeProcessRunner("2.1.304", [{ stdout: recorded("claude-code", "success-structured.json") }, { stdout: "not json" }]);
		const { provider, temporaryRoot } = providerWith(runner);

		await provider.complete(REQUEST);
		await expectAppError(provider.complete(REQUEST), "review-unavailable");

		expect(readdirSync(temporaryRoot)).toEqual([]);
	});

	it("answers structured_output as JSON text", async () =>
	{
		const runner = new FakeProcessRunner("2.1.304", [{ stdout: recorded("claude-code", "success-structured.json") }]);
		const { provider } = providerWith(runner);

		const reply = await provider.complete(REQUEST);

		expect(JSON.parse(reply)).toMatchObject({ score: 88, verdict: "correct" });
	});

	it("falls back to the result text when there is no structured output", async () =>
	{
		const runner = new FakeProcessRunner("2.1.304", [{ stdout: recorded("claude-code", "success-text-only.json") }]);
		const { provider } = providerWith(runner);

		await expect(provider.complete(REQUEST)).resolves.toMatch(/^```json/);
	});

	it("explains the recorded not-signed-in envelope", async () =>
	{
		const runner = new FakeProcessRunner("2.1.304", [{ exitCode: 1, stdout: recorded("claude-code", "not-logged-in.json") }]);
		const { provider } = providerWith(runner);

		const error = await expectAppError(provider.complete(REQUEST), "review-unavailable");

		expect(error.appError.message).toBe("Claude Code is not signed in.");
		expect(error.appError.suggestedAction).toMatch(/\/login/);
	});

	it("turns a refusal into review-refused and other errors into review-unavailable", async () =>
	{
		const runner = new FakeProcessRunner("2.1.304", [{ stdout: recorded("claude-code", "refusal.json") }, { exitCode: 1, stdout: recorded("claude-code", "error.json") }]);
		const { provider } = providerWith(runner);

		await expectAppError(provider.complete(REQUEST), "review-refused");

		const error = await expectAppError(provider.complete(REQUEST), "review-unavailable");
		expect(error.appError.detail).toContain("529");
	});

	it("reports a timeout and a cancel as different errors", async () =>
	{
		const runner = new FakeProcessRunner("2.1.304", [{ exitCode: null, timedOut: true }, { exitCode: null, cancelled: true }]);
		const { provider } = providerWith(runner);

		const timeout = await expectAppError(provider.complete(REQUEST), "review-unavailable");
		expect(timeout.appError.message).toMatch(/longer than 1 seconds/);

		await expectAppError(provider.complete(REQUEST), "run-cancelled");
	});

	it("passes the abort signal to the process", async () =>
	{
		const runner = new FakeProcessRunner("2.1.304", [{ stdout: recorded("claude-code", "success-structured.json") }]);
		const { provider } = providerWith(runner);
		const controller = new AbortController();

		await provider.complete({ ...REQUEST, signal: controller.signal });

		expect(runner.spawns[1]?.options.signal).toBe(controller.signal);
	});

	it("retries once in text mode when the CLI rejects a flag, and stays in text mode", async () =>
	{
		const runner = new FakeProcessRunner("2.1.304", [
			{ exitCode: 1, stderr: "error: unknown option '--json-schema'" },
			{ stdout: "{\"ok\": true}" },
			{ stdout: "```json\n{\"ok\": true}\n```" },
		]);
		const { provider } = providerWith(runner);

		await expect(provider.complete(REQUEST)).resolves.toBe("{\"ok\": true}");
		await expect(provider.complete(REQUEST)).resolves.toContain("\"ok\": true");

		const textRun = runner.spawns[2];
		expect(textRun?.args.slice(0, 3)).toEqual(["-p", "--output-format", "text"]);
		expect(textRun?.args).not.toContain("--json-schema");
		expect(textRun?.systemPromptText).toContain("matches this JSON schema");
		expect(runner.spawns[3]?.args).not.toContain("--json-schema");
	});

	it("is unavailable when claude is not found, with no spawn at all", async () =>
	{
		const runner = new FakeProcessRunner("2.1.304", []);
		const locator = new ClaudeCodeLocator({ platform: "darwin", env: { PATH: "/fake/bin" }, homeFolder: "/Users/learner", isExecutable: () => false });
		const { provider } = providerWith(runner, locator);

		await expect(provider.status()).resolves.toMatchObject({ id: "claude-code", available: false, reason: expect.stringMatching(/not found/) });
		await expectAppError(provider.complete(REQUEST), "review-unavailable");
		expect(runner.spawns).toHaveLength(0);
	});

	it("is unavailable below the minimum version and caches the status until a refresh", async () =>
	{
		const runner = new FakeProcessRunner("2.1.200 (Claude Code)", []);
		const { provider } = providerWith(runner);

		await expect(provider.status()).resolves.toMatchObject({ available: false, version: "2.1.200", reason: expect.stringMatching(/claude update/) });
		await provider.status();
		expect(runner.spawns).toHaveLength(1);

		await provider.status(true);
		expect(runner.spawns).toHaveLength(2);
	});

	it("records the CLI version when available", async () =>
	{
		const runner = new FakeProcessRunner("2.1.304 (Claude Code)", []);
		const { provider } = providerWith(runner);

		await expect(provider.status()).resolves.toEqual({ id: "claude-code", available: true, version: "2.1.304" });
	});
});

describe("Claude Code helpers", () =>
{
	it("compares versions numerically", () =>
	{
		expect(compareVersions("2.1.304", "2.1.275")).toBeGreaterThan(0);
		expect(compareVersions("2.1.99", "2.1.275")).toBeLessThan(0);
		expect(compareVersions("2.1.275", "2.1.275")).toBe(0);
	});

	it("drops the JSON flags in text mode", () =>
	{
		expect(buildClaudeCodeArguments("/tmp/p.md", {}, true)).not.toContain("--json-schema");
	});
});

describe("ClaudeCodeLocator", () =>
{
	it("checks PATH first, then the usual install folders", () =>
	{
		const locator = new ClaudeCodeLocator({ platform: "darwin", env: { PATH: "/usr/bin:/bin" }, homeFolder: "/Users/learner", isExecutable: () => false });

		expect(locator.candidates()).toEqual(["/usr/bin/claude", "/bin/claude", "/Users/learner/.local/bin/claude", "/Users/learner/.claude/local/claude", "/usr/local/bin/claude", "/opt/homebrew/bin/claude"]);
	});

	it("finds Homebrew's claude when the Dock gave the app a short PATH", () =>
	{
		const locator = new ClaudeCodeLocator({ platform: "darwin", env: { PATH: "/usr/bin" }, homeFolder: "/Users/learner", isExecutable: (filePath) => filePath === "/opt/homebrew/bin/claude" });

		expect(locator.locate()).toBe("/opt/homebrew/bin/claude");
	});

	it("looks for claude.exe and npm's claude.cmd on Windows", () =>
	{
		const locator = new ClaudeCodeLocator({ platform: "win32", env: { Path: "C:\\Tools", APPDATA: "C:\\Users\\learner\\AppData\\Roaming", USERPROFILE: "C:\\Users\\learner" }, homeFolder: "C:\\Users\\learner", isExecutable: () => false });

		expect(locator.candidates()).toEqual([
			"C:\\Tools\\claude.exe",
			"C:\\Tools\\claude.cmd",
			"C:\\Users\\learner\\.local\\bin\\claude.exe",
			"C:\\Users\\learner\\.local\\bin\\claude.cmd",
			"C:\\Users\\learner\\AppData\\Roaming\\npm\\claude.exe",
			"C:\\Users\\learner\\AppData\\Roaming\\npm\\claude.cmd",
		]);
	});
});
