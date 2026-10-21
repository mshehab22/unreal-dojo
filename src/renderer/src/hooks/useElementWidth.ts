// Measures an element's width and follows it as it resizes, for layouts that depend on the space they get.
import { useEffect, useRef, useState, type RefObject } from "react";

/** A ref to attach and the element's current content width in pixels (0 until measured). */
export function useElementWidth<Element extends HTMLElement>(): [RefObject<Element | null>, number]
{
	const reference = useRef<Element>(null);
	const [width, setWidth] = useState(0);

	useEffect(() =>
	{
		const element = reference.current;

		if (!element) return;

		const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0));

		observer.observe(element);

		return () => observer.disconnect();
	}, []);

	return [reference, width];
}
