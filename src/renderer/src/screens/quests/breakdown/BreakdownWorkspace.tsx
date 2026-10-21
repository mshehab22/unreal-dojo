// The breakdown board at work: plan with the spec beside it, submit, compare with a reference plan, revise with a note, and grade.
import { PanelLeftCloseIcon, PanelLeftOpenIcon, SendIcon } from "lucide-react";
import { useState } from "react";

import type { BreakdownQuest, BossQuest } from "@shared/types/content";
import type { BreakdownEdgeKind, BreakdownPlan } from "@shared/types/progress";

import { useNavigate } from "@/app/router/useRoute";
import { AppErrorView } from "@/components/AppErrorView";
import { AutosaveIndicator } from "@/components/quests/AutosaveIndicator";
import { QuestStepRail } from "@/components/quests/QuestStepRail";
import { QuestTitleRow } from "@/components/quests/QuestTitleRow";
import { TermText } from "@/components/TermText";
import { Button } from "@/components/ui/button";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoAction } from "@/data/useDojoAction";
import { useDraftAutosave } from "@/data/useDraftAutosave";
import { cn } from "@/lib/utils";

import { useLootStore } from "../loot/useLootStore";
import { ArrowPanel } from "./ArrowPanel";
import { BreakdownBoard } from "./BreakdownBoard";
import { planProblems, referenceAsPlan, type BoardPosition } from "./boardModel";
import { PiecePanel } from "./PiecePanel";
import { RevisionPanel } from "./RevisionPanel";

/** Props for BreakdownWorkspace. */
interface BreakdownWorkspaceProps
{
	readonly quest: BreakdownQuest | BossQuest;
	readonly initialPlan: BreakdownPlan;
}

/** The window width from which the spec column starts open; below it the board needs the room (A355). */
const WIDE_ENOUGH_FOR_SPEC = 1300;

/** The steps of a breakdown. */
const STEPS = ["Plan", "Compare and revise", "Result"] as const;

/** Holds the board, the shown reference, and the note. No hints are offered while planning. */
export function BreakdownWorkspace({ quest, initialPlan }: BreakdownWorkspaceProps)
{
	const navigate = useNavigate();
	const showLoot = useLootStore((state) => state.show);
	const [plan, setPlan] = useState(initialPlan);
	const [positions, setPositions] = useState<Record<string, BoardPosition>>({});
	const [referencePositions, setReferencePositions] = useState<Record<string, BoardPosition>>({});
	const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
	const [edgeKind, setEdgeKind] = useState<BreakdownEdgeKind>("owns");
	const [referenceIndex, setReferenceIndex] = useState<number | null>(null);
	const [note, setNote] = useState("");
	const [specOpen, setSpecOpen] = useState(() => window.innerWidth >= WIDE_ENOUGH_FOR_SPEC);
	const autosave = useDraftAutosave({ questId: quest.id, breakdownPlan: plan });
	const submit = useDojoAction((client, submitted: BreakdownPlan) => client.submitBreakdown({ questId: quest.id, plan: submitted }));
	const revise = useDojoAction((client, revised: BreakdownPlan, revisionNote: string) => client.reviseBreakdown({ questId: quest.id, revisedPlan: revised, revisionNote }), [QUERY_KEYS.progress, QUERY_KEYS.availability]);
	const problems = planProblems(plan);
	const flowError = submit.error ?? revise.error;
	const reference = referenceIndex === null ? undefined : quest.referencePlans[referenceIndex];

	/** Sends the first plan and opens the compare step with the reference the service picked. */
	const submitPlan = async (): Promise<void> =>
	{
		await autosave.saveNow();
		const choice = await submit.run(plan);

		if (choice) setReferenceIndex(choice.referencePlanIndex);
	};

	/** Grades the revision and opens the loot screen. */
	const grade = async (): Promise<void> =>
	{
		await autosave.saveNow();
		const graded = await revise.run(plan, note.trim());

		if (!graded) return;

		showLoot({ quest, outcome: graded.outcome, detail: { kind: "breakdown", grade: graded.grade } });
		navigate("loot", { quest: quest.id });
	};

	const editing = (
		<>
			<PiecePanel plan={plan} onPlanChange={setPlan} selectedPieceId={selectedPieceId} onSelectPiece={setSelectedPieceId} />
			<div className="flex flex-col gap-2 border-t border-line pt-3">
				<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Arrows</span>
				<ArrowPanel plan={plan} onPlanChange={setPlan} edgeKind={edgeKind} onEdgeKindChange={setEdgeKind} />
			</div>
		</>
	);

	return (
		<div data-testid="breakdown-quest" data-step={reference ? "compare" : "plan"} className="flex h-full min-h-0 flex-col gap-4">
			<QuestTitleRow quest={quest} actions={<AutosaveIndicator status={autosave.status} />} />
			<QuestStepRail steps={STEPS} currentIndex={reference ? 1 : 0} />
			{flowError && <AppErrorView error={flowError} onRetry={() => void (reference ? grade() : submitPlan())} />}

			{!reference ? (
				<div className={cn("grid min-h-[30rem] flex-1 gap-4", specOpen ? "grid-cols-[minmax(14rem,19rem)_minmax(0,1fr)_minmax(14rem,16rem)]" : "grid-cols-[2.5rem_minmax(0,1fr)_minmax(14rem,16rem)]")}>
					<aside aria-label="Spec" className={cn("flex min-h-0 flex-col gap-2 overflow-y-auto rounded-lg border border-line bg-surface", specOpen ? "p-4" : "items-center py-2")}>
						<Button variant="ghost" size="icon" className={specOpen ? "self-end" : ""} aria-label={specOpen ? "Hide the spec" : "Show the spec"} aria-expanded={specOpen} onClick={() => setSpecOpen(!specOpen)} data-testid="toggle-spec">
							{specOpen ? <PanelLeftCloseIcon /> : <PanelLeftOpenIcon />}
						</Button>
						{specOpen ? <TermText markdown={quest.spec} /> : <span className="font-mono text-2xs tracking-widest text-paper-faint uppercase [writing-mode:vertical-rl]">Spec</span>}
					</aside>
					<BreakdownBoard plan={plan} positions={positions} onPositionsChange={setPositions} onPlanChange={setPlan} selectedPieceId={selectedPieceId} onSelectPiece={setSelectedPieceId} newEdgeKind={edgeKind} ariaLabel="Your plan" testId="learner-board" />
					<aside aria-label="Pieces and arrows" className="flex min-h-0 flex-col gap-4 overflow-x-hidden overflow-y-auto rounded-lg border border-line bg-surface p-4">
						{editing}
						<div className="mt-auto flex flex-col gap-2 border-t border-line pt-3">
							{problems.map((problem) => (
								<p key={problem} className="text-xs text-warn">
									{problem}
								</p>
							))}
							<Button variant="pack" disabled={problems.length > 0 || submit.isPending} onClick={() => void submitPlan()} data-testid="submit-plan">
								<SendIcon />
								{submit.isPending ? "Sending" : "Submit plan"}
							</Button>
							<p className="text-2xs text-paper-faint">You will see a reference plan next and can still change yours.</p>
						</div>
					</aside>
				</div>
			) : (
				<div className="grid min-h-[30rem] flex-1 grid-cols-[minmax(0,1fr)_minmax(14rem,16rem)] gap-4 min-[1300px]:grid-cols-[minmax(0,1fr)_minmax(15rem,18rem)]">
					{/* Side by side from 1300 wide; stacked below that, so neither board gets narrow. */}
					<div className="grid min-h-0 grid-rows-2 gap-4 min-[1300px]:grid-cols-2 min-[1300px]:grid-rows-1">
						<div className="flex min-h-0 flex-col gap-2">
							<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Your plan</span>
							<BreakdownBoard plan={plan} positions={positions} onPositionsChange={setPositions} onPlanChange={setPlan} selectedPieceId={selectedPieceId} onSelectPiece={setSelectedPieceId} newEdgeKind={edgeKind} ariaLabel="Your plan" testId="learner-board" />
						</div>
						<div className="flex min-h-0 flex-col gap-2">
							<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Reference: {reference.title}</span>
							<BreakdownBoard plan={referenceAsPlan(reference)} positions={referencePositions} onPositionsChange={setReferencePositions} readOnly ariaLabel={`Reference plan: ${reference.title}`} testId="reference-board" />
						</div>
					</div>
					<aside aria-label="Revise" className="flex min-h-0 flex-col gap-4 overflow-x-hidden overflow-y-auto rounded-lg border border-line bg-surface p-4">
						<RevisionPanel reference={reference} patternIds={quest.patterns} note={note} onNoteChange={setNote} onGrade={() => void grade()} isGrading={revise.isPending} blockers={problems} />
						<div className="flex flex-col gap-4 border-t border-line pt-3">{editing}</div>
					</aside>
				</div>
			)}
		</div>
	);
}
