// Fills a RunResult the same way for both loops.
import type { RunResult, TestCaseResult } from "@shared/types/run";

/** Fills a RunResult from the known fields; `ok` only when it compiled, at least one test ran, every test passed, and nothing went wrong. */
export function runResultOf(fields: Partial<RunResult>, durationMs: number, loop: RunResult["loop"]): RunResult
{
	const tests: TestCaseResult[] = fields.tests ?? [];
	const compiled = fields.compiled ?? false;
	const testsPassed = tests.filter((test) => test.passed).length;
	const result: RunResult = {
		ok: compiled && tests.length > 0 && testsPassed === tests.length && fields.error === undefined,
		compiled,
		compilerOutput: fields.compilerOutput ?? "",
		tests,
		testsPassed,
		testsTotal: tests.length,
		durationMs,
		loop,
	};

	if (fields.error !== undefined) result.error = fields.error;

	return result;
}
