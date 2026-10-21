// The app frame: navigation rail, the current screen, and the overlay panels, with the global shortcuts active.
import { useEffect, useRef } from "react";

import { CodexSearchPalette } from "@/components/CodexSearchPalette";
import { TitleBarDragRegion } from "@/components/TitleBarDragRegion";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useRefetchOnFocus } from "@/data/useRefetchOnFocus";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";

import { NavigationRail } from "./NavigationRail";
import { useRoute } from "./router/useRoute";
import { ScreenOutlet } from "./ScreenOutlet";

/** Lays out every screen inside the rail and the scrollable stage. */
export function AppFrame()
{
	const route = useRoute();
	const stageReference = useRef<HTMLElement>(null);

	useGlobalShortcuts();
	useRefetchOnFocus();

	// A new screen starts at the top, not where the last one was scrolled to.
	useEffect(() =>
	{
		stageReference.current?.scrollTo({ top: 0 });
	}, [route.id]);

	return (
		<TooltipProvider>
			<div className="flex h-screen overflow-hidden bg-ink text-paper select-none">
				<NavigationRail activeRouteId={route.id} />
				<div className="relative flex min-w-0 flex-1 flex-col viewport-grid">
					<div className="h-titlebar shrink-0" />
					<main ref={stageReference} data-route={route.id} className="min-h-0 flex-1 overflow-y-auto px-gutter pb-gutter">
						<ScreenOutlet routeId={route.id} />
					</main>
				</div>
			</div>
			{/* The window drag strip floats over the top of both columns; each column leaves h-titlebar empty beneath it. */}
			<div className="fixed inset-x-0 top-0 z-40">
				<TitleBarDragRegion />
			</div>
			<CodexSearchPalette />
		</TooltipProvider>
	);
}
