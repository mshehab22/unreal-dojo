// One row on the Settings screen: a label and a line of explanation on the left, the control on the right. The first row after the panel title has no top rule.
import type { ReactNode } from "react";

/** Props for SettingRow. */
interface SettingRowProps
{
	readonly label: string;
	readonly description: string;
	readonly children: ReactNode;
	readonly testId?: string;
}

/** A labeled setting. Rows stack inside a Panel with hairlines between them. */
export function SettingRow({ label, description, children, testId }: SettingRowProps)
{
	return (
		<div data-testid={testId} className="grid grid-cols-[minmax(0,16rem)_minmax(0,1fr)] gap-6 border-t border-line pt-4 [&:nth-child(2)]:border-t-0 [&:nth-child(2)]:pt-0">
			<div className="flex flex-col gap-1">
				<span className="text-sm font-medium text-paper">{label}</span>
				<span className="text-xs text-paper-faint">{description}</span>
			</div>
			<div className="flex min-w-0 flex-col gap-2">{children}</div>
		</div>
	);
}
