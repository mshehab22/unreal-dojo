// A gallery row for a non-color token: a sample on the left, the name, live value, and purpose on the right.
import type { ReactNode } from "react";

import { useCssVariable } from "@/hooks/useCssVariable";
import type { TokenEntry } from "@/styles/tokenCatalog";

/** Props for TokenRow. */
interface TokenRowProps
{
	readonly token: TokenEntry;
	readonly children: ReactNode;
}

/** Shows a token's sample beside its name and current value. */
export function TokenRow({ token, children }: TokenRowProps)
{
	const value = useCssVariable(token.name);

	return (
		<div className="grid grid-cols-[minmax(0,1fr)_16rem] items-center gap-6 border-b border-line/60 py-3 last:border-b-0">
			<div className="min-w-0">{children}</div>
			<div className="flex flex-col gap-0.5">
				<code className="font-mono text-xs text-paper">{token.name}</code>
				<code className="truncate font-mono text-2xs text-paper-faint" title={value}>
					{value}
				</code>
				<span className="text-xs text-paper-muted">{token.purpose}</span>
			</div>
		</div>
	);
}
