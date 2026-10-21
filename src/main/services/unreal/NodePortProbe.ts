// The real PortProbe: a short TCP connect to 127.0.0.1.
import { connect } from "node:net";

import type { PortProbe } from "./PortProbe";

/** A listener answers a local connect at once; this only guards against a hung socket. */
const PROBE_TIMEOUT_MS = 1_000;

/** Connects to the port and closes straight away. Refused or timed out counts as free. */
export class NodePortProbe implements PortProbe
{
	/** Resolves true when the connect succeeds. */
	isInUse(port: number): Promise<boolean>
	{
		return new Promise((resolve) =>
		{
			const socket = connect({ host: "127.0.0.1", port });
			const finish = (inUse: boolean): void =>
			{
				socket.destroy();
				resolve(inUse);
			};

			socket.setTimeout(PROBE_TIMEOUT_MS, () => finish(false));
			socket.once("connect", () => finish(true));
			socket.once("error", () => finish(false));
		});
	}
}
