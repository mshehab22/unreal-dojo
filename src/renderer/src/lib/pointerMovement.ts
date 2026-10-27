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

/** Remembers the last two pointer positions so a handler can ask whether the event it is handling was a real move. */
export class PointerTrail
{
	private previous: PointerPosition | null = null;
	private current: PointerPosition | null = null;

	/** Records the position of the newest pointer event. */
	record(position: PointerPosition): void
	{
		this.previous = this.current;
		this.current = position;
	}

	/** True when the newest recorded event moved the pointer, false for the first event and for events sent while content moves under a still pointer. */
	lastEventMoved(): boolean
	{
		if (!this.current) return false;

		return hasPointerMoved(this.previous, this.current);
	}
}
