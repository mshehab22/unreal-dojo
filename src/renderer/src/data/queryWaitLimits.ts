// How long a screen waits for main to answer a query before it shows the "no answer" error with a retry (W12, A1250).
import { QUERY_KEYS } from "./queryKeys";

/** The wait for a save, rules, or content read. Each answers in well under a second on a working machine. A hosted Windows runner stalled a content read for 16 s once (CI run 40467374564), so the limit sits well above that (M5.1l, A1262). */
export const DATA_QUERY_WAIT_LIMIT_MS = 45_000;

/** The wait for a machine probe (engine registry, Visual Studio, the Claude Code version), which runs outside commands that each have their own 15 to 20 s limit in main. */
export const PROBE_QUERY_WAIT_LIMIT_MS = 120_000;

/** Keys whose loader probes the machine instead of reading the save or the content. */
const PROBE_KEYS: readonly string[] = [QUERY_KEYS.engines, QUERY_KEYS.toolchain, QUERY_KEYS.environment, QUERY_KEYS.reviewProviders];

/** The wait limit of one query key, in milliseconds. */
export function waitLimitFor(key: string): number
{
	return PROBE_KEYS.includes(key) ? PROBE_QUERY_WAIT_LIMIT_MS : DATA_QUERY_WAIT_LIMIT_MS;
}
