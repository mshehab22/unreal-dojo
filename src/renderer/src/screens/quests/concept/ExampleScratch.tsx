// The card's editable example: a Monaco scratch buffer with a syntax check through the platform compiler (never builds the sandbox).
import { RotateCcwIcon, ScanSearchIcon } from "lucide-react";
import { useState } from "react";

import type { SyntaxCheckResult } from "@shared/types/run";

import { AppErrorView } from "@/components/AppErrorView";
import { CodeEditor } from "@/components/quests/CodeEditor";
import { Button } from "@/components/ui/button";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoAction } from "@/data/useDojoAction";
import { useDojoQuery } from "@/data/useDojoQuery";
import { cn } from "@/lib/utils";

/** Props for ExampleScratch. */
interface ExampleScratchProps
{
	readonly questId: string;
	readonly example: string;
	readonly termIds: readonly string[];
}

/** The example in an editor the learner may change, with Check syntax and Reset. Nothing here is graded or saved. */
export function ExampleScratch({ questId, example, termIds }: ExampleScratchProps)
{
	const [code, setCode] = useState(example);
	const [result, setResult] = useState<SyntaxCheckResult | null>(null);
	const aliases = useDojoQuery(QUERY_KEYS.glossaryAliases, (client) => client.getGlossaryAliases());
	const check = useDojoAction((client, text: string) => client.checkSnippetSyntax({ questId, code: text }));
	const lineCount = example.split("\n").length;

	/** Runs the check and keeps its answer. */
	const runCheck = async (): Promise<void> =>
	{
		const answer = await check.run(code);

		if (answer) setResult(answer);
	};

	/** Puts the example back as the card wrote it. */
	const reset = (): void =>
	{
		setCode(example);
		setResult(null);
	};

	return (
		<div data-testid="example-scratch" className="flex flex-col gap-3">
			<div className="flex items-center justify-between gap-3">
				<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Example: change it and check it</span>
				<div className="flex gap-2">
					<Button size="sm" variant="ghost" onClick={reset}>
						<RotateCcwIcon />
						Reset
					</Button>
					<Button size="sm" variant="secondary" onClick={() => void runCheck()} disabled={check.isPending}>
						<ScanSearchIcon />
						{check.isPending ? "Checking" : "Check syntax"}
					</Button>
				</div>
			</div>
			<div className="overflow-hidden rounded-md border border-line" style={{ height: `${Math.min(26, lineCount + 2) * 20 + 24}px` }}>
				<CodeEditor modelKey={`${questId}.example`} files={[{ name: "Example.cpp", value: code }]} activeFile="Example.cpp" onChange={(_name, value) => setCode(value)} aliases={aliases.data ?? []} questTermIds={termIds} ariaLabel="Editable example" commands={{ onRun: () => void runCheck() }} />
			</div>
			{check.error && <AppErrorView error={check.error} onRetry={() => void runCheck()} />}
			{result && (
				<div data-testid="syntax-result" data-ok={result.ok} className={cn("rounded-md border px-4 py-3 text-sm", result.ok ? "border-pass/50 text-pass" : "border-fail/50 text-fail")}>
					{result.ok && result.diagnostics.length === 0 && "No syntax problems."}
					{result.diagnostics.map((diagnostic) => (
						<p key={`${diagnostic.line}-${diagnostic.message}`} className={diagnostic.severity === "warning" ? "text-warn" : undefined}>
							Line {diagnostic.line}: {diagnostic.message}
						</p>
					))}
				</div>
			)}
		</div>
	);
}
