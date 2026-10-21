// The shape every main-process IPC handler is written in: payload checks for each argument, then the function that answers.
import type { DojoInvokeApi, DojoMethod } from "@shared/ipc";

import type { PayloadCheck } from "./payloadChecks";

/** One payload check per argument, in order. Written as a mapped tuple so the count must match the method's parameters. */
type ArgumentChecks<Parameters extends unknown[]> = { [Index in keyof Parameters]: PayloadCheck };

/** How main answers one DojoApi method. `handle` only runs after every argument passed its check. */
export interface HandlerDefinition<Method extends DojoMethod>
{
	/** One check per argument of the method. */
	argumentChecks: ArgumentChecks<Parameters<DojoInvokeApi[Method]>>;

	/** Answers the request. May throw; the wrapper turns any throw into an AppError. */
	handle: (...methodArguments: Parameters<DojoInvokeApi[Method]>) => Awaited<ReturnType<DojoInvokeApi[Method]>> | ReturnType<DojoInvokeApi[Method]>;
}

/** A handler for every DojoApi method. Missing one is a type error. */
export type HandlerTable = { [Method in DojoMethod]: HandlerDefinition<Method> };
