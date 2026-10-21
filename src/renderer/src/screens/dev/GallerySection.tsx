// One titled block of the token gallery.
import type { ReactNode } from "react";

/** Props for GallerySection. */
interface GallerySectionProps
{
	readonly title: string;
	readonly note?: string;
	readonly children: ReactNode;
}

/** A gallery heading with an optional note, above its samples. */
export function GallerySection({ title, note, children }: GallerySectionProps)
{
	return (
		<section className="flex flex-col gap-5 border-t border-line pt-8">
			<div className="flex items-baseline justify-between gap-6">
				<h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
				{note && <p className="max-w-md text-right text-sm text-paper-faint">{note}</p>}
			</div>
			{children}
		</section>
	);
}
