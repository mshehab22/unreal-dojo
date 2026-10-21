// The Unreal Dojo mark: a square split into the four pack accents, one quarter per pack.

/** Props for BrandMark. */
interface BrandMarkProps
{
	readonly size?: number;
}

/** Draws the four-pack mark at the given size in pixels. */
export function BrandMark({ size = 28 }: BrandMarkProps)
{
	return (
		<svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" className="shrink-0">
			<rect x="1" y="1" width="12" height="12" rx="3" className="fill-foundations" />
			<rect x="15" y="1" width="12" height="12" rx="3" className="fill-patterns" />
			<rect x="1" y="15" width="12" height="12" rx="3" className="fill-mechanics" />
			<rect x="15" y="15" width="12" height="12" rx="6" className="fill-systems" />
		</svg>
	);
}
