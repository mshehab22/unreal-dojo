// Finds parameters and locals that share a name with a data member of their class, which MSVC rejects as error C4458.
import { ClassRegistry } from "./ClassRegistry";
import { cleanCpp, lineOf } from "./cppText";
import { findClasses } from "./findClasses";
import { findFunctions } from "./findFunctions";

/** One C++ source text. `unit` groups files that build together (one quest's solution, or one quest's starter). */
export interface SourceFile
{
	unit: string;
	path: string;
	text: string;
}

/** A parameter or local whose name hides a data member. */
export interface ShadowFinding
{
	unit: string;
	path: string;
	line: number;
	name: string;
	kind: "parameter" | "local";
	className: string;
	functionName: string;

	/** The class that declares the hidden member (the class itself, a Dojo base, or an engine class). */
	owner: string;
}

/** Scans `files` together, so a header's members apply to the functions in its source file and to classes derived elsewhere. */
export function findShadowedMembers(files: readonly SourceFile[]): ShadowFinding[]
{
	const registry = new ClassRegistry();
	const scanned = files.map((file) =>
	{
		const cleaned = cleanCpp(file.text);
		const classes = findClasses(cleaned);

		for (const declaration of classes) registry.add(file.unit, declaration);

		return { file, cleaned, classes };
	});
	const findings: ShadowFinding[] = [];

	for (const { file, cleaned, classes } of scanned)
	{
		for (const definition of findFunctions(cleaned, classes))
		{
			if (definition.className === undefined || registry.isStaticFunction(file.unit, definition.className, definition.functionName)) continue;

			const members = registry.membersOf(file.unit, definition.className);

			for (const declared of definition.names)
			{
				const owner = members.get(declared.name);

				if (owner === undefined) continue;

				findings.push({ unit: file.unit, path: file.path, line: lineOf(cleaned, declared.index), name: declared.name, kind: declared.kind, className: definition.className, functionName: definition.functionName, owner });
			}
		}
	}

	return findings;
}
