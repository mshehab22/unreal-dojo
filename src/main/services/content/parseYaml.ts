// Parses YAML through gray-matter (front matter, and the ```yaml blocks inside sections) and reports the error line.
import matter from "gray-matter";

/** Parsed YAML data, or the first error with its 1-based line inside the YAML text. */
export type YamlResult = { ok: true; data: unknown } | { ok: false; message: string; line: number };

/** The parts of a js-yaml error that gray-matter passes through. */
interface YamlError
{
	reason?: string;
	mark?: { line?: number };
}

/** Parses a YAML document by handing it to gray-matter as front matter. Repeated keys are an error. */
export function parseYaml(source: string): YamlResult
{
	try
	{
		// Passing an options object turns off gray-matter's cache, which would otherwise return stale data objects.
		const parsed = matter(`---\n${source}\n---\n`, {});

		return { ok: true, data: parsed.data };
	}
	catch (error)
	{
		const yamlError = error as YamlError;

		// Line 0 of the wrapped text is the opening ---, so js-yaml's 0-based line is the 1-based line in `source`.
		const line = Math.max(1, yamlError.mark?.line ?? 1);
		const reason = yamlError.reason ?? (error instanceof Error ? error.message.split("\n")[0] : String(error));

		return { ok: false, message: `YAML is malformed: ${reason}`, line };
	}
}
