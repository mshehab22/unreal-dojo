// Remembers the classes found in the scanned files and answers which data members a class has, own and inherited.
import { engineClassFor, engineMemberOwners } from "./engineClassMembers";
import type { ClassDeclaration } from "./findClasses";

/** Where a data member comes from: the class that declares it. */
export type MemberOwners = Map<string, string>;

/** Classes grouped by the unit (a quest's solution, or a quest's starter) they were declared in. */
export class ClassRegistry
{
	private readonly byUnit = new Map<string, Map<string, ClassDeclaration[]>>();

	/** Records a class declared in `unit`. */
	add(unit: string, declaration: ClassDeclaration): void
	{
		const classes = this.byUnit.get(unit) ?? new Map<string, ClassDeclaration[]>();
		const sameName = classes.get(declaration.name) ?? [];

		sameName.push(declaration);
		classes.set(declaration.name, sameName);
		this.byUnit.set(unit, classes);
	}

	/** True when `className` declares a static function called `functionName`. An overload set that mixes static and non-static is exempt too, because a definition cannot be told apart by name alone. */
	declaresStaticFunction(unit: string, className: string, functionName: string): boolean
	{
		const declarations = this.find(unit, className) ?? [];

		return declarations.some((declaration) => declaration.staticFunctions.includes(functionName));
	}

	/**
	 * Every data member of `className` and of its bases, mapped to the class that declares it. Classes are looked up in
	 * `unit` first, then in any other unit (a quest can build on an earlier quest's classes), then among the engine classes.
	 */
	membersOf(unit: string, className: string): MemberOwners
	{
		const owners: MemberOwners = new Map();

		this.collect(unit, className, owners, new Set());

		return owners;
	}

	/** Adds `className`'s members to `owners`, then walks its bases; `visited` stops an inheritance loop. */
	private collect(unit: string, className: string, owners: MemberOwners, visited: Set<string>): void
	{
		if (visited.has(className)) return;

		visited.add(className);

		const declarations = this.find(unit, className);

		if (declarations === undefined)
		{
			this.collectEngine(className, owners);
			return;
		}

		for (const declaration of declarations)
		{
			for (const member of declaration.members) if (!owners.has(member)) owners.set(member, className);
			for (const base of declaration.bases) this.collect(unit, base, owners, visited);
		}
	}

	/** Adds the curated members of the engine class `className` derives from. */
	private collectEngine(className: string, owners: MemberOwners): void
	{
		const engineClass = engineClassFor(className);

		if (engineClass === undefined) return;

		for (const [member, owner] of engineMemberOwners(engineClass)) if (!owners.has(member)) owners.set(member, owner);
	}

	/** The declarations of `className`: those in `unit`, else those in the first other unit that has it. */
	private find(unit: string, className: string): ClassDeclaration[] | undefined
	{
		const own = this.byUnit.get(unit)?.get(className);

		if (own !== undefined) return own;

		for (const classes of this.byUnit.values())
		{
			const found = classes.get(className);

			if (found !== undefined) return found;
		}

		return undefined;
	}
}
