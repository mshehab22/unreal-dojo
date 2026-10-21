// A color token sample: the color, its variable name, live value, and purpose.
import { useCssVariable } from "@/hooks/useCssVariable";
import type { TokenEntry } from "@/styles/tokenCatalog";

/** Props for ColorSwatch. */
interface ColorSwatchProps
{
	readonly token: TokenEntry;
}

/** Shows one color token as a chip with its name and value. */
export function ColorSwatch({ token }: ColorSwatchProps)
{
	const value = useCssVariable(token.name);

	return (
		<div className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
			<div className="h-16 border-b border-line" style={{ background: `var(${token.name})` }} />
			<div className="flex flex-col gap-0.5 p-3">
				<code className="font-mono text-xs text-paper">{token.name}</code>
				<code className="font-mono text-2xs text-paper-faint uppercase">{value}</code>
				<span className="mt-1 text-xs text-paper-muted">{token.purpose}</span>
			</div>
		</div>
	);
}
