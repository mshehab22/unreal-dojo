// Reads the engine folders out of the Epic launcher's LauncherInstalled.dat.

/** Engine entries are named `UE_<version>`; plugin entries (QuixelBridge_5.8, FabPlugin_5.8) share the folder and are skipped. */
const ENGINE_APP_NAME = /^UE_\d/;

/** Returns the install folder of every engine in the file, in file order. Bad JSON or an unexpected shape answers an empty list. */
export function parseLauncherInstalledFile(text: string): string[]
{
	let parsed: unknown;

	try
	{
		parsed = JSON.parse(text.replace(/^﻿/, ""));
	}
	catch
	{
		return [];
	}

	if (typeof parsed !== "object" || parsed === null) return [];

	const installationList = (parsed as Record<string, unknown>).InstallationList;
	if (!Array.isArray(installationList)) return [];

	const folders: string[] = [];

	for (const entry of installationList)
	{
		if (typeof entry !== "object" || entry === null) continue;

		const { AppName: appName, InstallLocation: installLocation } = entry as Record<string, unknown>;

		if (typeof appName === "string" && typeof installLocation === "string" && ENGINE_APP_NAME.test(appName)) folders.push(installLocation);
	}

	return folders;
}
