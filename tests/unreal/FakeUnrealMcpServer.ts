// A stand-in for the Unreal editor's MCP server: the same three meta-tools over Streamable HTTP, answering from a script.
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

/** What a scripted tool returns: text, optionally flagged as an error, after an optional delay. */
export interface FakeToolAnswer
{
	text: string;
	isError?: boolean;
	delayMs?: number;
}

/** Answers one `call_tool` call. */
export type FakeToolHandler = (toolsetName: string, toolName: string, toolArguments: Record<string, unknown>) => FakeToolAnswer;

/** One recorded `call_tool` call. */
export interface RecordedCall
{
	toolsetName: string;
	toolName: string;
	toolArguments: Record<string, unknown>;
}

/** Wraps a value the way the 5.8.3 server does: `{"returnValue": "<json>"}` (A44). */
export function returnValueText(value: unknown): string
{
	return JSON.stringify({ returnValue: JSON.stringify(value) });
}

/** Runs on a free loopback port. Records every call, counts sessions, and notices overlapping calls. */
export class FakeUnrealMcpServer
{
	/** Every call_tool call, in order. */
	readonly calls: RecordedCall[] = [];

	/** How many sessions clients opened. */
	sessionCount = 0;

	/** The most calls that were running at the same time. */
	maximumConcurrentCalls = 0;

	/** Answers call_tool; tests may replace it between steps. */
	handler: FakeToolHandler;

	private readonly httpServer: Server;
	private readonly transports = new Map<string, StreamableHTTPServerTransport>();
	private concurrentCalls = 0;

	/** Takes the first handler. Call start() before use. */
	constructor(handler: FakeToolHandler)
	{
		this.handler = handler;
		this.httpServer = createServer((request, response) =>
		{
			void this.route(request, response);
		});
	}

	/** Listens on a free port and returns it. */
	async start(): Promise<number>
	{
		await new Promise<void>((resolve) => this.httpServer.listen(0, "127.0.0.1", resolve));

		return (this.httpServer.address() as AddressInfo).port;
	}

	/** Closes every session and the listener. */
	async stop(): Promise<void>
	{
		for (const transport of this.transports.values()) await transport.close().catch(() => undefined);

		this.httpServer.closeAllConnections();
		await new Promise<void>((resolve) => this.httpServer.close(() => resolve()));
	}

	/** Forgets every session, as an editor restart would, so the next call with an old session id fails. */
	async dropSessions(): Promise<void>
	{
		for (const transport of this.transports.values()) await transport.close().catch(() => undefined);

		this.transports.clear();
	}

	/** Sends a request to its session's transport, or opens a new session for a request without one. */
	private async route(request: Parameters<StreamableHTTPServerTransport["handleRequest"]>[0], response: Parameters<StreamableHTTPServerTransport["handleRequest"]>[1]): Promise<void>
	{
		const sessionId = request.headers["mcp-session-id"];

		if (typeof sessionId === "string")
		{
			const transport = this.transports.get(sessionId);

			if (!transport)
			{
				response.writeHead(404).end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32001, message: "Session not found" }, id: null }));
				return;
			}

			await transport.handleRequest(request, response);
			return;
		}

		const transport = new StreamableHTTPServerTransport({
			sessionIdGenerator: () => randomUUID(),
			enableJsonResponse: true,
			onsessioninitialized: (newSessionId) =>
			{
				this.sessionCount++;
				this.transports.set(newSessionId, transport);
			},
		});

		await this.createMcpServer().connect(transport);
		await transport.handleRequest(request, response);
	}

	/** Builds a server with the editor's three meta-tools. */
	private createMcpServer(): McpServer
	{
		const server = new McpServer({ name: "fake-unreal", version: "5.8.3" });

		server.registerTool("list_toolsets", { description: "Lists toolsets" }, async () => ({ content: [{ type: "text", text: JSON.stringify(["AutomationTestToolset.AutomationTestToolset", "LiveCodingToolset.LiveCodingToolset"]) }] }));

		server.registerTool("describe_toolset", { description: "Describes a toolset", inputSchema: { toolset_name: z.string() } }, async () => ({ content: [{ type: "text", text: "{}" }] }));

		server.registerTool(
			"call_tool",
			{ description: "Calls a tool", inputSchema: { toolset_name: z.string(), tool_name: z.string(), arguments: z.record(z.string(), z.unknown()).optional() } },
			async (input) =>
			{
				const toolArguments = input.arguments ?? {};
				this.calls.push({ toolsetName: input.toolset_name, toolName: input.tool_name, toolArguments });

				this.concurrentCalls++;
				this.maximumConcurrentCalls = Math.max(this.maximumConcurrentCalls, this.concurrentCalls);

				try
				{
					const answer = this.handler(input.toolset_name, input.tool_name, toolArguments);
					if (answer.delayMs) await new Promise((resolve) => setTimeout(resolve, answer.delayMs));

					return { content: [{ type: "text", text: answer.text }], isError: answer.isError ?? false };
				}
				finally
				{
					this.concurrentCalls--;
				}
			},
		);

		return server;
	}
}
