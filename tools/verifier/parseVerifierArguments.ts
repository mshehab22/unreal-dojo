// Turns the verifier's command line into options, rejecting unknown flags so a typo never silently checks less.

/** What the verifier was asked to do. */
export interface VerifierOptions
{
	/** The content folder (holds glossary.json, patterns.json, packs/, examples/). */
	contentFolder: string;

	/** Only report this pack's files; every pack is still read (A206). Under `--engine`, only this pack's quests are judged. */
	packId?: string;

	/** Only report the file that defines this quest. */
	questId?: string;

	/** Engine root (or its `Engine` folder): compile and test every reference solution and starter. */
	enginePath?: string;

	/** Folder of reference solutions, one sub-folder per quest id. */
	solutionsFolder: string;

	/** Turn the "until the curriculum is complete" warnings into errors. */
	release: boolean;

	help: boolean;
}

/** The result of reading the command line: options, or the reason they could not be read. */
export type ParsedArguments = { ok: true; options: VerifierOptions } | { ok: false; message: string };

/** Usage text printed by `--help` and after an argument error. */
export const USAGE = [
	"Usage: npx tsx tools/verify-content.ts [--pack <id>] [--quest <id>] [--content <folder>] [--solutions <folder>] [--engine <path>] [--release]",
	"  --pack <id>        only report packs/<id> (every pack is still read for cross-pack checks)",
	"  --quest <id>       only report the file that defines this quest",
	"  --content <folder> content folder to check (default: content/ in the repo)",
	"  --solutions <folder> reference solutions, must exist (default: tools/solutions/ in the repo)",
	"  --engine <path>    build every reference solution and starter with this engine and run their tests",
	"  --release          coverage warnings become errors",
].join("\n");

/** Reads `argv` (without the node and script entries). The defaults are used when `--content` or `--solutions` is absent. */
export function parseVerifierArguments(argv: readonly string[], defaultContentFolder: string, defaultSolutionsFolder: string = ""): ParsedArguments
{
	const options: VerifierOptions = { contentFolder: defaultContentFolder, solutionsFolder: defaultSolutionsFolder, release: false, help: false };
	const valueFlags = new Map<string, (value: string) => void>([
		["--pack", (value) => (options.packId = value)],
		["--quest", (value) => (options.questId = value)],
		["--content", (value) => (options.contentFolder = value)],
		["--engine", (value) => (options.enginePath = value)],
		["--solutions", (value) => (options.solutionsFolder = value)],
	]);

	for (let index = 0; index < argv.length; index++)
	{
		const flag = argv[index] ?? "";

		if (flag === "--help" || flag === "-h")
		{
			options.help = true;
			continue;
		}

		if (flag === "--release")
		{
			options.release = true;
			continue;
		}

		const setValue = valueFlags.get(flag);

		if (setValue === undefined) return { ok: false, message: `unknown argument "${flag}"` };

		const value = argv[index + 1];

		if (value === undefined || value.startsWith("--")) return { ok: false, message: `${flag} needs a value` };

		setValue(value);
		index++;
	}

	return { ok: true, options };
}
