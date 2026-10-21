// The stub answer for DojoApi methods whose service has not been built yet.
import type { DojoMethod } from "@shared/ipc";

import { AppErrorException } from "../errors/AppErrorException";

/** Builds the `not-implemented` error for a method, naming the task that will build it so the renderer can show something honest. */
export function notImplemented(method: DojoMethod, arrivesWith: string): AppErrorException
{
	return new AppErrorException("not-implemented", "This part of Unreal Dojo is not built yet.", `It arrives with ${arrivesWith}. Nothing to do for now.`, `${method} is a stub`);
}
