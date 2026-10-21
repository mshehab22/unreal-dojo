// Reads an engine version from Build.version and answers what the app can do with it.

/** An engine version as `Engine/Build/Build.version` records it. */
export interface EngineVersion
{
	major: number;
	minor: number;
	patch: number;
}

/** The oldest engine the headless loop supports (D10). */
export const MINIMUM_SUPPORTED_VERSION: EngineVersion = { major: 5, minor: 4, patch: 0 };

/** The first engine with the built-in MCP server, which the fast loop needs (D09). */
export const FAST_LOOP_VERSION: EngineVersion = { major: 5, minor: 8, patch: 0 };

/** Parses Build.version JSON. Returns null when the text is not JSON or lacks the three version numbers. */
export function parseBuildVersion(text: string): EngineVersion | null
{
	let parsed: unknown;

	try
	{
		parsed = JSON.parse(text.replace(/^﻿/, ""));
	}
	catch
	{
		return null;
	}

	if (typeof parsed !== "object" || parsed === null) return null;

	const record = parsed as Record<string, unknown>;
	const { MajorVersion: major, MinorVersion: minor, PatchVersion: patch } = record;

	if (typeof major !== "number" || typeof minor !== "number" || typeof patch !== "number") return null;

	return { major, minor, patch };
}

/** Negative when `left` is older, zero when equal, positive when newer. */
export function compareVersions(left: EngineVersion, right: EngineVersion): number
{
	return left.major - right.major || left.minor - right.minor || left.patch - right.patch;
}

/** Formats as `5.8.3`. */
export function formatVersion(version: EngineVersion): string
{
	return `${version.major}.${version.minor}.${version.patch}`;
}
