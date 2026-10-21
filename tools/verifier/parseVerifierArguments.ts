// Turns the verifier's command line into options, rejecting unknown flags so a typo never silently checks less.

/** What the verifier was asked to do. */
export interface VerifierOptions
{
	/** The content folder (holds glossary.json, patterns.json, packs/, examples/). */
	contentFolder: string;

	/** Only read this pack. */
	packId?: string;

	/** Only report the file that defines this quest. */
	questId?: string;

	/** Engine root for compiling reference solutions (M1.8; refused until then). */
	enginePath?: string;

	help: boolean;
}

/** The result of reading the command line: options, or the reason they could not be read. */
export type ParsedArguments = { ok: true; options: VerifierOptions } | { ok: false; message: string };

/** Usage text printed by `--help` and after an argument error. */
export const USAGE = [
	"Usage: npx tsx tools/verify-content.ts [--pack <id>] [--quest <id>] [--content <folder>] [--engine <path>]",
	"  --pack <id>        only read packs/<id>",
	"  --quest <id>       only report the file that defines this quest",
	"  --content <folder> content folder to check (default: content/ in the repo)",
	"  --engine <path>    compile and test reference solutions (arrives in M1.8)",
].join("\n");

/** Reads `argv` (without the node and script entries). `defaultContentFolder` is used when `--content` is absent. */
export function parseVerifierArguments(argv: readonly string[], defaultContentFolder: string): ParsedArguments
{
	const options: VerifierOptions = { contentFolder: defaultContentFolder, help: false };
	const valueFlags = new Map<string, (value: string) => void>([
		["--pack", (value) => (options.packId = value)],
		["--quest", (value) => (options.questId = value)],
		["--content", (value) => (options.contentFolder = value)],
		["--engine", (value) => (options.enginePath = value)],
	]);

	for (let index = 0; index < argv.length; index++)
	{
		const flag = argv[index] ?? "";

		if (flag === "--help" || flag === "-h")
		{
			options.help = true;
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
