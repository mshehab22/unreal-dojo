// Checks the MCP client against a fake editor server over real HTTP: call shapes, parsing, one call in flight, discovery once per session, reconnects.
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { EditorClientError } from "../../src/main/services/unreal/EditorClientError";
import { parseEditorTestSummary, unwrapReturnValue } from "../../src/main/services/unreal/EditorTestSummaryParser";
import { McpEditorClient } from "../../src/main/services/unreal/McpEditorClient";
import { FakeUnrealMcpServer, returnValueText, type FakeToolHandler } from "./FakeUnrealMcpServer";

/** The RunTests summary shape the 5.8.3 server returned in M1.2a. */
const PASSING_SUMMARY = { tests: [{ name: "Dojo.Sample.Health.TakesDamage", state: "Success", duration: 0.02, errors: [], warnings: [] }], passed: 1, failed: 0, skipped: 0, total: 1, duration: 0.02 };

/** Answers DiscoverTests as ready and RunTests with the passing summary. */
const HEALTHY_EDITOR: FakeToolHandler = (_toolset, tool) =>
{
	if (tool === "DiscoverTests") return { text: returnValueText({ status: "ready" }) };
	if (tool === "RunTests") return { text: returnValueText(PASSING_SUMMARY), delayMs: 30 };

	return { text: "Error: unknown tool", isError: true };
};

describe("McpEditorClient", () =>
{
	let server: FakeUnrealMcpServer;
	let client: McpEditorClient;

	beforeEach(async () =>
	{
		server = new FakeUnrealMcpServer(HEALTHY_EDITOR);
		client = new McpEditorClient(await server.start());
	});

	afterEach(async () =>
	{
		await client.close();
		await server.stop();
	});

	it("answers the health check", async () =>
	{
		expect(await client.isAnswering()).toBe(true);
	});

	it("reports no answer when nothing listens on the port", async () =>
	{
		await server.stop();

		expect(await new McpEditorClient(1).isAnswering()).toBe(false);
		server = new FakeUnrealMcpServer(HEALTHY_EDITOR);
		await server.start();
	});

	it("discovers tests once, then runs exactly the named tests with the verified call shape (A44)", async () =>
	{
		const summary = await client.runTests(["Dojo.Sample.Health.TakesDamage"]);
		await client.runTests(["Dojo.Sample.Health.TakesDamage"]);

		expect(summary.tests).toEqual([{ name: "Dojo.Sample.Health.TakesDamage", state: "Success", durationSeconds: 0.02, errors: [] }]);
		expect(server.calls.map((call) => call.toolName)).toEqual(["DiscoverTests", "RunTests", "RunTests"]);
		expect(server.calls[0]).toEqual({ toolsetName: "AutomationTestToolset.AutomationTestToolset", toolName: "DiscoverTests", toolArguments: { bForceRediscover: false } });
		expect(server.calls[1]?.toolArguments).toEqual({ TestNames: ["Dojo.Sample.Health.TakesDamage"] });
	});

	it("never has two calls in flight, even when callers do not wait", async () =>
	{
		await Promise.all([client.runTests(["A"]), client.runTests(["B"]), client.isAnswering(), client.compileLiveCoding().catch(() => "")]);

		expect(server.maximumConcurrentCalls).toBe(1);
	});

	it("reconnects after the editor drops the session, and discovers tests again in the new session", async () =>
	{
		await client.runTests(["A"]);
		await server.dropSessions();

		const failure = await client.runTests(["A"]).catch((error: unknown) => error);
		expect(failure).toBeInstanceOf(EditorClientError);
		expect((failure as EditorClientError).kind).toBe("connection");

		await client.runTests(["A"]);

		expect(server.sessionCount).toBe(2);
		expect(server.calls.map((call) => call.toolName)).toEqual(["DiscoverTests", "RunTests", "DiscoverTests", "RunTests"]);
	});

	it("calls CompileLiveCoding on the Live Coding toolset and returns its text", async () =>
	{
		server.handler = () => ({ text: returnValueText({ result: "Success", log: "Live coding succeeded" }) });

		expect(await client.compileLiveCoding()).toBe(JSON.stringify({ result: "Success", log: "Live coding succeeded" }));
		expect(server.calls[0]).toEqual({ toolsetName: "LiveCodingToolset.LiveCodingToolset", toolName: "CompileLiveCoding", toolArguments: {} });
	});

	it("throws a tool error when the tool answers with an error", async () =>
	{
		server.handler = () => ({ text: "Error: Live Coding is not available in this build configuration.", isError: true });

		const failure = (await client.compileLiveCoding().catch((error: unknown) => error)) as EditorClientError;

		expect(failure.kind).toBe("tool");
		expect(failure.message).toMatch(/not available in this build configuration/);
	});

	it("throws a format error when RunTests answers without a tests list", async () =>
	{
		server.handler = (_toolset, tool) => ({ text: tool === "RunTests" ? returnValueText({ status: "busy" }) : returnValueText({ status: "ready" }) });

		expect(((await client.runTests(["A"]).catch((error: unknown) => error)) as EditorClientError).kind).toBe("format");
	});
});

describe("editor answer parsing", () =>
{
	it("unwraps returnValue and leaves plain text alone", () =>
	{
		expect(unwrapReturnValue(JSON.stringify({ returnValue: "{\"a\":1}" }))).toBe("{\"a\":1}");
		expect(unwrapReturnValue("Error: nope")).toBe("Error: nope");
		expect(unwrapReturnValue(JSON.stringify({ other: 1 }))).toBe(JSON.stringify({ other: 1 }));
	});

	it("reads errors given as strings or as objects, and skips entries without a name", () =>
	{
		const summary = parseEditorTestSummary(JSON.stringify({ tests: [{ name: "A", state: "Fail", errors: ["Expected 70", { message: "second" }] }, { state: "Success" }, { fullTestPath: "B", state: "Success" }] }));

		expect(summary.tests).toEqual([{ name: "A", state: "Fail", errors: ["Expected 70", "second"] }, { name: "B", state: "Success", errors: [] }]);
	});

	it("throws a format error on text that is not JSON", () =>
	{
		expect(() => parseEditorTestSummary("Error: busy")).toThrow(EditorClientError);
	});
});
