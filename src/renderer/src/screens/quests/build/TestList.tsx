// The automation tests of the last run: each passed or failed, with the first failure message.
import { CheckIcon, XIcon } from "lucide-react";

import type { TestCaseResult } from "@shared/types/run";

import { cn } from "@/lib/utils";

/** Props for TestList. */
interface TestListProps
{
	readonly tests: readonly TestCaseResult[];
}

/** The last part of a test name, which is the readable case. */
function caseName(fullName: string): string
{
	return fullName.split(".").pop() ?? fullName;
}

/** One row per test. */
export function TestList({ tests }: TestListProps)
{
	return (
		<ul data-testid="test-list" className="flex flex-col gap-1.5">
			{tests.map((test) => (
				<li key={test.name} data-testid="test-row" data-passed={test.passed} className="flex flex-col gap-0.5">
					<span className={cn("flex items-center gap-2 text-sm", test.passed ? "text-paper" : "text-fail")} title={test.name}>
						{test.passed ? <CheckIcon className="size-3.5 shrink-0 text-pass" strokeWidth={3} /> : <XIcon className="size-3.5 shrink-0" strokeWidth={3} />}
						<span className="truncate">{caseName(test.name)}</span>
					</span>
					{!test.passed && test.message && <span className="pl-5.5 text-xs text-paper-muted">{test.message}</span>}
				</li>
			))}
		</ul>
	);
}
