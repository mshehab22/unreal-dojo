// The fast loop's line to the open editor: an MCP client over Streamable HTTP to the editor's built-in server (D09, A44).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { EditorClientError } from "./EditorClientError";
import type { EditorTestSummary, EditorToolClient } from "./EditorToolClient";
import { parseEditorTestSummary, unwrapReturnValue } from "./EditorTestSummaryParser";

/** Toolset names as the 5.8.3 server lists them (A44). */
const AUTOMATION_TOOLSET = "AutomationTestToolset.AutomationTestToolset";
const LIVE_CODING_TOOLSET = "LiveCodingToolset.LiveCodingToolset";

/** Connecting and the health call are quick or the editor is not there. */
const CONNECT_TIMEOUT_MS = 5_000;
const HEALTH_TIMEOUT_MS = 5_000;

/** DiscoverTests took up to 4.4 s on the Mac; a cold editor can take longer. */
const DISCOVER_TIMEOUT_MS = 60_000;

/** A run of a quest's tests or a Live Coding compile may take minutes. */
const LONG_CALL_TIMEOUT_MS = 10 * 60 * 1000;

/** Calls the editor's three meta-tools (`list_toolsets`, `call_tool`) with one call in flight at a time, reconnecting after a broken session. */
export class McpEditorClient implements EditorToolClient
{
	private readonly url: URL;
	private client: Client | null = null;
	private testsDiscovered = false;
	private queue: Promise<unknown> = Promise.resolve();
	private closed = false;

	/** Takes the server port, the `mcpPort` setting (default 8000, A44). */
	constructor(port: number)
	{
		this.url = new URL(`http://127.0.0.1:${port}/mcp`);
	}

	/** Connects if needed and calls `list_toolsets`. */
	isAnswering(): Promise<boolean>
	{
		return this.serial(async () =>
		{
			try
			{
				const client = await this.session();
				await client.callTool({ name: "list_toolsets", arguments: {} }, undefined, { timeout: HEALTH_TIMEOUT_MS });

				return true;
			}
			catch
			{
				await this.dropSession();

				return false;
			}
		});
	}

	/** Runs DiscoverTests once per session, then RunTests with exactly these names. */
	runTests(testNames: string[]): Promise<EditorTestSummary>
	{
		return this.serial(async () =>
		{
			// Connect first: a new session resets the discovery flag.
			await this.session();

			if (!this.testsDiscovered)
			{
				await this.callTool(AUTOMATION_TOOLSET, "DiscoverTests", { bForceRediscover: false }, DISCOVER_TIMEOUT_MS);
				this.testsDiscovered = true;
			}

			return parseEditorTestSummary(await this.callTool(AUTOMATION_TOOLSET, "RunTests", { TestNames: testNames }, LONG_CALL_TIMEOUT_MS));
		});
	}

	/** Calls CompileLiveCoding and returns its unwrapped answer. */
	compileLiveCoding(): Promise<string>
	{
		return this.serial(() => this.callTool(LIVE_CODING_TOOLSET, "CompileLiveCoding", {}, LONG_CALL_TIMEOUT_MS));
	}

	/** Closes for good and at once, without waiting for the queue: a call in flight rejects as a connection error, and queued calls fail without reconnecting. */
	close(): Promise<void>
	{
		this.closed = true;

		return this.dropSession();
	}

	/** Queues work behind every earlier call, so calls never overlap even when callers do not wait. */
	private serial<Value>(work: () => Promise<Value>): Promise<Value>
	{
		const next = this.queue.then(work, work);
		this.queue = next.catch(() => undefined);

		return next;
	}

	/** The connected client, connecting first when there is none. A new session must discover tests again. */
	private async session(): Promise<Client>
	{
		if (this.client) return this.client;
		if (this.closed) throw new EditorClientError("connection", "The connection to the editor was closed.");

		const client = new Client({ name: "unreal-dojo", version: "1.0.0" });

		try
		{
			await client.connect(new StreamableHTTPClientTransport(this.url), { timeout: CONNECT_TIMEOUT_MS });
		}
		catch (error)
		{
			await client.close().catch(() => undefined);

			throw new EditorClientError("connection", `The editor's MCP server at ${this.url.href} did not answer: ${(error as Error).message}`);
		}

		this.client = client;
		this.testsDiscovered = false;

		return client;
	}

	/** Forgets the session so the next call reconnects. */
	private async dropSession(): Promise<void>
	{
		const client = this.client;
		this.client = null;

		await client?.close().catch(() => undefined);
	}

	/** Calls one toolset tool through `call_tool` and returns its unwrapped text. A broken connection drops the session. */
	private async callTool(toolsetName: string, toolName: string, toolArguments: Record<string, unknown>, timeoutMs: number): Promise<string>
	{
		const client = await this.session();
		let result: Awaited<ReturnType<Client["callTool"]>>;

		try
		{
			result = await client.callTool({ name: "call_tool", arguments: { toolset_name: toolsetName, tool_name: toolName, arguments: toolArguments } }, undefined, { timeout: timeoutMs });
		}
		catch (error)
		{
			await this.dropSession();

			throw new EditorClientError("connection", `${toolName} got no answer from the editor: ${(error as Error).message}`);
		}

		const content = Array.isArray(result.content) ? result.content : [];
		const text = content.map((part) => (typeof part === "object" && part !== null && "text" in part && typeof part.text === "string" ? part.text : "")).join("");

		if (result.isError === true) throw new EditorClientError("tool", `${toolName} failed: ${text}`);

		return unwrapReturnValue(text);
	}
}
