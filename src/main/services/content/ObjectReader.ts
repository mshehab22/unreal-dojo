// Reads typed fields out of parsed YAML or JSON, reporting every wrong or missing field with its path.
import type { ProblemList, ProblemLocation } from "./ProblemList";

/** A plain object from YAML or JSON. */
type UnknownRecord = Record<string, unknown>;

/** Checks whether a parsed value is a plain object (not a list, not null). */
function isRecord(value: unknown): value is UnknownRecord
{
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Wraps one parsed object. Each getter returns a usable placeholder when the field is wrong and records
 * the problem, so a reader can keep going and report everything in one pass. Call `finish()` last to
 * report fields nobody asked for (usually typos).
 */
export class ObjectReader
{
	private readonly record: UnknownRecord;
	private readonly path: string;
	private readonly problems: ProblemList;
	private readonly location: ProblemLocation;
	private readonly readKeys = new Set<string>();

	/** Use `ObjectReader.from` instead, which checks that the value is an object first. */
	private constructor(record: UnknownRecord, path: string, problems: ProblemList, location: ProblemLocation)
	{
		this.record = record;
		this.path = path;
		this.problems = problems;
		this.location = location;
	}

	/** Wraps `value` if it is an object; otherwise reports it and returns undefined. */
	static from(value: unknown, path: string, problems: ProblemList, location: ProblemLocation): ObjectReader | undefined
	{
		if (!isRecord(value))
		{
			problems.add(`${path || "value"}: expected an object with named fields`, location);
			return undefined;
		}

		return new ObjectReader(value, path, problems, location);
	}

	/** Whether the object has this field at all. */
	has(key: string): boolean
	{
		return this.record[key] !== undefined;
	}

	/** Required non-empty text. */
	string(key: string): string
	{
		const value = this.take(key);

		if (typeof value !== "string" || value.trim() === "")
		{
			this.report(key, value === undefined ? "missing (expected text)" : "expected non-empty text");
			return "";
		}

		return value;
	}

	/** Optional text; absent gives undefined, present must be non-empty text. */
	optionalString(key: string): string | undefined
	{
		if (!this.has(key))
		{
			this.take(key);
			return undefined;
		}

		return this.string(key);
	}

	/** Required whole number between `minimum` and `maximum` inclusive. */
	integer(key: string, minimum: number, maximum: number = Number.MAX_SAFE_INTEGER): number
	{
		const value = this.take(key);

		if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > maximum)
		{
			const range = maximum === Number.MAX_SAFE_INTEGER ? `${minimum} or more` : `${minimum} to ${maximum}`;
			this.report(key, value === undefined ? `missing (expected a whole number, ${range})` : `expected a whole number, ${range}`);
			return minimum;
		}

		return value;
	}

	/** Required text that must be one of `allowed`. */
	oneOf<Allowed extends string>(key: string, allowed: readonly Allowed[]): Allowed
	{
		const value = this.take(key);

		if (typeof value !== "string" || !(allowed as readonly string[]).includes(value))
		{
			const shown = value === undefined ? "missing" : `"${String(value)}" is not allowed`;
			this.report(key, `${shown} (expected one of: ${allowed.join(", ")})`);
			return allowed[0] as Allowed;
		}

		return value as Allowed;
	}

	/** Required list of non-empty text; `allowEmpty` false also rejects an empty list. */
	stringList(key: string, allowEmpty: boolean = true): string[]
	{
		const value = this.take(key);

		if (!Array.isArray(value))
		{
			this.report(key, value === undefined ? "missing (expected a list of text)" : "expected a list of text");
			return [];
		}

		if (!allowEmpty && value.length === 0)
		{
			this.report(key, "expected at least one entry");
			return [];
		}

		const badIndex = value.findIndex((entry) => typeof entry !== "string" || entry.trim() === "");

		if (badIndex >= 0)
		{
			this.report(`${key}[${badIndex}]`, "expected non-empty text");
			return [];
		}

		return value as string[];
	}

	/** Optional list of text; absent gives undefined. */
	optionalStringList(key: string): string[] | undefined
	{
		if (!this.has(key))
		{
			this.take(key);
			return undefined;
		}

		return this.stringList(key);
	}

	/** Required list of objects, each read by `readEntry`; entries that fail are left out. */
	objectList<Entry>(key: string, readEntry: (entry: ObjectReader) => Entry, allowEmpty: boolean = false): Entry[]
	{
		const value = this.take(key);

		if (!Array.isArray(value))
		{
			this.report(key, value === undefined ? "missing (expected a list)" : "expected a list");
			return [];
		}

		if (!allowEmpty && value.length === 0)
		{
			this.report(key, "expected at least one entry");
			return [];
		}

		return readObjectList(value, this.childPath(key), this.problems, this.location, readEntry);
	}

	/** Optional list of objects; absent gives undefined. */
	optionalObjectList<Entry>(key: string, readEntry: (entry: ObjectReader) => Entry): Entry[] | undefined
	{
		if (!this.has(key))
		{
			this.take(key);
			return undefined;
		}

		return this.objectList(key, readEntry);
	}

	/** Reports a problem about one field of this object. */
	report(key: string, message: string): void
	{
		this.problems.add(`${this.childPath(key)}: ${message}`, this.location);
	}

	/** Reports every field that no getter asked for, which is almost always a typo. */
	finish(): void
	{
		for (const key of Object.keys(this.record))
		{
			if (!this.readKeys.has(key)) this.report(key, "unknown field");
		}
	}

	/** Marks a field as read and returns its raw value. */
	private take(key: string): unknown
	{
		this.readKeys.add(key);
		return this.record[key];
	}

	/** The dotted path of a field, used in problem messages. */
	private childPath(key: string): string
	{
		return this.path ? `${this.path}.${key}` : key;
	}
}

/** Reads every object in a raw list with `readEntry`, reporting entries that are not objects. */
export function readObjectList<Entry>(
	values: unknown[],
	path: string,
	problems: ProblemList,
	location: ProblemLocation,
	readEntry: (entry: ObjectReader) => Entry,
): Entry[]
{
	const entries: Entry[] = [];

	values.forEach((value, index) =>
	{
		const reader = ObjectReader.from(value, `${path}[${index}]`, problems, location);

		if (reader === undefined) return;

		entries.push(readEntry(reader));
		reader.finish();
	});

	return entries;
}
