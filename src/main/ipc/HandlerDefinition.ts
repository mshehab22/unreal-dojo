// The shape every main-process IPC handler is written in: a zod schema for each argument, then the function that answers.
import type { z } from "zod";

import type { DojoInvokeApi, DojoMethod } from "@shared/ipc";

/** One schema per argument, in order. A mapped tuple, so the count and each schema's type must match the method's parameters. */
type ArgumentSchemas<Parameters extends unknown[]> = { [Index in keyof Parameters]: z.ZodType<Parameters[Index]> };

/** How main answers one DojoApi method. `handle` only runs with arguments that passed their schemas. */
export interface HandlerDefinition<Method extends DojoMethod>
{
	/** One zod schema per argument of the method. */
	argumentSchemas: ArgumentSchemas<Parameters<DojoInvokeApi[Method]>>;

	/** Answers the request. May throw; the wrapper turns any throw into an AppError. */
	handle: (...methodArguments: Parameters<DojoInvokeApi[Method]>) => Awaited<ReturnType<DojoInvokeApi[Method]>> | ReturnType<DojoInvokeApi[Method]>;
}

/** A handler for every DojoApi method. Missing one is a type error. */
export type HandlerTable = { [Method in DojoMethod]: HandlerDefinition<Method> };
