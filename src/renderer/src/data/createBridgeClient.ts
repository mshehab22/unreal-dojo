// Wraps the preload bridge (window.dojo) as a DojoClient. Content methods not in the bridge yet answer `not-implemented`.
import type { DojoApi } from "@shared/ipc";
import type { AppError } from "@shared/types/errors";

import { CONTENT_METHODS, type DojoClient, type DojoContentApi } from "./DojoClient";

/** The error a content method answers until M0.2b adds it to the bridge. */
function contentNotWired(method: string): AppError
{
	return {
		code: "not-implemented",
		message: "Quest content is not connected to the window yet.",
		suggestedAction: "This arrives with the content wiring task (M0.2b). Use the fake data source to preview the screens.",
		detail: `window.dojo.${method} is missing`,
	};
}

/** Builds a DojoClient over the bridge; each content method uses the bridge's own method once it exists. */
export function createBridgeClient(bridge: DojoApi): DojoClient
{
	const loose = bridge as unknown as Record<string, unknown>;
	const content: Record<string, () => Promise<unknown>> = {};

	for (const method of CONTENT_METHODS)
	{
		content[method] = () =>
		{
			const bridgeMethod = loose[method];

			if (typeof bridgeMethod === "function") return Promise.resolve(bridgeMethod.call(bridge));

			return Promise.reject(contentNotWired(method));
		};
	}

	// Every content method name was filled from CONTENT_METHODS above.
	return { ...bridge, ...(content as unknown as DojoContentApi) };
}
