// shadcn/ui Dialog on radix-ui, restyled with the Dojo tokens. One compound component: the parts below only work together.
import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** The dialog root; controls open state. Esc and a click outside close it. */
export function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>)
{
	return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

/** The element that opens the dialog. */
export function DialogTrigger(props: ComponentProps<typeof DialogPrimitive.Trigger>)
{
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

/** A button that closes the dialog. */
export function DialogClose(props: ComponentProps<typeof DialogPrimitive.Close>)
{
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/** The dimmed backdrop behind an open dialog. */
export function DialogOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>)
{
	return (
		<DialogPrimitive.Overlay
			data-slot="dialog-overlay"
			className={cn("fixed inset-0 z-50 bg-ink/70 backdrop-blur-[2px] data-[state=open]:animate-fade-in", className)}
			{...props}
		/>
	);
}

/** The dialog panel, rendered in a portal above the frame, with an optional close button. */
export function DialogContent({ className, children, showCloseButton = true, ...props }: ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean })
{
	return (
		<DialogPrimitive.Portal>
			<DialogOverlay />
			<DialogPrimitive.Content
				data-slot="dialog-content"
				className={cn(
					"fixed top-[18%] left-1/2 z-50 grid w-full max-w-[min(36rem,calc(100%-4rem))] -translate-x-1/2 gap-4 rounded-xl border border-line bg-overlay p-6 shadow-overlay outline-none data-[state=open]:animate-rise-in",
					className,
				)}
				{...props}
			>
				{children}
				{showCloseButton && (
					<DialogPrimitive.Close className="absolute top-4 right-4 rounded-sm p-1 text-paper-faint transition-colors duration-(--duration-fast) hover:text-paper">
						<XIcon className="size-4" />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Content>
		</DialogPrimitive.Portal>
	);
}

/** The dialog heading; screen readers announce it. */
export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>)
{
	return <DialogPrimitive.Title data-slot="dialog-title" className={cn("font-display text-xl font-semibold", className)} {...props} />;
}

/** The dialog's supporting sentence. */
export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>)
{
	return <DialogPrimitive.Description data-slot="dialog-description" className={cn("text-sm text-paper-muted", className)} {...props} />;
}
