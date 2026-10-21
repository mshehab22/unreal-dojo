// Measures an element's content box and follows its changes, so the board can lay pieces out for the space it really has.
import { useEffect, useRef, useState, type RefObject } from "react";

/** A measured width and height in CSS pixels. */
export interface ElementSize
{
	width: number;
	height: number;
}

/** A ref to attach and the element's current size (undefined before the first measure). */
export function useElementSize<Element extends HTMLElement>(): [RefObject<Element | null>, ElementSize | undefined]
{
	const reference = useRef<Element | null>(null);
	const [size, setSize] = useState<ElementSize | undefined>(undefined);

	useEffect(() =>
	{
		const element = reference.current;

		if (!element) return;

		const observer = new ResizeObserver(([entry]) =>
		{
			if (!entry) return;

			const { width, height } = entry.contentRect;

			setSize((current) => (current && Math.round(current.width) === Math.round(width) && Math.round(current.height) === Math.round(height) ? current : { width, height }));
		});

		observer.observe(element);

		return () => observer.disconnect();
	}, []);

	return [reference, size];
}
