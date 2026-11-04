// Finds the engine's fatal error in the output of one headless test run, so a crash shows its reason instead of only an exit code.

/** What the engine's output says about a crash. */
export interface EngineCrash
{
	/** The fatal error in plain words, one line, capped. */
	reason: string;

	/** The short name of the quest test that was running when the engine stopped, when the output shows one. */
	runningTest?: string;

	/** True when the output shows one of this quest's tests starting before the crash. */
	testsStarted: boolean;
}

/** The longest reason shown to the learner, in characters. A fatal line can carry a whole expression or a path. */
export const MAX_CRASH_REASON_LENGTH = 200;

/** The words that introduce the engine's own text in a crash message; the build failure explainer cuts the message here (A1863). */
export const ENGINE_SAID_MARKER = "The engine said:";

/** How many lines after a fatal line are searched for its message, which the engine prints on the line that follows. */
const MESSAGE_LOOKAHEAD_LINES = 3;

/** The start of a line: an optional log timestamp and frame number, then an optional engine error category. A learner's own category (`LogTemp`) is not in the list, so it never matches. */
const LINE_PREFIX = /^(?:\[[\d.:-]+\]\[\s*\d+\])?(?:Log(?:Windows|Core|OutputDevice|Mac|Apple|Linux|Unix|HAL):\s*(?:Error|Fatal):\s*)?/;

/** A line that still starts with a log category after its prefix is removed, or that starts another fatal error: never the message of the fatal error before it. */
const NOT_A_MESSAGE_LINE = /^(?:Log[A-Z]\w*:|===|\[Callstack\]|appError called:|Fatal error:|Assertion failed:|Unhandled Exception:|Caught signal)/;

/** `Fatal error: [File:...] [Line: 523] message`, where the message may be empty and printed on the next line. */
const FATAL_ERROR_WITH_FILE = /^Fatal error:\s*\[File:[^\]]*\]\s*\[Line:\s*\d+\]\s*(.*)$/;

/** `Assertion failed: Expression [File:...] [Line: 12] message`. */
const ASSERTION_FAILED = /^Assertion failed:\s*(.*?)\s*\[File:[^\]]*\]\s*\[Line:\s*\d+\]\s*(.*)$/;

/** `Fatal error: message` with no file and line. */
const FATAL_ERROR_PLAIN = /^Fatal error:\s*(\S.*)$/;

/** `Unhandled Exception: EXCEPTION_ACCESS_VIOLATION reading address 0x0` (Windows), or the same text with a signal name (macOS). */
const UNHANDLED_EXCEPTION = /^Unhandled Exception:\s*(\S.*)$/;

/** `Caught signal 11 Segmentation fault`. */
const CAUGHT_SIGNAL = /^Caught signal\s+\d+\s*(.*)$/;

/** A test starting: `LogAutomationController: Display: Test Started. Name={Short} Path={Dojo.Quest.Short}`. */
const TEST_STARTED = /Test Started\.\s*Name=\{([^}]*)\}\s*Path=\{([^}]*)\}/;

/** A test finishing: `LogAutomationController: Display: Test Completed. Result={Success} Name={Short} Path={Dojo.Quest.Short}`. */
const TEST_COMPLETED = /Test Completed\..*Path=\{([^}]*)\}/;

/** Reads the engine's output for a crash. Never throws. */
export class EngineCrashReader
{
	/** The crash in `lines`, or undefined when no fatal error is there. Only these lines are read, so a log from an earlier run can never be mistaken for this one. */
	read(lines: readonly string[], questTestPaths: readonly string[]): EngineCrash | undefined
	{
		const reason = this.firstFatalReason(lines);

		if (reason === undefined) return undefined;

		return { reason, ...this.testProgress(lines, questTestPaths) };
	}

	/** The plain-words reason of the first fatal line, or undefined when there is none. */
	private firstFatalReason(lines: readonly string[]): string | undefined
	{
		for (let index = 0; index < lines.length; index += 1)
		{
			const reason = this.reasonOfLine(lines, index);

			if (reason !== undefined) return limitedToOneLine(reason);
		}

		return undefined;
	}

	/** The reason when the line at `index` starts a fatal error, otherwise undefined. */
	private reasonOfLine(lines: readonly string[], index: number): string | undefined
	{
		let body = bodyOf(lines[index] ?? "");

		// The engine wraps the same text in `appError called:` the first time and prints it again in its critical error block.
		const wrapped = /^appError called:\s*(.*)$/.exec(body);

		if (wrapped) body = (wrapped[1] ?? "").trim();

		const fatalWithFile = FATAL_ERROR_WITH_FILE.exec(body);

		if (fatalWithFile) return nonEmpty(fatalWithFile[1]) ?? followingMessage(lines, index) ?? "the engine hit a fatal error";

		const assertion = ASSERTION_FAILED.exec(body);

		if (assertion) return assertionReason(assertion[1] ?? "", nonEmpty(assertion[2]) ?? followingMessage(lines, index) ?? "");

		const fatalPlain = FATAL_ERROR_PLAIN.exec(body);

		if (fatalPlain) return nonEmpty(fatalPlain[1]);

		const exception = UNHANDLED_EXCEPTION.exec(body);

		if (exception) return exceptionReason(exception[1] ?? "");

		const signal = CAUGHT_SIGNAL.exec(body);

		if (signal) return exceptionReason(nonEmpty(signal[1]) ?? "a crash signal");

		return undefined;
	}

	/** Which of this quest's tests started, and which of them was still running at the end. */
	private testProgress(lines: readonly string[], questTestPaths: readonly string[]): { runningTest?: string; testsStarted: boolean }
	{
		const running = new Map<string, string>();
		let testsStarted = false;

		for (const line of lines)
		{
			const started = TEST_STARTED.exec(line);

			if (started && questTestPaths.includes(started[2] ?? ""))
			{
				testsStarted = true;
				running.set(started[2] ?? "", started[1] ?? "");
				continue;
			}

			const completed = TEST_COMPLETED.exec(line);

			if (completed) running.delete(completed[1] ?? "");
		}

		const lastRunning = [...running.values()].pop();

		return lastRunning === undefined || lastRunning === "" ? { testsStarted } : { runningTest: lastRunning, testsStarted };
	}
}

/** The sentence the learner reads for a crash: whose code, the exit code, and what the engine said. */
export function describeEngineCrash(crash: EngineCrash, exitCode: number | null): string
{
	const code = String(exitCode);
	const said = `${ENGINE_SAID_MARKER} ${endedWithPunctuation(crash.reason)}`;

	if (crash.runningTest !== undefined) return `Your code stopped the engine while the test ${crash.runningTest} was running, so no test report was written (exit code ${code}). ${said}`;

	if (crash.testsStarted) return `Your code stopped the engine while your tests were running, so no test report was written (exit code ${code}). ${said}`;

	return `The engine crashed and stopped before writing a test report (exit code ${code}). ${said}`;
}

/** The line without its timestamp and engine error prefix. */
function bodyOf(line: string): string
{
	return line.replace(LINE_PREFIX, "").trim();
}

/** The text when it has any non-blank characters, otherwise undefined. */
function nonEmpty(text: string | undefined): string | undefined
{
	const trimmed = (text ?? "").trim();

	return trimmed === "" ? undefined : trimmed;
}

/** The first non-blank line after a fatal line, which holds the message the engine printed on its own line. A callstack line, another log message or another fatal error is not that message. */
function followingMessage(lines: readonly string[], index: number): string | undefined
{
	for (let offset = 1; offset <= MESSAGE_LOOKAHEAD_LINES; offset += 1)
	{
		const text = nonEmpty(bodyOf(lines[index + offset] ?? ""));

		if (text !== undefined) return NOT_A_MESSAGE_LINE.test(text) ? undefined : text;
	}

	return undefined;
}

/** A failed check in plain words: the expression, then the message the author gave it. */
function assertionReason(expression: string, message: string): string
{
	const check = nonEmpty(expression) === undefined ? "a check in the code failed" : `a check in the code failed: ${expression.trim()}`;

	return nonEmpty(message) === undefined ? check : `${check} (${message.trim()})`;
}

/** A crash signal or exception in plain words, keeping the engine's own name for it. */
function exceptionReason(name: string): string
{
	if (/ACCESS_VIOLATION|SIGSEGV|Segmentation/i.test(name)) return `the code used memory it does not own (${name.trim()})`;

	if (/STACK_OVERFLOW/i.test(name)) return `the code called itself too many times and ran out of stack (${name.trim()})`;

	return name.trim();
}

/** The reason collapsed to one line of plain characters and cut to the cap. */
function limitedToOneLine(reason: string): string
{
	// eslint-disable-next-line no-control-regex
	const oneLine = reason.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();

	return oneLine.length <= MAX_CRASH_REASON_LENGTH ? oneLine : `${oneLine.slice(0, MAX_CRASH_REASON_LENGTH - 3).trimEnd()}...`;
}

/** The text with a full stop when it does not already end in punctuation. */
function endedWithPunctuation(text: string): string
{
	return /[.!?)]$/.test(text) ? text : `${text}.`;
}
