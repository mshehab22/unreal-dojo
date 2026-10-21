// The Windows registry lookups for engine installs, behind an interface so the locator does not know how they are read.

/** Lists engine folders recorded in the Windows registry. */
export interface EngineRegistry
{
	/** Returns every engine folder the registry knows about; an empty list when there are none or the query fails. */
	engineFolders(): Promise<string[]>;
}
