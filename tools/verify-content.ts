// Content verifier entry point: parses and checks every content file, optionally builds and tests reference solutions, and reports per file.
import { resolve } from "node:path";

import { solutionsFolderProblem } from "./verifier/checkSolutionsFolder";
import { formatReport } from "./verifier/formatReport";
import { parseVerifierArguments, USAGE } from "./verifier/parseVerifierArguments";
import { runEngineStage } from "./verifier/engine/runEngineStage";
import { addProblems, runVerifier } from "./verifier/runVerifier";

/** Exit code for content problems. */
const EXIT_PROBLEMS = 1;

/** Exit code when `--engine` was interrupted (128 plus SIGINT's number, as shells report it). */
const EXIT_CANCELLED = 130;

/** Exit code for a bad command line. */
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

	const unusableSolutions = await solutionsFolderProblem(parsed.options.solutionsFolder);

	if (unusableSolutions !== undefined)
	{
		console.error(`verify-content: ${unusableSolutions}`);
		process.exitCode = EXIT_USAGE;
		return;
	}

	let result = await runVerifier(parsed.options);
	let cancelled = false;

	if (parsed.options.enginePath !== undefined)
	{
		const engine = await runEngineStage(parsed.options.enginePath, parsed.options, result, (line) => console.error(line));

		result = addProblems(result, engine.problems);
		cancelled = engine.report?.cancelled === true;
	}

	for (const line of formatReport(result)) console.log(line);

	process.exitCode = cancelled ? EXIT_CANCELLED : result.problemCount === 0 ? 0 : EXIT_PROBLEMS;
}

void main();
