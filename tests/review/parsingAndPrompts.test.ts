// The tolerant JSON extractor, the provider JSON schemas, the shipped prompts, and the safeStorage-backed settings.
import { describe, expect, it } from "vitest";

import { extractJsonObject } from "../../src/main/services/review/parsing/extractJsonObject";
import { loadPrompt, type PromptName } from "../../src/main/services/review/prompts/loadPrompt";
import { codeReviewOutputSchema, toProviderJsonSchema } from "../../src/main/services/review/ReviewSchemas";
import { SafeStorageReviewSettings } from "../../src/main/services/review/settings/SafeStorageReviewSettings";
import { expectAppError } from "./reviewTestKit";

describe("extractJsonObject", () =>
{
	it("reads bare, fenced, and prose-wrapped objects", () =>
	{
		expect(extractJsonObject("{\"a\":1}")).toEqual({ found: true, value: { a: 1 } });
		expect(extractJsonObject("Here:\n```json\n{\"a\":2}\n```")).toEqual({ found: true, value: { a: 2 } });
		expect(extractJsonObject("Result {\"a\":3} done")).toEqual({ found: true, value: { a: 3 } });
	});

	it("is not fooled by braces inside strings or an earlier non-JSON brace", () =>
	{
		expect(extractJsonObject("Use {curly} braces. {\"detail\":\"a } inside\",\"n\":1}")).toEqual({ found: true, value: { detail: "a } inside", n: 1 } });
	});

	it("explains empty, missing, cut off, and arrays", () =>
	{
		expect(extractJsonObject("   ")).toEqual({ found: false, problem: "the reply was empty." });
		expect(extractJsonObject("No JSON here.")).toEqual({ found: false, problem: "the reply held no JSON object." });
		expect(extractJsonObject("{\"a\": \"never closes")).toMatchObject({ found: false, problem: expect.stringMatching(/cut off/) });
		expect(extractJsonObject("[1, 2]")).toMatchObject({ found: false });
	});
});

describe("toProviderJsonSchema", () =>
{
	it("keeps enums and closed objects and drops the range keywords structured output rejects", () =>
	{
		const schema = toProviderJsonSchema(codeReviewOutputSchema);
		const text = JSON.stringify(schema);

		expect(schema.additionalProperties).toBe(false);
		expect(text).toContain("\"enum\":[\"problem\",\"suggestion\",\"praise\"]");
		expect(text).not.toMatch(/minimum|maximum|minLength|\$schema/);
		expect(schema.required).toEqual(["score", "summary", "rubric", "findings", "reflectionQuestion", "alternativeHint"]);
	});
});

describe("prompts", () =>
{
	const names: PromptName[] = ["code-review", "breakdown-grader", "explain-grader", "finding-explainer"];

	it("all load with a version and no header left in the text", () =>
	{
		for (const name of names)
		{
			const prompt = loadPrompt(name);

			expect(prompt.version, name).toBeGreaterThanOrEqual(1);
			expect(prompt.text, name).not.toContain("<!--");
			expect(prompt.text.length, name).toBeGreaterThan(200);
		}
	});

	it("ask for findings tied to rubric and conventions, a why, and never the solution", () =>
	{
		const codeReview = loadPrompt("code-review").text;

		expect(codeReview).toMatch(/tied to a rubric line, an Unreal convention, or the brief/);
		expect(codeReview).toMatch(/short "why"/);
		expect(codeReview).toMatch(/Never write the solution/);
		expect(loadPrompt("breakdown-grader").text).toMatch(/Never write the plan for them/);
	});

	it("contain no em dashes", () =>
	{
		for (const name of names) expect(loadPrompt(name).text, name).not.toContain("\u2014");
	});

	it("refuse a file whose header is missing or names another prompt", () =>
	{
		expect(() => loadPrompt("code-review", "No header here.")).toThrow(/no "<!-- prompt/);
		expect(() => loadPrompt("code-review", "<!-- prompt: explain-grader, version 1 -->\nText")).toThrow(/says it is explain-grader/);
	});
});

describe("SafeStorageReviewSettings", () =>
{
	/** Settings over a fake safeStorage that "decrypts" by reversing bytes. */
	function settingsWith(encrypted: Buffer | null, encryptionAvailable = true, decryptThrows = false): SafeStorageReviewSettings
	{
		return new SafeStorageReviewSettings({
			currentSettings: () => ({ reviewProvider: "auto", modelId: "claude-sonnet-5-5", hasApiKey: encrypted !== null }),
			loadEncryptedApiKey: async () => encrypted,
			decryptor: {
				isEncryptionAvailable: () => encryptionAvailable,
				decryptString: (buffer) =>
				{
					if (decryptThrows) throw new Error("bad blob");

					return Buffer.from(buffer).reverse().toString("utf8");
				},
			},
		});
	}

	it("reads settings through closures and decrypts the key only on demand", async () =>
	{
		const settings = settingsWith(Buffer.from("yek-tset").reverse().reverse());

		expect(settings.providerChoice()).toBe("auto");
		expect(settings.modelId()).toBe("claude-sonnet-5-5");
		expect(settings.hasApiKey()).toBe(true);
		await expect(settings.readApiKey()).resolves.toBe("test-key");
	});

	it("answers null without a stored key, and clear errors when decryption cannot work", async () =>
	{
		await expect(settingsWith(null).readApiKey()).resolves.toBeNull();
		await expectAppError(settingsWith(Buffer.from("x"), false).readApiKey(), "secure-storage-unavailable");
		await expectAppError(settingsWith(Buffer.from("x"), true, true).readApiKey(), "review-unavailable");
	});
});
