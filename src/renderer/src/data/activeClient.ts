// Holds the one DojoClient the app uses, chosen once at startup before React mounts.
import { createBridgeClient } from "./createBridgeClient";
import { chooseDataSource, DATA_SOURCE_STORAGE_KEY, type DataSourceChoice } from "./dataSourceChoice";
import type { DojoClient } from "./DojoClient";

let activeClient: DojoClient | null = null;
let activeChoice: DataSourceChoice = { kind: "bridge" };

/** Reads the stored data source choice; storage can be unavailable, which means the real bridge. */
function readStoredChoice(): string | null
{
	try
	{
		return window.localStorage.getItem(DATA_SOURCE_STORAGE_KEY);
	}
	catch
	{
		return null;
	}
}

/** Picks the data source and builds its client. The fake is loaded on demand, so the real app never ships its fixtures in the main chunk. */
export async function loadDojoClient(): Promise<DojoClient>
{
	activeChoice = chooseDataSource(readStoredChoice(), import.meta.env["VITE_DOJO_FAKE"] as string | undefined);

	if (activeChoice.kind === "fake")
	{
		const { FakeDojoApi } = await import("./fake/FakeDojoApi");
		activeClient = new FakeDojoApi(activeChoice.scenario);
	}
	else
	{
		activeClient = createBridgeClient(window.dojo);
	}

	return activeClient;
}

/** The client every query and action uses. Throws if called before `loadDojoClient` finished. */
export function dojo(): DojoClient
{
	if (!activeClient) throw new Error("loadDojoClient() must finish before the app renders.");

	return activeClient;
}

/** Which data source is active, for the dev badge in the frame. */
export function activeDataSource(): DataSourceChoice
{
	return activeChoice;
}
