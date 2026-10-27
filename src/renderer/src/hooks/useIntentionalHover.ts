// Opens a hover card only after the pointer really moves onto its trigger, so content that appears under a still pointer never pops a card open.
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

import { PointerTrail } from "@/lib/pointerMovement";

/** One trail for the whole window, fed before any element handler runs, so the first move onto a trigger is compared with where the pointer was. */
const windowTrail = new PointerTrail();

if (typeof window !== "undefined")
{
	window.addEventListener("pointermove", (event) => windowTrail.record({ x: event.clientX, y: event.clientY }), { capture: true, passive: true });
}

/** What the hook returns: the controlled open state and the handlers to spread on the trigger. */
interface IntentionalHover
{
	readonly open: boolean;

	/** For the card root's onOpenChange: focus and keyboard still open it, and every close arrives here. */
	readonly setOpen: (open: boolean) => void;
	readonly onPointerEnter: (event: PointerEvent) => void;
	readonly onPointerMove: (event: PointerEvent) => void;
	readonly onPointerLeave: () => void;
}

/** Controlled open state for a Radix hover card whose pointer open waits for real movement and then the delay. */
export function useIntentionalHover(openDelayMilliseconds: number): IntentionalHover
{
	const [open, setOpenState] = useState(false);
	const timer = useRef<number | undefined>(undefined);

	/** Cancels a pending pointer open. */
	const cancelPending = useCallback((): void =>
	{
		window.clearTimeout(timer.current);
		timer.current = undefined;
	}, []);

	useEffect(() => cancelPending, [cancelPending]);

	/** Applies an open or close from the card itself. */
	const setOpen = useCallback((next: boolean): void =>
	{
		if (!next) cancelPending();

		setOpenState(next);
	}, [cancelPending]);

	/** Takes over the card's own pointer-enter open, which cannot tell a real move from a layout change. */
	const onPointerEnter = useCallback((event: PointerEvent): void =>
	{
		event.preventDefault();
	}, []);

	/** Starts the open delay on the first real movement over the trigger. */
	const onPointerMove = useCallback((event: PointerEvent): void =>
	{
		if (event.pointerType === "touch" || timer.current !== undefined || !windowTrail.lastEventMoved()) return;

		timer.current = window.setTimeout(() =>
		{
			timer.current = undefined;
			setOpenState(true);
		}, openDelayMilliseconds);
	}, [openDelayMilliseconds]);

	return { open, setOpen, onPointerEnter, onPointerMove, onPointerLeave: cancelPending };
}
