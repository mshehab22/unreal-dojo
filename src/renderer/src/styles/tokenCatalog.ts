// Names and purposes of every design token in tokens.css, read by the /dev/tokens gallery. Values are read live from CSS.

/** One token: its CSS variable name and what it is for. */
export interface TokenEntry
{
	readonly name: string;
	readonly purpose: string;
}

/** The four content packs, in teaching order, each with its accent. */
export const PACK_IDS = ["foundations", "patterns", "mechanics", "systems"] as const;

/** A content pack id. */
export type PackId = (typeof PACK_IDS)[number];

/** Display names and one-line roles for the pack accents. */
export const PACK_ACCENTS: Readonly<Record<PackId, { label: string; hue: string; purpose: string }>> = {
	foundations: { label: "Foundations", hue: "Amber", purpose: "Unreal C++ basics" },
	patterns: { label: "Patterns", hue: "Violet", purpose: "Game programming patterns" },
	mechanics: { label: "Mechanics", hue: "Cyan", purpose: "Gameplay mechanics" },
	systems: { label: "Systems", hue: "Green", purpose: "Larger game systems" },
};

/** Surface and text colors, deepest first. */
export const NEUTRAL_COLORS: readonly TokenEntry[] = [
	{ name: "--color-ink", purpose: "App background" },
	{ name: "--color-surface", purpose: "Rail, cards" },
	{ name: "--color-raised", purpose: "Inputs, hovered rows" },
	{ name: "--color-overlay", purpose: "Dialogs, popovers" },
	{ name: "--color-line", purpose: "Hairlines, borders" },
	{ name: "--color-line-strong", purpose: "Input borders, dividers that matter" },
	{ name: "--color-paper", purpose: "Primary text" },
	{ name: "--color-paper-muted", purpose: "Secondary text" },
	{ name: "--color-paper-faint", purpose: "Hints, placeholders" },
];

/** Test outcome colors. */
export const OUTCOME_COLORS: readonly TokenEntry[] = [
	{ name: "--color-pass", purpose: "Tests passed" },
	{ name: "--color-fail", purpose: "Tests failed, errors" },
	{ name: "--color-warn", purpose: "Needs attention" },
];

/** Type families. */
export const FONT_FAMILIES: readonly TokenEntry[] = [
	{ name: "--font-display", purpose: "Bricolage Grotesque: headings, numbers, the wordmark" },
	{ name: "--font-sans", purpose: "Instrument Sans: everything you read" },
	{ name: "--font-mono", purpose: "JetBrains Mono: code, keys, paths" },
];

/** Type scale steps, smallest first, with the Tailwind class that applies each. */
export const TYPE_SCALE: readonly TokenEntry[] = [
	{ name: "--text-2xs", purpose: "text-2xs" },
	{ name: "--text-xs", purpose: "text-xs" },
	{ name: "--text-sm", purpose: "text-sm" },
	{ name: "--text-base", purpose: "text-base" },
	{ name: "--text-lg", purpose: "text-lg" },
	{ name: "--text-xl", purpose: "text-xl" },
	{ name: "--text-2xl", purpose: "text-2xl" },
	{ name: "--text-3xl", purpose: "text-3xl" },
	{ name: "--text-4xl", purpose: "text-4xl" },
	{ name: "--text-5xl", purpose: "text-5xl" },
];

/** Spacing: the base step and the named layout sizes. */
export const SPACING: readonly TokenEntry[] = [
	{ name: "--spacing", purpose: "Base step; p-4 is four of these" },
	{ name: "--spacing-gutter", purpose: "Screen padding" },
	{ name: "--spacing-titlebar", purpose: "Top drag strip" },
	{ name: "--spacing-rail", purpose: "Navigation rail width" },
];

/** Spacing multiples shown as bars in the gallery. */
export const SPACING_STEPS: readonly number[] = [1, 2, 3, 4, 6, 8, 12, 16, 24];

/** Corner radii, smallest first. */
export const RADII: readonly TokenEntry[] = [
	{ name: "--radius-xs", purpose: "Key caps" },
	{ name: "--radius-sm", purpose: "Chips, badges" },
	{ name: "--radius-md", purpose: "Buttons, inputs" },
	{ name: "--radius-lg", purpose: "Cards, panels" },
	{ name: "--radius-xl", purpose: "Dialogs, hero cards" },
	{ name: "--radius-pill", purpose: "Pills, avatars" },
];

/** Shadows. */
export const SHADOWS: readonly TokenEntry[] = [
	{ name: "--shadow-raised", purpose: "Cards" },
	{ name: "--shadow-overlay", purpose: "Dialogs" },
	{ name: "--shadow-glow", purpose: "Reward moments only" },
];

/** Motion durations, fastest first. */
export const DURATIONS: readonly TokenEntry[] = [
	{ name: "--duration-instant", purpose: "Press feedback" },
	{ name: "--duration-fast", purpose: "Hovers, toggles" },
	{ name: "--duration-base", purpose: "Panels opening" },
	{ name: "--duration-slow", purpose: "Screen changes" },
	{ name: "--duration-reward", purpose: "XP, level up, loot" },
];

/** Easing curves. */
export const EASINGS: readonly TokenEntry[] = [
	{ name: "--ease-out", purpose: "Things arriving" },
	{ name: "--ease-in-out", purpose: "Things moving across" },
	{ name: "--ease-reward", purpose: "Overshoot for rewards" },
];

/** Every token name the gallery shows, used by the unit test that keeps this file and tokens.css in step. */
export function allCatalogTokenNames(): string[]
{
	const packNames = PACK_IDS.flatMap((pack) => [`--color-${pack}`, `--color-${pack}-soft`, `--color-${pack}-deep`]);
	const groups = [NEUTRAL_COLORS, OUTCOME_COLORS, FONT_FAMILIES, TYPE_SCALE, SPACING, RADII, SHADOWS, DURATIONS, EASINGS];

	return [...packNames, ...groups.flatMap((group) => group.map((entry) => entry.name))];
}
