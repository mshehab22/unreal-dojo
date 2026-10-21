// Decides what the fake engine says about a learner's files: whether they compile and which of the quest's tests pass.
import type { LearnerQuest } from "@shared/types/catalog";
import type { TestCaseResult } from "@shared/types/run";

/** The fake engine's verdict on one set of files. */
export interface FakeBuildVerdict
{
	compiled: boolean;
	compilerOutput: string;
	tests: TestCaseResult[];
}

/** A quest with files, as the judge reads it. */
type CodeQuest = Extract<LearnerQuest, { kind: "build" | "refactor" }>;

/** Reads the automation test names (`"Dojo.F1.Quest.Case"`) out of a quest's test source, in order. */
export function testNamesIn(testSource: string): string[]
{
	return [...testSource.matchAll(/"(Dojo\.[A-Za-z0-9_.]+)"/g)].map((match) => match[1] ?? "").filter((name) => name.length > 0);
}

/** The first file and line whose brackets do not balance, or null when every file balances. */
function unbalancedBracket(files: Record<string, string>): { file: string; line: number } | null
{
	for (const [file, text] of Object.entries(files))
	{
		let depth = 0;
		const lines = text.split("\n");

		for (let index = 0; index < lines.length; index++)
		{
			for (const character of (lines[index] ?? "").replace(/\/\/.*$/, ""))
			{
				if (character === "{") depth += 1;
				if (character === "}") depth -= 1;
				if (depth < 0) return { file, line: index + 1 };
			}
		}

		if (depth !== 0) return { file, line: lines.length };
	}

	return null;
}

/** Whole-file checks for the training dummy, the quest the e2e flow builds: Strike reflected, and its body written. */
function trainingDummyPasses(files: Record<string, string>): { reflected: boolean; behaves: boolean }
{
	const header = files["DojoF1TrainingDummy.h"] ?? "";
	const source = files["DojoF1TrainingDummy.cpp"] ?? "";
	const strikeBody = /::Strike\(\)\s*\{([\s\S]*?)\n\}/.exec(source)?.[1] ?? "";

	return {
		reflected: /UFUNCTION\s*\(\s*BlueprintCallable[^)]*\)\s*void\s+Strike\s*\(\s*\)\s*;/.test(header),
		behaves: /IsKnockedDown\s*\(\s*\)/.test(strikeBody) && /HitsTaken\s*(\+\+|\+=\s*1)/.test(strikeBody) && /RefreshLabel\s*\(\s*\)/.test(strikeBody),
	};
}

/** Judges files for a quest. A bracket mismatch fails to compile; otherwise the training dummy is checked for real, and any other quest passes once every file changed from its starter. */
export function judgeBuild(quest: CodeQuest, files: Record<string, string>): FakeBuildVerdict
{
	const broken = unbalancedBracket(files);

	if (broken)
	{
		return {
			compiled: false,
			compilerOutput: [`Quests/${quest.id}/${broken.file}(${broken.line}): error C2059: syntax error: unbalanced '{' and '}'`, "Result: Failed (OtherCompilationError)"].join("\n"),
			tests: [],
		};
	}

	const names = testNamesIn(quest.tests);
	const dummy = trainingDummyPasses(files);
	const isDummy = Object.keys(files).includes("DojoF1TrainingDummy.h");
	const everyFileChanged = quest.files.every((file) => (files[file.name] ?? file.starter) !== file.starter);

	const tests = names.map((name, index): TestCaseResult =>
	{
		const passed = isDummy ? (index === 0 ? dummy.reflected : dummy.reflected && dummy.behaves) : everyFileChanged;
		const message = isDummy && index === 0 ? "Strike is a UFUNCTION: expected a valid pointer, got null" : "Expected the label to change after a strike, it still reads the starting count";

		return { name, passed, durationMs: 40 + index * 25, ...(passed ? {} : { message }) };
	});

	return {
		compiled: true,
		compilerOutput: [`Building DojoSandboxEditor... ${Object.keys(files).length} files changed`, `Quests/${quest.id}: 0 errors, 0 warnings`, "Result: Succeeded"].join("\n"),
		tests,
	};
}
