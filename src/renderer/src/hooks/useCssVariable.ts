// Reads a CSS custom property's current value from the document root.
import { useEffect, useState } from "react";

/** The value of a CSS variable on :root after styles load, trimmed; empty until then. */
export function useCssVariable(name: string): string
{
	const [value, setValue] = useState("");

	useEffect(() =>
	{
		setValue(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
	}, [name]);

	return value;
}
