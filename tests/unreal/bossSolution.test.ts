// Checks the boss layout reader joins paths with the reader's own separator, so it works on any file system the app or a test passes in (W2).
import { describe, expect, it } from "vitest";

import { type BossFolderReader, readBossSolution } from "../../src/main/services/unreal/bossSolution";

/** Files by full path, spelled with a separator no operating system uses, so a reader that joins with node:path cannot find them. */
const FILES: Record<string, string> = {
	"root>boss>Boss.h": "boss h",
	"root>boss>Boss.Test.cpp": "boss tests",
	"root>boss>piece>Piece.h": "extended piece h",
};

/** A reader over `FILES` that spells paths with ">". */
const reader: BossFolderReader = {
	join: (...parts) => parts.join(">"),
	listFolder: async (folder) =>
	{
		const prefix = `${folder}>`;
		const names = Object.keys(FILES).filter((filePath) => filePath.startsWith(prefix)).map((filePath) => filePath.slice(prefix.length));
		if (names.length === 0) return undefined;

		return { files: names.filter((name) => !name.includes(">")), folders: [...new Set(names.filter((name) => name.includes(">")).map((name) => name.split(">")[0] ?? ""))] };
	},
	readText: async (filePath) => FILES[filePath] ?? "",
};

describe("readBossSolution with a custom path separator", () =>
{
	it("reads code, tests, and piece overrides through the reader's own join", async () =>
	{
		const solution = await readBossSolution("root", "boss", reader);

		expect(solution?.code).toEqual([{ name: "Boss.h", text: "boss h" }]);
		expect(solution?.tests).toEqual([{ name: "Boss.Test.cpp", text: "boss tests" }]);
		expect(solution?.overrides.get("piece")).toEqual([{ name: "Piece.h", text: "extended piece h" }]);
	});

	it("returns undefined when the boss folder does not exist", async () =>
	{
		expect(await readBossSolution("root", "missing", reader)).toBeUndefined();
	});
});
