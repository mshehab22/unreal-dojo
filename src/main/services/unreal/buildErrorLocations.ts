// Reads the error lines of compiler output (MSVC and clang shapes) and says which part of the sandbox each one points into.

/** Where in the sandbox an error line points. `unknown` covers lines with no source file (linker lines, build tool lines) and files outside every known folder. */
export type ErrorPlace = { kind: "quest"; questId: string } | { kind: "support" } | { kind: "unknown" };

/** One error line with the place it points into. */
export interface LocatedError
{
	/** The raw line, trimmed. */
	line: string;

	/** The part of the sandbox the line names. */
	place: ErrorPlace;
}

/** MSVC: `C:\path\File.cpp(14): error C2065: ...` or `File.cpp(14,5): error C2065`; the Unreal header tool writes `Error :` the same way. */
const MSVC_ERROR_LINE = /^(?<location>.+?)\(\d+(?:,\d+)?\)\s*:\s*(?:fatal\s+)?error\b/i;

/** clang: `/path/File.cpp:14:5: error: ...` (a Windows drive letter's colon is not followed by digits, so it is skipped). */
const CLANG_ERROR_LINE = /^(?<location>.+?):\d+:(?:\d+:)?\s*(?:fatal\s+)?error\b/i;

/** The linker: `File.cpp.obj : error LNK2019: ...` or `LINK : fatal error LNK1104: ...`. */
const LINKER_ERROR_LINE = /^(?<location>.+?)\s:\s(?:fatal\s+)?error\b/i;

/** `.../Quests/<quest-id>/<file>` in a forward-slash path. */
const QUEST_FOLDER_PATH = /\/Quests\/([^/]+)\//i;

/** `.../Tests/<quest-id>.Test.cpp` in a forward-slash path. */
const QUEST_TEST_PATH = /\/Tests\/([^/]+)\.Test\.cpp$/i;

/** The sandbox's support code, a file directly in the module folder (the template's `Dojo.cpp`, `Dojo.Build.cs`), or the engine's own sources. */
const SUPPORT_OR_ENGINE_PATH = /\/Source\/Dojo\/Support\/|\/Source\/Dojo\/[^/]+$|\/Engine\/(?:Source|Plugins|Build|Shaders)\//i;

/** Every compiler or linker error line of the output with the place it points into. Warnings and free-text lines such as `ERROR: ...` from the build tool are not returned. */
export function locatedErrors(output: string): LocatedError[]
{
	const found: LocatedError[] = [];

	for (const rawLine of output.split(/\r?\n/))
	{
		const line = rawLine.trim();
		const location = locationOfErrorLine(line);

		if (location !== null) found.push({ line, place: placeOf(location) });
	}

	return found;
}

/** The text before the error marker, or null when the line is not an error line. */
function locationOfErrorLine(line: string): string | null
{
	const match = MSVC_ERROR_LINE.exec(line) ?? CLANG_ERROR_LINE.exec(line) ?? LINKER_ERROR_LINE.exec(line);

	return match?.groups?.location ?? null;
}

/** Classifies a file location. A leading slash is added so a relative path matches the same patterns. */
function placeOf(location: string): ErrorPlace
{
	const path = `/${location.replace(/\\/g, "/")}`;

	const questFolder = QUEST_FOLDER_PATH.exec(path);
	if (questFolder?.[1]) return { kind: "quest", questId: questFolder[1].toLowerCase() };

	const questTest = QUEST_TEST_PATH.exec(path);
	if (questTest?.[1]) return { kind: "quest", questId: questTest[1].toLowerCase() };

	if (SUPPORT_OR_ENGINE_PATH.test(path)) return { kind: "support" };

	return { kind: "unknown" };
}
