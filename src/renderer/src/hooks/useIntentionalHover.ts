// Opens a hover card only after the pointer really moves onto its trigger, once per entry, so content that appears under a still pointer never pops a card open and Escape keeps it closed.
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

	// True from a pointer enter until the card opens, closes, or the pointer leaves: one pointer open per entry.
	const armed = useRef(false);

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
		if (!next)
		{
			cancelPending();
			armed.current = false;
		}

		setOpenState(next);
	}, [cancelPending]);

	/** Arms one pointer open and takes over the card's own pointer-enter open, which cannot tell a real move from a layout change. */
	const onPointerEnter = useCallback((event: PointerEvent): void =>
	{
		armed.current = true;

		// An open card keeps the card's own handling, which cancels its pending close when the pointer comes back.
		if (!open) event.preventDefault();
	}, [open]);

	/** Starts the open delay on the first real movement over the trigger. */
	const onPointerMove = useCallback((event: PointerEvent): void =>
	{
		if (event.pointerType === "touch" || !armed.current || timer.current !== undefined || !windowTrail.lastEventMoved()) return;

		armed.current = false;
		timer.current = window.setTimeout(() =>
		{
			timer.current = undefined;
			setOpenState(true);
		}, openDelayMilliseconds);
	}, [openDelayMilliseconds]);

	/** Cancels a pending open and disarms until the pointer enters again. */
	const onPointerLeave = useCallback((): void =>
	{
		armed.current = false;
		cancelPending();
	}, [cancelPending]);

	return { open, setOpen, onPointerEnter, onPointerMove, onPointerLeave };
}
