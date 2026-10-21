// What every screen talks to: the preload's DojoApi plus the content methods that arrive with M0.2b.
import type { DojoApi } from "@shared/ipc";
import type { GlossaryEntry, Pack, PatternCard } from "@shared/types/content";

/**
 * Content methods the screens need that are not in `src/shared/ipc.ts` yet (A89 names them; M0.2b adds them).
 * When M0.2b merges, these move into DojoInvokeApi and this interface is deleted.
 */
export interface DojoContentApi
{
	/** Every pack with its worlds and quests, in map order. */
	listPacks(): Promise<Pack[]>;

	/** Every glossary entry, for the Codex. */
	getGlossary(): Promise<GlossaryEntry[]>;

	/** Every pattern card, for the Character screen. */
	getPatternCards(): Promise<PatternCard[]>;
}

/** The one API the renderer's data layer calls: the real bridge or the fake, never both. */
export type DojoClient = DojoApi & DojoContentApi;

/** Names of the content methods, for wrapping the real bridge. */
export const CONTENT_METHODS = ["listPacks", "getGlossary", "getPatternCards"] as const satisfies readonly (keyof DojoContentApi)[];
