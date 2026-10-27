// Finds function definitions in cleaned C++ text and the names they bring into scope: parameters and local variables.
import type { ClassDeclaration } from "./findClasses";
import { findClosing, splitTopLevel } from "./cppText";

/** A name a function declares, with where (an index in the cleaned text). */
export interface DeclaredName
{
	name: string;
	kind: "parameter" | "local";
	index: number;
}

/** One function definition. */
export interface FunctionDefinition
{
	/** The class it belongs to (`AFoo::Bar` or defined inside `class AFoo`), or undefined for a free function. */
	className?: string;
	functionName: string;
	names: DeclaredName[];
}

/** Words that can precede `(` and `{` without being a function. */
const CONTROL_WORDS = new Set(["if", "for", "while", "switch", "catch", "return", "sizeof", "alignof", "decltype", "static_assert", "defined"]);

/** C++ words that look like a name at the end of a declaration but are types. */
const TYPE_WORDS = new Set(["int", "float", "double", "bool", "char", "long", "short", "unsigned", "signed", "void", "auto", "const"]);

/** The end of a function head: `)`, qualifiers, an optional constructor initializer list, then the body's `{`. */
const FUNCTION_HEAD = /\)\s*(?:\b(?:const|noexcept|override|final|volatile)\b\s*)*(?::(?!:)[^;{}]*?)?\{/g;

/** A local declaration at the start of a statement: optional qualifiers, a type, pointer or reference marks, then the name. */
const LOCAL_DECLARATION = /^\s*(?:(?:const|constexpr|static|volatile|mutable|thread_local|register|struct|class|enum|typename)\s+)*(?!(?:return|delete|new|throw|case|goto|using|typedef|co_return|co_yield|namespace|sizeof|else|do|default|public|private|protected)\b)[A-Za-z_]\w*(?:\s*::\s*\w+)*(?:\s*[*&]+\s*|\s+)(?:(?:const|volatile|__restrict)\s+)*([A-Za-z_]\w*)\s*(?=[=[({:,)]|$)/d;

/** The innermost class whose body holds `index`. */
function enclosingClass(classes: readonly ClassDeclaration[], index: number): ClassDeclaration | undefined
{
	let best: ClassDeclaration | undefined;

	for (const candidate of classes)
	{
		if (index <= candidate.bodyStart || index >= candidate.bodyEnd) continue;
		if (best === undefined || candidate.bodyEnd - candidate.bodyStart < best.bodyEnd - best.bodyStart) best = candidate;
	}

	return best;
}

/** The index of the `(` that matches the `)` at `closeIndex`, or -1. */
function findOpening(text: string, closeIndex: number): number
{
	let depth = 0;

	for (let index = closeIndex; index >= 0; index--)
	{
		if (text[index] === ")") depth++;
		else if (text[index] === "(" && --depth === 0) return index;
	}

	return -1;
}

/** The parameter names in a parameter list that starts at `listStart` in the cleaned text. */
function parameterNames(text: string, listStart: number, listEnd: number): DeclaredName[]
{
	const names: DeclaredName[] = [];
	let offset = listStart;

	for (const part of splitTopLevel(text.slice(listStart, listEnd)))
	{
		const withoutDefault = part.split("=")[0] ?? "";
		const match = /^(?=[\s\S]*[A-Za-z_])[\s\S]+?[\s*&]\s*([A-Za-z_]\w*)\s*(?:\[[^\]]*\])?\s*$/.exec(withoutDefault);
		const name = match?.[1];

		if (name !== undefined && !TYPE_WORDS.has(name)) names.push({ name, kind: "parameter", index: offset + withoutDefault.lastIndexOf(name) });

		offset += part.length + 1;
	}

	return names;
}

/** Blanks lambda parameter lists and bodies: MSVC reports no C4458 for names a lambda declares (checked with cl /W4). */
function blankLambdas(body: string): string
{
	const characters = [...body];

	for (let index = 0; index < body.length; index++)
	{
		if (body[index] !== "[" || /[\w)\]]/.test(/(\S)\s*$/.exec(body.slice(0, index))?.[1] ?? "")) continue;

		const closeCapture = findClosing(body, index);

		if (closeCapture < 0) continue;

		let cursor = closeCapture + 1;
		const parameters = /^\s*\(/.exec(body.slice(cursor));

		if (parameters !== null)
		{
			const closeParameters = findClosing(body, cursor + parameters[0].length - 1);

			if (closeParameters < 0) continue;

			cursor = closeParameters + 1;
		}

		const opening = /^\s*(?:\b(?:mutable|constexpr|noexcept)\b\s*)*(?:->[^{;]*)?\{/.exec(body.slice(cursor));

		if (opening === null) continue;

		const closeBody = findClosing(body, cursor + opening[0].length - 1);
		const end = closeBody < 0 ? body.length : closeBody + 1;

		for (let blank = closeCapture + 1; blank < end; blank++) if (characters[blank] !== "\n") characters[blank] = " ";

		index = end - 1;
	}

	return characters.join("");
}

/** The local variable names a body declares: statement by statement, plus the declarations in `for`, `if`, and `catch` headers. */
function localNames(text: string, bodyStart: number, bodyEnd: number): DeclaredName[]
{
	const body = blankLambdas(text.slice(bodyStart, bodyEnd)).replace(/\b(?:for|if|while|switch|catch)\s*\(|\b(?:else|do)\b/g, (word) => ";".padEnd(word.length, " "));
	const names: DeclaredName[] = [];
	let from = 0;

	for (let index = 0; index <= body.length; index++)
	{
		const character = body[index];

		if (index < body.length && character !== ";" && character !== "{" && character !== "}") continue;

		const statement = body.slice(from, index);
		const declaration = LOCAL_DECLARATION.exec(statement);
		const nameRange = declaration?.indices?.[1];

		if (declaration !== null && nameRange !== undefined)
		{
			const [nameStart, nameEnd] = nameRange;
			const first = statement.slice(nameStart, nameEnd);

			if (!TYPE_WORDS.has(first)) names.push({ name: first, kind: "local", index: bodyStart + from + nameStart });

			// `int A = 1, B = 2;` declares both.
			let offset = nameEnd;

			for (const part of splitTopLevel(statement.slice(nameEnd)).slice(1))
			{
				offset += statement.slice(offset).indexOf(",") + 1;

				const extra = /^\s*[*&]*\s*([A-Za-z_]\w*)\s*(?:=|\[|\(|$)/.exec(part);
				const extraName = extra?.[1];

				if (extraName !== undefined && !TYPE_WORDS.has(extraName)) names.push({ name: extraName, kind: "local", index: bodyStart + from + offset + part.indexOf(extraName) });
			}
		}

		from = index + 1;
	}

	return names;
}

/** Every function definition with a body in `cleaned` (text from `cleanCpp`), given the classes found in the same text. */
export function findFunctions(cleaned: string, classes: readonly ClassDeclaration[]): FunctionDefinition[]
{
	const functions: FunctionDefinition[] = [];
	const pattern = new RegExp(FUNCTION_HEAD.source, "g");
	let match = pattern.exec(cleaned);

	while (match !== null)
	{
		const closeParenthesis = match.index;
		const openParenthesis = findOpening(cleaned, closeParenthesis);
		const bodyStart = match.index + match[0].length - 1;
		const nameMatch = openParenthesis < 0 ? null : /((?:[A-Za-z_]\w*\s*::\s*)*)(~?[A-Za-z_]\w*)\s*$/.exec(cleaned.slice(0, openParenthesis));
		const functionName = nameMatch?.[2];

		if (openParenthesis < 0 || functionName === undefined || CONTROL_WORDS.has(functionName))
		{
			match = pattern.exec(cleaned);
			continue;
		}

		const bodyEnd = findClosing(cleaned, bodyStart);
		const end = bodyEnd < 0 ? cleaned.length : bodyEnd;
		const qualifier = (nameMatch?.[1] ?? "").split("::").map((part) => part.trim()).filter((part) => part !== "").pop();
		const className = qualifier ?? enclosingClass(classes, openParenthesis)?.name;
		const names = [...parameterNames(cleaned, openParenthesis + 1, closeParenthesis), ...localNames(cleaned, bodyStart + 1, end)];

		functions.push(className === undefined ? { functionName, names } : { className, functionName, names });
		pattern.lastIndex = end + 1;
		match = pattern.exec(cleaned);
	}

	return functions;
}
