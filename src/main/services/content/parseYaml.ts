// Parses YAML text and, on failure, gives the first error's message and its 1-based line inside the text.
import { parseDocument } from "yaml";

/** Parsed YAML data, or the first error with its line inside the YAML text. */
export type YamlResult = { ok: true; data: unknown } | { ok: false; message: string; line: number };

/** Parses `source`, rejecting repeated keys. */
export function parseYaml(source: string): YamlResult
{
	const document = parseDocument(source, { prettyErrors: false, uniqueKeys: true });
	const firstError = document.errors[0];

	if (firstError === undefined) return { ok: true, data: document.toJS() };

	// Without pretty errors the yaml package gives a character offset, so count the line breaks before it.
	const offset = firstError.pos[0];
	const line = source.slice(0, offset).split("\n").length;

	return { ok: false, message: `YAML is malformed: ${firstError.message.split("\n")[0]}`, line };
}
