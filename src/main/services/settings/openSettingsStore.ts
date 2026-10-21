// Opens the settings file, setting a corrupt one aside instead of letting it stop the app from starting.
import { MemorySettingsStore } from "./MemorySettingsStore";
import type { SettingsStore } from "./SettingsStore";

/** What opening the store needs; the composition root passes electron-store and `fs.renameSync`, tests pass fakes. */
export interface SettingsStoreOpening
{
	/** Opens the real store. May throw while reading (electron-store parses the file on open and on every access). */
	open: () => SettingsStore;

	/** The settings file's path (electron-store's default `<userData>/config.json`). */
	configPath: string;

	/** Renames a file. */
	renameFile: (fromPath: string, toPath: string) => void;

	/** The current time, used in the set-aside file's name. */
	now: () => Date;

	/** Writes one line to the main log. */
	warn: (message: string) => void;
}

/** Tells whether an error is a JSON parse failure, which is what an unparseable `config.json` throws. */
function isParseError(error: unknown): boolean
{
	return error instanceof Error && error.name === "SyntaxError";
}

/** Returns `config.invalid-<time>.json` next to the original, with a time that is safe in file names on Windows and macOS. */
export function invalidConfigPath(configPath: string, now: Date): string
{
	const stamp = now.toISOString().replace(/[:.]/g, "-");

	return configPath.replace(/config\.json$/, `config.invalid-${stamp}.json`);
}

/** Opens the store and reads it once, so a parse failure shows up here and not on the first settings call. */
function openAndRead(open: () => SettingsStore): SettingsStore
{
	const store = open();
	store.readAll();

	return store;
}

/**
 * Opens the settings store. An unparseable file is renamed to `config.invalid-<time>.json` (kept for the
 * learner or a bug report) and a fresh file starts from the defaults. If the file still cannot be used, or
 * fails for another reason (permissions), the app starts on an in-memory store so it opens anyway. Logs once.
 */
export function openSettingsStore(opening: SettingsStoreOpening): SettingsStore
{
	try
	{
		return openAndRead(opening.open);
	}
	catch (error)
	{
		const reason = error instanceof Error ? error.message : String(error);

		if (isParseError(error))
		{
			try
			{
				const setAsidePath = invalidConfigPath(opening.configPath, opening.now());

				opening.renameFile(opening.configPath, setAsidePath);
				const store = openAndRead(opening.open);

				opening.warn(`[settings] ${opening.configPath} could not be parsed (${reason}); it was renamed to ${setAsidePath} and settings start from the defaults.`);

				return store;
			}
			catch (recoveryError)
			{
				const recoveryReason = recoveryError instanceof Error ? recoveryError.message : String(recoveryError);
				opening.warn(`[settings] ${opening.configPath} could not be parsed (${reason}) or set aside (${recoveryReason}); settings start from the defaults and are not saved this session.`);

				return new MemorySettingsStore();
			}
		}

		opening.warn(`[settings] ${opening.configPath} could not be opened (${reason}); settings start from the defaults and are not saved this session.`);

		return new MemorySettingsStore();
	}
}
