// Content verifier entry point: parses every content file and reports problems per file. Parse-only mode for now (M0.4).
import { resolve } from "node:path";

import { formatReport } from "./verifier/formatReport";
import { parseVerifierArguments, USAGE } from "./verifier/parseVerifierArguments";
import { runVerifier } from "./verifier/runVerifier";

/** Exit code for content problems. */
const EXIT_PROBLEMS = 1;

/** Exit code for a bad command line or a mode that does not exist yet. */
const EXIT_USAGE = 2;

/** Reads the command line, runs the verifier, prints the report, and sets the exit code. */
async function main(): Promise<void>
{
	const parsed = parseVerifierArguments(process.argv.slice(2), resolve(import.meta.dirname, "..", "content"), resolve(import.meta.dirname, "solutions"));

	if (!parsed.ok)
	{
		console.error(`verify-content: ${parsed.message}\n${USAGE}`);
		process.exitCode = EXIT_USAGE;
		return;
	}

	if (parsed.options.help)
	{
		console.log(USAGE);
		return;
	}

	if (parsed.options.enginePath !== undefined)
	{
		console.error("verify-content: --engine (compile and test reference solutions) arrives in M1.8; nothing was checked.");
		process.exitCode = EXIT_USAGE;
		return;
	}

	const result = await runVerifier(parsed.options);

	for (const line of formatReport(result)) console.log(line);

	process.exitCode = result.problemCount === 0 ? 0 : EXIT_PROBLEMS;
}

void main();
