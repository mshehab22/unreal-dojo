// shadcn/ui Button, restyled with the Dojo tokens. Variants: primary (paper), pack (current accent), secondary, ghost, outline, destructive.
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Class recipe for every button variant and size. */
export const buttonVariants = cva(
	"inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[background-color,color,box-shadow,transform] duration-(--duration-fast) ease-out select-none focus-visible:outline-2 active:translate-y-px disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				primary: "bg-primary text-primary-foreground hover:bg-paper/88",
				pack: "bg-pack text-pack-deep hover:bg-pack/88",
				secondary: "bg-secondary text-secondary-foreground shadow-raised hover:bg-overlay",
				outline: "border border-line-strong bg-transparent text-paper hover:border-pack hover:text-pack",
				ghost: "text-paper-muted hover:bg-raised hover:text-paper",
				destructive: "bg-fail text-ink hover:bg-fail/88",
			},
			size: {
				sm: "h-8 px-3 text-sm",
				md: "h-10 px-4 text-sm",
				lg: "h-12 px-6 text-base",
				icon: "size-9",
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "md",
		},
	},
);

/** Props for Button: a native button, or its child element when asChild is set. */
export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

/** A button in one of the Dojo variants. */
export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps)
{
	const Component = asChild ? Slot.Root : "button";

	return <Component data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
