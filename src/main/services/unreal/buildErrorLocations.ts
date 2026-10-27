// Reads the error lines of compiler output (MSVC and clang shapes) and says which part of the sandbox each one points into.

/** Where in the sandbox an error line points: a quest, the sandbox's support code or template, the engine, or `unknown` (linker lines, build tool lines, and files outside every known folder). */
export type ErrorPlace = { kind: "quest"; questId: string } | { kind: "support" } | { kind: "engine" } | { kind: "unknown" };

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

/** Apple's linker: `Undefined symbols for architecture arm64:`, `ld: symbol(s) not found ...`, `ld: Undefined symbols:`, and `clang++: error: linker command failed with exit code 1`. They name no file, and they prove the toolchain ran. */
const APPLE_LINKER_LINE = /^(?:Undefined symbols for architecture\b|ld: (?:symbol\(s\) not found|Undefined symbols)|\S*clang\S*: error: linker command failed)/i;

/** `.../Source/Dojo/Quests/<quest-id>/<file>` in a forward-slash path. Anchored on the module folder so a sandbox that sits inside a folder called Quests is not misread. */
const QUEST_FOLDER_PATH = /\/Source\/Dojo\/Quests\/([^/]+)\//gi;

/** `.../Source/Dojo/Tests/<quest-id>.Test.cpp` in a forward-slash path. */
const QUEST_TEST_PATH = /\/Source\/Dojo\/Tests\/([^/]+)\.Test\.cpp/gi;

/** The sandbox's support code, or a file directly in the module folder (the template's `Dojo.cpp`, `Dojo.Build.cs`). */
const SUPPORT_PATH = /\/Source\/Dojo\/Support\/|\/Source\/Dojo\/[^/]+$/i;

/** The engine's own sources. */
const ENGINE_PATH = /\/Engine\/(?:Source|Plugins|Build|Shaders)\//i;

/** Error text that says a file is missing, the only kind of engine-located error that is certainly not caused by the code that included the header. */
const MISSING_FILE_ERROR = /Cannot open include file|\bC1083\b|file not found|No such file or directory/i;

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
	if (APPLE_LINKER_LINE.test(line)) return "";

	const match = MSVC_ERROR_LINE.exec(line) ?? CLANG_ERROR_LINE.exec(line) ?? LINKER_ERROR_LINE.exec(line);

	return match?.groups?.location ?? null;
}

/** True when the error line says a file is missing. */
export function isMissingFileError(line: string): boolean
{
	return MISSING_FILE_ERROR.test(line);
}

/** Every quest id whose folder or test file any part of the text names, lower case, once each. Works on whole lines too, so a note, an "In file included from" line or a "requested here" line that names a quest counts. */
export function questIdsNamedIn(text: string): string[]
{
	const path = forwardSlashed(text);
	const matches = [...path.matchAll(QUEST_FOLDER_PATH), ...path.matchAll(QUEST_TEST_PATH)];

	return [...new Set(matches.map((match) => (match[1] ?? "").toLowerCase()))];
}

/** The text with forward slashes and a leading slash, so a relative path matches the same patterns as an absolute one. */
function forwardSlashed(text: string): string
{
	return `/${text.replace(/\\/g, "/")}`;
}

/** Classifies a file location. */
function placeOf(location: string): ErrorPlace
{
	const [questId] = questIdsNamedIn(location);
	if (questId) return { kind: "quest", questId };

	const path = forwardSlashed(location);

	if (SUPPORT_PATH.test(path)) return { kind: "support" };
	if (ENGINE_PATH.test(path)) return { kind: "engine" };

	return { kind: "unknown" };
}
