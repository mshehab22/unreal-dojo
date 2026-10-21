// Tells a real pointer movement from the events a browser sends when content moves under a still pointer.

/** A pointer position in viewport pixels. */
export interface PointerPosition
{
	x: number;
	y: number;
}

/** True when the pointer is somewhere new. The first position seen only records where it rests, so it never counts as a move. */
export function hasPointerMoved(previous: PointerPosition | null, current: PointerPosition): boolean
{
	if (!previous) return false;

	return previous.x !== current.x || previous.y !== current.y;
}
