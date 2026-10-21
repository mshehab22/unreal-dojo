// Reads which drill to start from the drill route's query, so links can say "due", a world's test-out, or a quest's Parsons fallback.
import type { DrillRequest } from "@shared/types/drill";

import type { RouteParameters } from "../../../app/router/routes";

/** The drill request a route asks for; anything unrecognized is today's due drill. */
export function drillRequestFromRoute(parameters: RouteParameters): DrillRequest
{
	const pack = parameters["pack"];
	const world = parameters["world"];
	const quest = parameters["quest"];

	if (parameters["kind"] === "test-out" && pack && world) return { kind: "test-out", packId: pack, worldId: world };
	if (parameters["kind"] === "parsons-fallback" && quest) return { kind: "parsons-fallback", questId: quest };

	return { kind: "due" };
}

/** The route parameters for a drill request, the reverse of drillRequestFromRoute. */
export function routeForDrillRequest(request: DrillRequest): Record<string, string>
{
	switch (request.kind)
	{
		case "due":
			return { kind: "due" };
		case "test-out":
			return { kind: "test-out", pack: request.packId, world: request.worldId };
		case "parsons-fallback":
			return { kind: "parsons-fallback", quest: request.questId };
	}
}
