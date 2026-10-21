// The strip across the top of the window that the user drags to move it, since the macOS title bar is hidden.
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const isMac = navigator.userAgent.includes("Macintosh");

/** Props for TitleBarDragRegion. */
interface TitleBarDragRegionProps
{
	/** Optional controls shown in the strip; buttons, links, and inputs inside stay clickable. */
	children?: ReactNode;
}

/** A 36px draggable strip. On macOS it leaves room on the left for the window buttons. */
export function TitleBarDragRegion({ children }: TitleBarDragRegionProps)
{
	return (
		<div data-testid="title-bar-drag-region" className={cn("app-drag-region flex h-9 w-full shrink-0 items-center", isMac ? "pl-20" : "pl-3")}>
			{children}
		</div>
	);
}
