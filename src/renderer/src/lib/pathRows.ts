// Splits a world's stages into balanced rows that fit the width the path gets, so a long world wraps instead of scrolling sideways.

/** Width one stage needs, label included, in pixels (w-20 plus a little air). */
export const STAGE_SLOT_WIDTH = 88;

/** How many stages fit side by side in this width, at least one. Before the width is known, a safe guess that fits 1100 wide. */
export function stagesPerRow(availableWidth: number, slotWidth: number = STAGE_SLOT_WIDTH): number
{
	if (availableWidth <= 0) return 6;

	return Math.max(1, Math.floor(availableWidth / slotWidth));
}

/** Splits items into the fewest rows of at most `perRow`, as even as possible, earlier rows never shorter than later ones. */
export function balancedRows<Item>(items: readonly Item[], perRow: number): Item[][]
{
	if (items.length === 0) return [];

	const rowCount = Math.ceil(items.length / Math.max(1, perRow));
	const evenSize = Math.ceil(items.length / rowCount);
	const rows: Item[][] = [];

	for (let start = 0; start < items.length; start += evenSize) rows.push(items.slice(start, start + evenSize));

	return rows;
}
