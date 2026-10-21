// Small payload checks for the IPC boundary. Each check returns null when the value is fine, or a sentence naming the problem.

/** Checks one value received from the renderer. `path` names the value in the problem text, for example `patch.loopMode`. */
export type PayloadCheck = (value: unknown, path: string) => string | null;

/** Longest id the app accepts (quest, term, item, run, attempt, session ids). */
const MAXIMUM_ID_LENGTH = 128;

/** Ids are letters, digits, dot, underscore, and dash, starting with a letter or digit. Keeps ids safe to use in file names. */
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Learner file names: a plain file name with a C++ or text extension, never a path. */
const FILE_NAME_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_.-]*\.(h|hpp|cpp|inl|txt|ini)$/;

/** Most learner files in one request. */
const MAXIMUM_FILE_COUNT = 50;

/** Largest learner file in characters (about 1 MB). */
const MAXIMUM_FILE_LENGTH = 1_000_000;

/** Most items in any array payload (breakdown pieces, edges, answers). */
const MAXIMUM_ARRAY_LENGTH = 500;

/** Longest free text the learner can send (notes, sentences, names, paths, keys). */
const MAXIMUM_TEXT_LENGTH = 20_000;

/** Tells whether a value is a plain object (not null, not an array). */
function isPlainObject(value: unknown): value is Record<string, unknown>
{
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Accepts a string whose length is within the given bounds. */
export function checkString(options: { minimumLength?: number; maximumLength?: number } = {}): PayloadCheck
{
	const minimumLength = options.minimumLength ?? 0;
	const maximumLength = options.maximumLength ?? MAXIMUM_TEXT_LENGTH;

	return (value, path) =>
	{
		if (typeof value !== "string") return `${path} must be text`;
		if (value.length < minimumLength) return `${path} must be at least ${minimumLength} characters`;
		if (value.length > maximumLength) return `${path} must be at most ${maximumLength} characters`;

		return null;
	};
}

/** Accepts an id: letters, digits, dot, underscore, and dash, up to 128 characters. */
export function checkId(): PayloadCheck
{
	return (value, path) =>
	{
		if (typeof value !== "string") return `${path} must be an id (text)`;
		if (value.length === 0 || value.length > MAXIMUM_ID_LENGTH) return `${path} must be 1 to ${MAXIMUM_ID_LENGTH} characters`;
		if (!ID_PATTERN.test(value)) return `${path} may only hold letters, digits, dot, underscore, and dash`;

		return null;
	};
}

/** Accepts true or false. */
export function checkBoolean(): PayloadCheck
{
	return (value, path) => (typeof value === "boolean" ? null : `${path} must be true or false`);
}

/** Accepts a whole number within the given bounds. */
export function checkInteger(options: { minimum: number; maximum: number }): PayloadCheck
{
	return (value, path) =>
	{
		if (typeof value !== "number" || !Number.isInteger(value)) return `${path} must be a whole number`;
		if (value < options.minimum || value > options.maximum) return `${path} must be between ${options.minimum} and ${options.maximum}`;

		return null;
	};
}

/** Accepts one of a fixed set of strings. */
export function checkOneOf(allowedValues: readonly string[]): PayloadCheck
{
	return (value, path) => (typeof value === "string" && allowedValues.includes(value) ? null : `${path} must be one of ${allowedValues.join(", ")}`);
}

/** Accepts null, or a value that passes the inner check. */
export function checkNullable(innerCheck: PayloadCheck): PayloadCheck
{
	return (value, path) => (value === null ? null : innerCheck(value, path));
}

/** Accepts a missing field (undefined), or a value that passes the inner check. Only meaningful inside `checkObject`. */
export function checkOptional(innerCheck: PayloadCheck): PayloadCheck
{
	return (value, path) => (value === undefined ? null : innerCheck(value, path));
}

/** Accepts an array of up to 500 items where every item passes the inner check. */
export function checkArray(itemCheck: PayloadCheck): PayloadCheck
{
	return (value, path) =>
	{
		if (!Array.isArray(value)) return `${path} must be a list`;
		if (value.length > MAXIMUM_ARRAY_LENGTH) return `${path} must have at most ${MAXIMUM_ARRAY_LENGTH} items`;

		for (const [index, item] of value.entries())
		{
			const problem = itemCheck(item, `${path}[${index}]`);
			if (problem) return problem;
		}

		return null;
	};
}

/** Accepts a plain object with exactly the listed fields (missing ones must be `checkOptional`); unknown fields are a problem. */
export function checkObject(fieldChecks: Record<string, PayloadCheck>): PayloadCheck
{
	return (value, path) =>
	{
		if (!isPlainObject(value)) return `${path} must be an object`;

		for (const fieldName of Object.keys(value))
		{
			if (!(fieldName in fieldChecks)) return `${path}.${fieldName} is not an expected field`;
		}

		for (const [fieldName, fieldCheck] of Object.entries(fieldChecks))
		{
			const problem = fieldCheck(value[fieldName], `${path}.${fieldName}`);
			if (problem) return problem;
		}

		return null;
	};
}

/** Accepts one of several object shapes picked by a string `kind` field. */
export function checkTaggedUnion(shapesByKind: Record<string, Record<string, PayloadCheck>>): PayloadCheck
{
	const kinds = Object.keys(shapesByKind);

	return (value, path) =>
	{
		if (!isPlainObject(value)) return `${path} must be an object`;

		const shape = typeof value.kind === "string" ? shapesByKind[value.kind] : undefined;
		if (!shape) return `${path}.kind must be one of ${kinds.join(", ")}`;

		return checkObject({ ...shape, kind: checkOneOf(kinds) })(value, path);
	};
}

/** Accepts learner files: up to 50 plain file names (no folders, no `..`) mapped to text of at most about 1 MB each. */
export function checkFileMap(): PayloadCheck
{
	return (value, path) =>
	{
		if (!isPlainObject(value)) return `${path} must be an object of file names to file text`;

		const entries = Object.entries(value);
		if (entries.length > MAXIMUM_FILE_COUNT) return `${path} must have at most ${MAXIMUM_FILE_COUNT} files`;

		for (const [fileName, fileText] of entries)
		{
			if (!FILE_NAME_PATTERN.test(fileName) || fileName.includes("..")) return `${path} has a file name that is not allowed: ${JSON.stringify(fileName)}`;
			if (typeof fileText !== "string") return `${path}.${fileName} must be text`;
			if (fileText.length > MAXIMUM_FILE_LENGTH) return `${path}.${fileName} is larger than ${MAXIMUM_FILE_LENGTH} characters`;
		}

		return null;
	};
}
