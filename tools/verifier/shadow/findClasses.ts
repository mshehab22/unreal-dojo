// Finds the classes and structs declared in cleaned C++ text, with their base class names and the data members they declare.
import { findClosing, splitTopLevel } from "./cppText";

/** One class or struct body found in a source file. */
export interface ClassDeclaration
{
	name: string;

	/** Base class names in declaration order (qualifiers and access words removed). */
	bases: string[];

	/** Data members the class declares itself (functions, types, and nested bodies are not members). */
	members: string[];

	/** Names of the member functions declared `static`; MSVC does not report C4458 inside a static function. */
	staticFunctions: string[];

	/** Index of the opening brace and of the closing brace in the cleaned text. */
	bodyStart: number;
	bodyEnd: number;
}

/** Words that start a statement which declares no data member. */
const NON_MEMBER_STARTS = /^(?:using|typedef|friend|template|static_assert|enum|namespace|public|private|protected)\b/;

/** Unreal macros that carry no declaration of their own; each is blanked together with its argument list. */
const ATTRIBUTE_MACROS = /\b(?:UPROPERTY|UFUNCTION|UMETA|UPARAM|UCLASS|USTRUCT|UENUM|UINTERFACE|GENERATED_BODY|GENERATED_UCLASS_BODY|GENERATED_USTRUCT_BODY|GENERATED_IINTERFACE_BODY)\b/g;

/** Words that can sit in front of a type or a name without being either. */
const DECLARATION_KEYWORDS = new Set(["struct", "class", "union", "enum"]);

/** Blanks attribute macros and their argument lists, and access specifiers, keeping the text length. */
function blankAttributes(body: string): string
{
	const characters = [...body];

	for (const match of body.matchAll(ATTRIBUTE_MACROS))
	{
		let end = match.index + match[0].length;
		const open = /^\s*\(/.exec(body.slice(end));

		if (open !== null)
		{
			const close = findClosing(body, end + open[0].length - 1);

			end = close < 0 ? body.length : close + 1;
		}

		for (let index = match.index; index < end; index++) if (characters[index] !== "\n") characters[index] = " ";
	}

	return characters.join("").replace(/\b(?:public|private|protected)\s*:(?!:)/g, (access) => " ".repeat(access.length));
}

/** Cuts a class body into the statements that sit directly in it; a nested `{ ... }` is reduced to `{}`. */
function topLevelStatements(body: string): string[]
{
	const statements: string[] = [];
	let depth = 0;
	let current = "";

	for (const character of body)
	{
		if (character === "{")
		{
			if (depth === 0) current += "{";
			depth++;
		}
		else if (character === "}")
		{
			depth--;

			if (depth === 0)
			{
				current += "}";

				// A function definition ends at its closing brace; an initializer or a nested type waits for its `;`.
				if (/\)\s*(?:\b(?:const|override|final|noexcept|volatile)\b\s*)*\{\}$/.test(current))
				{
					statements.push(current);
					current = "";
				}
			}
		}
		else if (depth === 0)
		{
			if (character === ";")
			{
				statements.push(current);
				current = "";
			}
			else
			{
				current += character;
			}
		}
	}

	statements.push(current);

	return statements;
}

/** The data member names one statement declares, or none when it is a function, a type, or something else. */
function memberNamesOf(statement: string): string[]
{
	const text = statement.replace(/\{\}/g, " ").replace(/\[[^\]]*\]/g, " ").trim();

	if (text === "" || NON_MEMBER_STARTS.test(text)) return [];

	if ((text.split("=")[0] ?? "").includes("(")) return [];

	// Each declarator loses its own initializer and bit field width: `int32 A = 0, B : 3 = 1;` declares A and B.
	const parts = splitTopLevel(text).map((part) => (part.split("=")[0] ?? "").replace(/:\s*\d+\s*$/, ""));
	const first = parts[0]?.trim().split(/[\s*&]+/).filter((word) => word !== "") ?? [];
	const minimumWords = DECLARATION_KEYWORDS.has(first[0] ?? "") ? 3 : 2;

	if (first.length < minimumWords) return [];

	const names: string[] = [];

	for (const part of parts)
	{
		const name = /([A-Za-z_]\w*)\s*(?::\s*\d+\s*)?$/.exec(part.trim())?.[1];

		if (name !== undefined) names.push(name);
	}

	return names;
}

/** The member function a statement declares or defines, with whether it is static; undefined when the statement is not a function. */
function functionOf(statement: string): { name: string; isStatic: boolean } | undefined
{
	const text = statement.replace(/\{\}/g, " ").trim().replace(/^template\b\s*/, "");

	if (text === "" || NON_MEMBER_STARTS.test(text)) return undefined;

	const head = text.split("=")[0] ?? "";
	const open = head.indexOf("(");
	const name = open < 0 ? undefined : /([A-Za-z_]\w*)\s*$/.exec(head.slice(0, open))?.[1];

	return name === undefined ? undefined : { name, isStatic: /\bstatic\b/.test(head.slice(0, open)) };
}

/** The base class names in a `: public A, protected B` list. */
function baseNamesOf(list: string): string[]
{
	return splitTopLevel(list)
		.map((entry) => entry.replace(/\b(?:public|protected|private|virtual)\b/g, " ").trim())
		.map((entry) => /([A-Za-z_]\w*)\s*$/.exec(entry)?.[1] ?? "")
		.filter((name) => name !== "");
}

/** Every class and struct with a body in `cleaned` (text from `cleanCpp`). */
export function findClasses(cleaned: string): ClassDeclaration[]
{
	const classes: ClassDeclaration[] = [];
	const pattern = /\b(class|struct)\s+(?:\w+_API\s+)?([A-Za-z_]\w*)\s*(?:\bfinal\b\s*)?(?::(?!:)([^{;]*))?\{/g;

	for (const match of cleaned.matchAll(pattern))
	{
		if (/\benum\s*$/.test(cleaned.slice(0, match.index))) continue;

		const bodyStart = match.index + match[0].length - 1;
		const bodyEnd = findClosing(cleaned, bodyStart);
		const body = cleaned.slice(bodyStart + 1, bodyEnd < 0 ? cleaned.length : bodyEnd);
		const statements = topLevelStatements(blankAttributes(body));
		const members = statements.flatMap(memberNamesOf);
		const functions = statements.map(functionOf).filter((found) => found !== undefined);

		classes.push({ name: match[2] ?? "", bases: baseNamesOf(match[3] ?? ""), members, staticFunctions: functions.filter((found) => found.isStatic).map((found) => found.name), bodyStart, bodyEnd: bodyEnd < 0 ? cleaned.length : bodyEnd });
	}

	return classes;
}
