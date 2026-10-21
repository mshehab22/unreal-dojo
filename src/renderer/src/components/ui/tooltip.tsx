// shadcn/ui Tooltip on radix-ui, restyled with the Dojo tokens. One compound component: the parts below only work together.
import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Shares the hover delay across every tooltip below it. The frame wraps the whole app in one. */
export function TooltipProvider({ delayDuration = 300, ...props }: ComponentProps<typeof TooltipPrimitive.Provider>)
{
	return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />;
}

/** One tooltip's root. */
export function Tooltip(props: ComponentProps<typeof TooltipPrimitive.Root>)
{
	return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

/** The element the tooltip describes. */
export function TooltipTrigger(props: ComponentProps<typeof TooltipPrimitive.Trigger>)
{
	return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

/** The tooltip bubble. */
export function TooltipContent({ className, sideOffset = 6, children, ...props }: ComponentProps<typeof TooltipPrimitive.Content>)
{
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Content
				data-slot="tooltip-content"
				sideOffset={sideOffset}
				className={cn("z-50 max-w-64 rounded-sm border border-line-strong bg-overlay px-2.5 py-1.5 text-xs text-paper shadow-overlay", className)}
				{...props}
			>
				{children}
			</TooltipPrimitive.Content>
		</TooltipPrimitive.Portal>
	);
}
