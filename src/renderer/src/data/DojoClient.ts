// What every screen talks to: the preload's DojoApi, or the typed fake that stands in for it.
import type { DojoApi } from "@shared/ipc";

/** The one API the renderer's data layer calls: the real bridge or the fake, never both. */
export type DojoClient = DojoApi;
