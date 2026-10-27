// Connects every DojoApi channel to its handler, behind a wrapper that turns bad payloads and thrown errors into AppErrors.
import type { IpcMain, IpcMainInvokeEvent } from "electron";
import type { z } from "zod";

import { DOJO_METHODS, IPC_CHANNELS, type DojoMethod, type IpcResponse } from "@shared/ipc";
import { isAppError, type AppError } from "@shared/types/errors";

import { AppErrorException } from "../errors/AppErrorException";
import type { HandlerDefinition, HandlerTable } from "./HandlerDefinition";

/** The part of `ipcMain` the registration uses, so tests can pass a fake. */
export type IpcHandleRegistrar = Pick<IpcMain, "handle">;

/** The listener `ipcMain.handle` receives for one channel. */
export type WrappedHandler = (event: IpcMainInvokeEvent, ...methodArguments: unknown[]) => Promise<IpcResponse<unknown>>;

/** Builds the `invalid-payload` error. The problem text goes in `detail` because it is for a bug report, not for the learner. */
function invalidPayload(method: DojoMethod, problem: string): AppError
{
	return {
		code: "invalid-payload",
		message: "The app sent the main process a request it could not understand.",
		suggestedAction: "This is a bug in Unreal Dojo. Try again; if it keeps happening, restart the app and report it with the details.",
		detail: `${method}: ${problem}`,
	};
}

/** Copies only the four AppError fields, so an extra property (a function, a class instance) can never make the answer fail to clone over IPC. */
function copyAppError(error: AppError): AppError
{
	const copy: AppError = { code: error.code, message: String(error.message), suggestedAction: String(error.suggestedAction) };
	if (error.detail !== undefined) copy.detail = String(error.detail);

	return copy;
}

/** Turns anything thrown into an AppError. Known AppErrors pass through as clean copies; anything else becomes `unexpected`, its detail prefixed with `context`. Also used by `trackRun` (A820). */
export function toAppError(context: string, thrown: unknown): AppError
{
	if (thrown instanceof AppErrorException) return copyAppError(thrown.appError);
	if (isAppError(thrown)) return copyAppError(thrown);

	const detail = thrown instanceof Error ? thrown.message : String(thrown);

	return {
		code: "unexpected",
		message: "Something went wrong in Unreal Dojo while doing that.",
		suggestedAction: "Try again. If it keeps happening, restart the app and report it with the details.",
		detail: `${context}: ${detail}`,
	};
}

/** Most zod issues listed in an invalid-payload detail. */
const MAXIMUM_LISTED_ISSUES = 3;

/** Returns an issue's message, adding the first inner reason for issues that wrap others (a bad record key, a union with no match). */
function describeIssueMessage(issue: z.core.$ZodIssue): string
{
	const innerIssues = "issues" in issue && Array.isArray(issue.issues) ? (issue.issues as { message?: string }[]) : [];
	const innerMessage = innerIssues.find((innerIssue) => typeof innerIssue.message === "string")?.message;

	return innerMessage ? `${issue.message}, ${innerMessage}` : issue.message;
}

/** Describes zod issues as `argument 1.patch.loopMode: Invalid option ...`. zod messages name types and rules, never the value sent. */
function describeIssues(argumentNumber: number, issues: readonly z.core.$ZodIssue[]): string
{
	return issues
		.slice(0, MAXIMUM_LISTED_ISSUES)
		.map((issue) => [`argument ${argumentNumber}`, ...issue.path.map(String)].join(".") + `: ${describeIssueMessage(issue)}`)
		.join("; ");
}

/** Parses every argument with its schema. Returns the parsed arguments, or the problem text. Extra arguments are a problem too. */
function parseArguments(argumentSchemas: readonly z.ZodType[], methodArguments: unknown[]): { parsed: unknown[] } | { problem: string }
{
	if (methodArguments.length > argumentSchemas.length) return { problem: `expected at most ${argumentSchemas.length} arguments, got ${methodArguments.length}` };

	const parsed: unknown[] = [];

	for (const [index, schema] of argumentSchemas.entries())
	{
		const result = schema.safeParse(methodArguments[index]);
		if (!result.success) return { problem: describeIssues(index + 1, result.error.issues) };

		parsed.push(result.data);
	}

	return { parsed };
}

/** A call still running after this long is named in main's console, and named again with its time when it answers (A1251). */
export const SLOW_CALL_NOTICE_MS = 10_000;

/** Where the slow-call lines go; tests pass a collector. */
export type SlowCallLog = (line: string) => void;

/** Starts the slow-call watch for one call and returns the function that ends it. Runs, builds, and reviews are slow by design and are logged like any other call. */
function watchSlowCall(method: DojoMethod, log: SlowCallLog): () => void
{
	const startedAt = Date.now();
	const notice = setTimeout(() => log(`[ipc] ${method} has not answered after ${SLOW_CALL_NOTICE_MS / 1000} s`), SLOW_CALL_NOTICE_MS);

	// The watch must never keep main alive on its own.
	notice.unref?.();

	return () =>
	{
		clearTimeout(notice);

		const elapsedMs = Date.now() - startedAt;
		if (elapsedMs >= SLOW_CALL_NOTICE_MS) log(`[ipc] ${method} answered after ${(elapsedMs / 1000).toFixed(1)} s`);
	};
}

/** Wraps one handler: checks the payload, runs it, and always answers with an IpcResponse. It never throws, so main never crashes on a bad call. */
export function wrapHandler<Method extends DojoMethod>(method: Method, definition: HandlerDefinition<Method>, slowCallLog: SlowCallLog = (line) => console.warn(line)): WrappedHandler
{
	const argumentSchemas = definition.argumentSchemas as readonly z.ZodType[];
	const handle = definition.handle as (...methodArguments: unknown[]) => unknown;

	return async (_event, ...methodArguments) =>
	{
		const parseResult = parseArguments(argumentSchemas, methodArguments);
		if ("problem" in parseResult) return { ok: false, error: invalidPayload(method, parseResult.problem) };

		const endWatch = watchSlowCall(method, slowCallLog);

		try
		{
			// The handler gets zod's parsed copies, which have the shapes the handler's parameters declare.
			const value = await handle(...parseResult.parsed);
			return { ok: true, value };
		}
		catch (thrown)
		{
			const error = toAppError(method, thrown);
			if (error.code !== "not-implemented") console.error(`[ipc] ${method} failed`, thrown);

			return { ok: false, error };
		}
		finally
		{
			endWatch();
		}
	};
}

/** Registers one wrapped handler per DojoApi method on its channel. Called once from the composition root. */
export function registerHandlers(registrar: IpcHandleRegistrar, handlers: HandlerTable): void
{
	for (const method of DOJO_METHODS)
	{
		registrar.handle(IPC_CHANNELS[method], wrapHandler(method, handlers[method] as HandlerDefinition<typeof method>));
	}
}
