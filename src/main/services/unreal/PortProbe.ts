// Asks whether something already listens on a loopback port, behind an interface so tests choose the answer.

/** Checks a TCP port on 127.0.0.1. */
export interface PortProbe
{
	/** True when a connection to the port succeeds, meaning another program (often another Unreal editor) holds it. Never throws. */
	isInUse(port: number): Promise<boolean>;
}
