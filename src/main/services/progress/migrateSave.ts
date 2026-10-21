// Upgrades a parsed save file from an older schema version to the current one, before the schema checks it.
import { SAVE_VERSION } from "./rules";

/** A plain JSON object. */
type JsonObject = Record<string, unknown>;

/** True for a plain object (not null, not an array). */
function isObject(value: unknown): value is JsonObject
{
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Version 1 to 2: each quest gains `revealedHints`, the indexes 0 to hintsRevealed - 1 (hints were always revealed in order) (A500). */
function fromVersionOne(save: JsonObject): JsonObject
{
	const quests = isObject(save.quests) ? save.quests : {};
	const migratedQuests: JsonObject = {};

	for (const [questId, quest] of Object.entries(quests))
	{
		if (!isObject(quest) || Array.isArray(quest.revealedHints))
		{
			migratedQuests[questId] = quest;
			continue;
		}

		const count = typeof quest.hintsRevealed === "number" && quest.hintsRevealed > 0 ? Math.floor(quest.hintsRevealed) : 0;
		migratedQuests[questId] = { ...quest, revealedHints: Array.from({ length: count }, (_, index) => index) };
	}

	return { ...save, quests: migratedQuests, version: 2 };
}

/** Runs every migration from the save's version up to SAVE_VERSION. Anything that is not an object, or has no version, is returned as it is for the schema to judge. */
export function migrateSave(value: unknown): unknown
{
	if (!isObject(value) || typeof value.version !== "number") return value;

	let save = value;

	if (save.version === 1) save = fromVersionOne(save);

	return save.version === SAVE_VERSION ? save : value;
}
