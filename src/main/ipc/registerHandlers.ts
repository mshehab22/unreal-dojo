// Connects every DojoApi channel to its handler, behind a wrapper that turns bad payloads and thrown errors into AppErrors.
import type { IpcMain, IpcMainInvokeEvent } from "electron";

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

/** Turns anything a handler threw into an AppError. Known AppErrors pass through; anything else becomes `unexpected`. */
function toAppError(method: DojoMethod, thrown: unknown): AppError
{
	if (thrown instanceof AppErrorException) return thrown.appError;
	if (isAppError(thrown)) return thrown;

	const detail = thrown instanceof Error ? thrown.message : String(thrown);

	return {
		code: "unexpected",
		message: "Something went wrong in Unreal Dojo while doing that.",
		suggestedAction: "Try again. If it keeps happening, restart the app and report it with the details.",
		detail: `${method}: ${detail}`,
	};
}

/** Returns the first problem with the arguments, or null when they all pass. Extra arguments are a problem too. */
function findArgumentProblem(argumentChecks: readonly ((value: unknown, path: string) => string | null)[], methodArguments: unknown[]): string | null
{
	if (methodArguments.length > argumentChecks.length) return `expected at most ${argumentChecks.length} arguments, got ${methodArguments.length}`;

	for (const [index, check] of argumentChecks.entries())
	{
		const problem = check(methodArguments[index], `argument ${index + 1}`);
		if (problem) return problem;
	}

	return null;
}

/** Wraps one handler: checks the payload, runs it, and always answers with an IpcResponse. It never throws, so main never crashes on a bad call. */
export function wrapHandler<Method extends DojoMethod>(method: Method, definition: HandlerDefinition<Method>): WrappedHandler
{
	const argumentChecks = definition.argumentChecks as readonly ((value: unknown, path: string) => string | null)[];
	const handle = definition.handle as (...methodArguments: unknown[]) => unknown;

	return async (_event, ...methodArguments) =>
	{
		const problem = findArgumentProblem(argumentChecks, methodArguments);
		if (problem) return { ok: false, error: invalidPayload(method, problem) };

		try
		{
			// The arguments passed every check above, so they have the shapes the handler's parameters declare.
			const value = await handle(...methodArguments);
			return { ok: true, value };
		}
		catch (thrown)
		{
			const error = toAppError(method, thrown);
			if (error.code !== "not-implemented") console.error(`[ipc] ${method} failed`, thrown);

			return { ok: false, error };
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
