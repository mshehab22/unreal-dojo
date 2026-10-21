// A mastery level as a shape, readable without color: an empty ring, a half-filled circle, a full circle, a full circle with a check.
import type { MasteryLevel } from "@shared/types/progress";

/** Props for MasteryGlyph. */
interface MasteryGlyphProps
{
	readonly mastery: MasteryLevel;
	readonly cx: number;
	readonly cy: number;
	readonly radius: number;
}

/** Draws the glyph inside an existing SVG at the given center. */
export function MasteryGlyph({ mastery, cx, cy, radius }: MasteryGlyphProps)
{
	const ring = <circle cx={cx} cy={cy} r={radius} className="fill-surface stroke-pack" strokeWidth="1.5" />;

	switch (mastery)
	{
		case "attempted":
			return ring;
		case "familiar":
			return (
				<g>
					{ring}
					<path d={`M ${cx} ${cy - radius} A ${radius} ${radius} 0 0 0 ${cx} ${cy + radius} Z`} className="fill-pack" />
				</g>
			);
		case "proficient":
			return <circle cx={cx} cy={cy} r={radius} className="fill-pack stroke-pack" strokeWidth="1.5" />;
		case "mastered":
			return (
				<g>
					<circle cx={cx} cy={cy} r={radius} className="fill-pack stroke-pack" strokeWidth="1.5" />
					<path d={`M ${cx - radius * 0.45} ${cy} L ${cx - radius * 0.1} ${cy + radius * 0.38} L ${cx + radius * 0.5} ${cy - radius * 0.35}`} className="fill-none stroke-pack-deep" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
				</g>
			);
	}
}
