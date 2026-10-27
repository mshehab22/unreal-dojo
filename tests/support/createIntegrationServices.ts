// Builds the real unreal-pipeline services for an engine integration test: the editor is always windowless, and every process launch goes through a guard that records it (A643, A1074).
import { createUnrealServices, type UnrealServiceInputs, type UnrealServices } from "../../src/main/services/unreal/createUnrealServices";
import { GuardedProcessLauncher } from "./GuardedProcessLauncher";

/** True when `DOJO_TEST_LIVE_CODING=1` asks for real Live Coding on Windows. It makes the Live Coding console window appear at the first compile, so it is off unless someone is at the machine and wants it (A1072). */
export const LIVE_CODING_REQUESTED = process.platform === "win32" && process.env.DOJO_TEST_LIVE_CODING === "1";

/** The services and the guard that saw every process they started. */
export interface IntegrationServices
{
	services: UnrealServices;
	guard: GuardedProcessLauncher;
}

/** Creates the services from the test's inputs, forcing a windowless editor (with Live Coding only when requested) and recording launches. */
export function createIntegrationServices(inputs: UnrealServiceInputs): IntegrationServices
{
	const created: GuardedProcessLauncher[] = [];
	const services = createUnrealServices({
		...inputs,
		forceWindowlessEditor: true,
		liveCodingInWindowlessEditor: LIVE_CODING_REQUESTED,
		decorateProcessLauncher: (real) =>
		{
			const guard = new GuardedProcessLauncher(real);
			created.push(guard);

			return guard;
		},
	});
	const guard = created[0];

	if (guard === undefined) throw new Error("The process launcher was not decorated");

	return { services, guard };
}
