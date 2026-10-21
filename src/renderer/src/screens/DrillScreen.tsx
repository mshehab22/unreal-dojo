// A drill session: mixed due items one at a time, each graded as it is answered, then the finish card. Also runs test-outs and the Parsons fallback.
import { ArrowRightIcon, CheckIcon } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import type { DrillSession } from "@shared/types/drill";
import type { DrillItemResult, DrillOutcome, ItemResponse } from "@shared/types/progress";

import { useRouteParameters } from "@/app/router/useRoute";
import { AppErrorView } from "@/components/AppErrorView";
import { KeyboardHints } from "@/components/KeyboardHints";
import { LoadingBlock } from "@/components/LoadingBlock";
import { Panel } from "@/components/Panel";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/button";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoAction } from "@/data/useDojoAction";
import { useDojoQuery } from "@/data/useDojoQuery";
import { modifierKeyLabel } from "@/lib/platform";

import { DrillItemView } from "./quests/drill/DrillItemView";
import { drillItemLabel } from "./quests/drill/drillItemLabel";
import { drillRequestFromRoute } from "./quests/drill/drillRequestFromRoute";
import { DrillSummaryCard } from "./quests/drill/DrillSummaryCard";

/** The title for each kind of drill. */
const TITLES = { due: "Today's drill", "test-out": "Test-out drill", "parsons-fallback": "Put the lines in order" } as const;

/** Starts the session once, then walks its items: answer, check, read the feedback, next. Cmd/Ctrl+Enter checks or moves on. */
export function DrillScreen()
{
	const parameters = useRouteParameters();
	const [request] = useState(() => drillRequestFromRoute(parameters));
	const patternCards = useDojoQuery(QUERY_KEYS.patternCards, (client) => client.getPatternCards());
	const [session, setSession] = useState<DrillSession | null>(null);
	const [index, setIndex] = useState(0);
	const [response, setResponse] = useState<ItemResponse | null>(null);
	const [result, setResult] = useState<DrillItemResult | null>(null);
	const [outcome, setOutcome] = useState<DrillOutcome | null>(null);
	const started = useRef(false);
	const start = useDojoAction((client) => client.startDrill(request));
	const answer = useDojoAction((client, sessionId: string, itemId: string, given: ItemResponse) => client.answerDrillItem({ sessionId, itemId, response: given }));
	const finish = useDojoAction((client, sessionId: string) => client.finishDrill(sessionId), [QUERY_KEYS.progress, QUERY_KEYS.drillSummary, QUERY_KEYS.testOut, QUERY_KEYS.daily]);
	const current = session?.items[index];
	const isLast = session !== null && index === session.items.length - 1;

	/** Starts the session. */
	const begin = async (): Promise<void> =>
	{
		const opened = await start.run();

		if (opened) setSession(opened);
	};

	// Start once; the ref keeps a second effect run (React's development double mount) from opening another session.
	useEffect(() =>
	{
		if (started.current) return;

		started.current = true;
		void begin();
	}, []);

	/** Grades the current item. */
	const check = async (): Promise<void> =>
	{
		if (!session || !current || !response) return;

		const graded = await answer.run(session.sessionId, current.itemId, response);

		if (graded) setResult(graded);
	};

	/** Moves to the next item, or finishes the session after the last. */
	const next = async (): Promise<void> =>
	{
		if (!session) return;

		if (!isLast)
		{
			setIndex(index + 1);
			setResponse(null);
			setResult(null);
			return;
		}

		const finished = await finish.run(session.sessionId);

		if (finished) setOutcome(finished);
	};

	/** Cmd/Ctrl+Enter checks the answer, or moves on once it is graded. */
	const onKeyDown = (event: KeyboardEvent): void =>
	{
		if (!(event.key === "Enter" && (event.metaKey || event.ctrlKey))) return;

		event.preventDefault();

		if (result) void next();
		else void check();
	};

	const error = start.error ?? answer.error ?? finish.error;

	return (
		<section data-testid="screen-drill" data-kind={request.kind} className="mx-auto flex w-full max-w-4xl flex-col gap-6" onKeyDown={onKeyDown}>
			<ScreenHeader eyebrow="Drill" title={TITLES[request.kind]} summary={request.kind === "parsons-fallback" ? "Rebuild a piece of the quest from its lines; distractors hide among them." : "Short recall, mixed across topics. A miss is due for review, never lost."} />
			{error && <AppErrorView error={error} onRetry={() => void (session ? (result ? next() : check()) : begin())} />}
			{!session && !start.error && <LoadingBlock height="h-80" />}
			{session && !outcome && current && (
				<>
					<div className="flex items-center gap-3">
						<div role="progressbar" aria-label="Drill progress" aria-valuemin={0} aria-valuemax={session.items.length} aria-valuenow={index + (result ? 1 : 0)} className="h-1.5 flex-1 overflow-hidden rounded-pill bg-raised">
							<div className="h-full rounded-pill bg-pack" style={{ width: `${((index + (result ? 1 : 0)) / session.items.length) * 100}%` }} />
						</div>
						<span data-testid="drill-position" className="font-mono text-xs text-paper-faint tabular-nums">
							{index + 1} / {session.items.length}
						</span>
					</div>
					<Panel title={drillItemLabel(current.item)} testId="drill-item-panel">
						<DrillItemView key={current.itemId} item={current.item} response={response} onChange={setResponse} result={result} disabled={answer.isPending} patternCards={patternCards.data ?? []} />
						<div className="flex items-center gap-3">
							{!result ? (
								<Button variant="pack" disabled={!response || answer.isPending} onClick={() => void check()}>
									<CheckIcon />
									{answer.isPending ? "Checking" : "Check"}
								</Button>
							) : (
								<Button variant="pack" onClick={() => void next()} disabled={finish.isPending} autoFocus>
									{isLast ? "Finish the drill" : "Next"}
									<ArrowRightIcon />
								</Button>
							)}
						</div>
					</Panel>
					<KeyboardHints hints={[{ keys: [modifierKeyLabel(), "Enter"], label: result ? "Next" : "Check" }, { keys: ["Tab"], label: "Move between choices and buttons" }]} />
				</>
			)}
			{outcome && <DrillSummaryCard outcome={outcome} request={request} />}
		</section>
	);
}
