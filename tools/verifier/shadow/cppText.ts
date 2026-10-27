// Text helpers for the C4458 shadow scan. Every transform keeps the text the same length, so an index in the result is an index in the source.

/** A string of `length` spaces, except that newlines in `original` stay so line numbers survive. */
function blankLike(original: string): string
{
	return original.replace(/[^\n]/g, " ");
}

/** Blanks comments, string and character literals, and preprocessor lines (continuation lines included). */
export function blankNoise(source: string): string
{
	let result = "";
	let index = 0;
	let atLineStart = true;

	while (index < source.length)
	{
		const current = source[index] ?? "";
		const next = source[index + 1] ?? "";
		let end = index + 1;

		if (current === "/" && next === "/")
		{
			const newline = source.indexOf("\n", index);

			end = newline < 0 ? source.length : newline;
			result += blankLike(source.slice(index, end));
		}
		else if (current === "/" && next === "*")
		{
			const close = source.indexOf("*/", index + 2);

			end = close < 0 ? source.length : close + 2;
			result += blankLike(source.slice(index, end));
		}
		else if (current === "\"" || current === "'")
		{
			end = index + 1;

			while (end < source.length && source[end] !== current && source[end] !== "\n") end += source[end] === "\\" ? 2 : 1;

			end = Math.min(end + 1, source.length);
			result += blankLike(source.slice(index, end));
		}
		else if (current === "#" && atLineStart)
		{
			end = index;

			while (end < source.length && (source[end] !== "\n" || source[end - 1] === "\\")) end++;

			result += blankLike(source.slice(index, end));
		}
		else
		{
			result += current;
		}

		const consumed = source.slice(index, end);

		if (consumed.includes("\n")) atLineStart = /\n\s*$/.test(consumed);
		else if (/\S/.test(consumed)) atLineStart = false;

		index = end;
	}

	return result;
}

/** The index of the bracket that closes the one at `openIndex` (`(`, `[`, or `{`), or -1 when it never closes. */
export function findClosing(text: string, openIndex: number): number
{
	const open = text[openIndex] ?? "";
	const close = open === "(" ? ")" : open === "[" ? "]" : "}";
	let depth = 0;

	for (let index = openIndex; index < text.length; index++)
	{
		if (text[index] === open) depth++;
		else if (text[index] === close && --depth === 0) return index;
	}

	return -1;
}

/** Blanks the contents and brackets of template argument lists (`TArray<TObjectPtr<AActor>>`), leaving comparisons alone. */
export function blankAngles(text: string): string
{
	const characters = [...text];

	for (let start = 0; start < characters.length; start++)
	{
		if (characters[start] !== "<" || !/\w/.test(characters[start - 1] ?? "")) continue;

		let depth = 0;
		let parentheses = 0;
		let end = -1;

		for (let index = start; index < characters.length; index++)
		{
			const character = characters[index];

			if (character === ";" || character === "{" || character === "}") break;
			if (character === "(") parentheses++;
			if (character === ")" && --parentheses < 0) break;
			if (character === "<") depth++;
			if (character === ">" && characters[index - 1] !== "-" && --depth === 0)
			{
				end = index;
				break;
			}
		}

		if (end < 0) continue;

		for (let index = start; index <= end; index++) if (characters[index] !== "\n") characters[index] = " ";
	}

	return characters.join("");
}

/** Splits `text` at commas that sit outside every kind of bracket. */
export function splitTopLevel(text: string): string[]
{
	const parts: string[] = [];
	let depth = 0;
	let from = 0;

	for (let index = 0; index < text.length; index++)
	{
		const character = text[index];

		if (character === "(" || character === "[" || character === "{") depth++;
		else if (character === ")" || character === "]" || character === "}") depth--;
		else if (character === "," && depth === 0)
		{
			parts.push(text.slice(from, index));
			from = index + 1;
		}
	}

	parts.push(text.slice(from));

	return parts;
}

/** The 1-based line of `index` in `text`. */
export function lineOf(text: string, index: number): number
{
	let line = 1;

	for (let position = 0; position < index && position < text.length; position++) if (text[position] === "\n") line++;

	return line;
}

/** Cleans C++ source for scanning: no comments, strings, preprocessor lines, or template argument lists. */
export function cleanCpp(source: string): string
{
	return blankAngles(blankNoise(source));
}
