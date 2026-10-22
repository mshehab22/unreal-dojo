// A build or refactor quest at work: brief, editor, and runs in three columns, with autosave, hints, the worked-level gate, and the quest shortcuts.
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { LearnerQuest } from "@shared/types/catalog";
import type { PlayerProgress, RulesSnapshot } from "@shared/types/progress";
import type { RunResult } from "@shared/types/run";

import { useNavigate } from "@/app/router/useRoute";
import { KeyboardHints } from "@/components/KeyboardHints";
import { AutosaveIndicator } from "@/components/quests/AutosaveIndicator";
import { QuestTitleRow } from "@/components/quests/QuestTitleRow";
import { Button } from "@/components/ui/button";
import { QUERY_KEYS, questKey } from "@/data/queryKeys";
import { useDojoAction } from "@/data/useDojoAction";
import { useDojoQuery } from "@/data/useDojoQuery";
import { useDraftAutosave } from "@/data/useDraftAutosave";
import { useQuestRun } from "@/data/useQuestRun";
import { hasShortcutModifier, modifierKeyLabel } from "@/lib/platform";
import { cn } from "@/lib/utils";

import { useLootStore } from "../loot/useLootStore";
import { withRetriedReview } from "../loot/withRetriedReview";
import { BriefColumn } from "./BriefColumn";
import { EditorColumn } from "./EditorColumn";
import { FailedSubmitOffers } from "./FailedSubmitOffers";
import { HintSpells } from "./HintSpells";
import { LastSubmitCard } from "./LastSubmitCard";
import { RunColumn } from "./RunColumn";
import { lastSubmitResult } from "./lastSubmitResult";
import { markedLinesOf } from "./markedLines";
import { SelfExplanationGate } from "./SelfExplanationGate";

/** A build or refactor quest. */
type CodeQuest = Extract<LearnerQuest, { kind: "build" | "refactor" }>;

/** Props for BuildWorkspace. */
interface BuildWorkspaceProps
{
	readonly quest: CodeQuest;
	readonly initialProgress: PlayerProgress;
	readonly rules: RulesSnapshot;
}

/** A result in the run column and where it came from. */
interface ShownResult
{
	result: RunResult;
	source: "run" | "submit";
}

/** The window width from which the brief column starts open. */
const WIDE_ENOUGH_FOR_BRIEF = 1600;

/** Words needed in a self-explanation before it counts. */
const EXPLANATION_MIN_WORDS = 3;

/** True when a sentence has enough words to count as an explanation. */
function isExplained(text: string | undefined): boolean
{
	return (text ?? "").trim().split(/\s+/).filter((word) => word.length > 0).length >= EXPLANATION_MIN_WORDS;
}

/** The learner's files: what they saved, else the starters. */
function startingFiles(quest: CodeQuest, progress: PlayerProgress): Record<string, string>
{
	const saved = progress.quests[quest.id]?.savedFiles ?? {};

	return Object.fromEntries(quest.files.map((file) => [file.name, saved[file.name] ?? file.starter]));
}

/** Holds the files, the gate, and both runs. Cmd/Ctrl+Enter runs, Cmd/Ctrl+Shift+Enter submits, Cmd/Ctrl+S saves. */
export function BuildWorkspace({ quest, initialProgress, rules }: BuildWorkspaceProps)
{
	const navigate = useNavigate();
	const lootEntry = useLootStore((state) => state.entry);
	const showLoot = useLootStore((state) => state.show);
	const progress = useDojoQuery(QUERY_KEYS.progress, (client) => client.getProgress()).data ?? initialProgress;
	const aliases = useDojoQuery(QUERY_KEYS.glossaryAliases, (client) => client.getGlossaryAliases());
	const markedEntries = markedLinesOf(quest.files);
	const savedExplanations = initialProgress.quests[quest.id]?.selfExplanations ?? {};

	const [files, setFiles] = useState(() => startingFiles(quest, initialProgress));

	// The files as of the last keystroke. A Run pressed right after typing reads these, not the last render's state.
	const filesNow = useRef(files);
	const [activeFile, setActiveFile] = useState(quest.files[0]?.name ?? "");
	const [explanations, setExplanations] = useState<Record<string, string>>(savedExplanations);
	const [gateOpen, setGateOpen] = useState(() => quest.scaffold !== "worked" || markedEntries.every((entry) => isExplained(savedExplanations[entry.key])));
	const [briefOpen, setBriefOpen] = useState(() => window.innerWidth >= WIDE_ENOUGH_FOR_BRIEF);
	// The last result shown in the run column: a Run, or the last Submit (from the loot hand-off or the stored attempt), so Improve or a reload after a failed Submit shows its compiler output and tests.
	const [lastResult, setLastResult] = useState<ShownResult | null>(() =>
	{
		const submitted = lastSubmitResult(quest.id, lootEntry, initialProgress);

		return submitted ? { result: submitted, source: "submit" } : null;
	});

	// Paid hints come back with the quest (A502); a reveal in this window adds its text at once.
	const [hintTexts, setHintTexts] = useState<readonly string[]>(() => quest.revealedHints ?? []);

	const autosave = useDraftAutosave({ questId: quest.id, files, ...(markedEntries.length > 0 ? { selfExplanations: explanations } : {}) });
	const run = useQuestRun((client, request) => client.runQuest(request));
	const submit = useQuestRun((client, request) => client.submitQuest(request), [QUERY_KEYS.progress, QUERY_KEYS.availability, QUERY_KEYS.drillSummary, QUERY_KEYS.daily]);
	const retry = useDojoAction((client, attemptId: string) => client.retryReview(attemptId), [QUERY_KEYS.progress]);
	const reveal = useDojoAction((client, hintIndex: number) => client.revealHint(quest.id, hintIndex), [QUERY_KEYS.progress, questKey(quest.id)]);
	const openEditor = useDojoAction((client) => client.openEditor(quest.id), [QUERY_KEYS.environment]);

	const questProgress = progress.quests[quest.id];
	const isPassed = questProgress?.status === "passed";
	const failedSubmits = progress.attempts.filter((attempt) => attempt.questId === quest.id && !attempt.passed).length;
	const lastSubmit = lootEntry?.quest.id === quest.id && lootEntry.detail.kind === "build" ? lootEntry : null;
	const busy = run.status === "running" || submit.status === "running";
	const activeMarkedLines = gateOpen ? [] : (quest.files.find((file) => file.name === activeFile)?.markedLines ?? []).map((marked) => marked.line);
	const submitBlockedReason = gateOpen ? null : "Explain the marked lines first; Submit opens with the gaps.";

	/** Opens the gaps and folds the brief, so the editor gets the room for writing code. */
	const openGaps = (): void =>
	{
		setGateOpen(true);
		setBriefOpen(false);
	};

	/** Records one file's new text, in the ref at once and in state for the next render. */
	const changeFile = (name: string, value: string): void =>
	{
		if (filesNow.current[name] === value) return;

		filesNow.current = { ...filesNow.current, [name]: value };
		setFiles(filesNow.current);
	};

	/** Runs the files as they are now. Free. */
	const startRun = async (): Promise<void> =>
	{
		if (busy) return;

		void autosave.saveNow();
		const result = await run.start(quest.id, filesNow.current);

		if (result) setLastResult({ result, source: "run" });
	};

	/** Submits the files and opens the loot screen. */
	const startSubmit = async (): Promise<void> =>
	{
		if (busy || !gateOpen) return;

		const submitted = { ...filesNow.current };

		await autosave.saveNow();
		const outcome = await submit.start(quest.id, submitted);

		if (!outcome) return;

		setLastResult({ result: outcome.run, source: "submit" });
		showLoot({ quest, outcome: outcome.outcome, detail: { kind: "build", run: outcome.run, files: submitted, ...(outcome.review ? { review: outcome.review } : {}) } });
		navigate("loot", { quest: quest.id });
	};

	/** Asks the reviewer again about the last Submit's stored files, with no new build, for the review that timed out (A300, A740). */
	const retryReview = async (): Promise<void> =>
	{
		if (!lastSubmit || lastSubmit.detail.kind !== "build") return;

		const review = await retry.run(lastSubmit.outcome.attempt.attemptId);

		if (review) showLoot(withRetriedReview(lastSubmit, review));
	};

	/** Asks for the hint after the ones shown, by index, so a stale screen or a double click gets that hint again for free instead of buying another (A501). */
	const revealHint = async (): Promise<void> =>
	{
		const hint = await reveal.run(hintTexts.length);

		if (!hint) return;

		setHintTexts((current) =>
		{
			const next = [...current];

			next[hint.hintIndex] = hint.text;

			return next;
		});
	};

	const shortcuts = useRef({ startRun, startSubmit, save: autosave.saveNow });

	shortcuts.current = { startRun, startSubmit, save: autosave.saveNow };

	// The quest shortcuts anywhere on the screen outside the editor; inside it, Monaco's own commands call the same functions.
	useEffect(() =>
	{
		const onKeyDown = (event: globalThis.KeyboardEvent): void =>
		{
			if (!hasShortcutModifier(event) || (event.target instanceof HTMLElement && event.target.closest(".monaco-editor"))) return;

			if (event.key === "Enter" && event.shiftKey) void shortcuts.current.startSubmit();
			else if (event.key === "Enter") void shortcuts.current.startRun();
			else if (event.key.toLowerCase() === "s") void shortcuts.current.save();
			else return;

			event.preventDefault();
		};

		window.addEventListener("keydown", onKeyDown);

		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	// A quest refetched with more paid hints than shown (revealed in another window) brings their texts in.
	useEffect(() =>
	{
		const fromQuest = quest.revealedHints ?? [];

		if (fromQuest.length > hintTexts.length) setHintTexts(fromQuest);
	}, [quest.revealedHints]);

	// Save what is left when the window loses focus.
	useEffect(() =>
	{
		const onWindowBlur = (): void => void autosave.saveNow();

		window.addEventListener("blur", onWindowBlur);

		return () => window.removeEventListener("blur", onWindowBlur);
	}, []);

	const gate = markedEntries.length > 0 && quest.scaffold === "worked" ? (
		<SelfExplanationGate
			entries={markedEntries}
			explanations={explanations}
			onExplain={(key, text) => setExplanations((current) => ({ ...current, [key]: text }))}
			isOpen={gateOpen}
			onOpen={openGaps}
			onShowLine={(fileName) => setActiveFile(fileName)}
		/>
	) : undefined;

	return (
		<div data-testid="build-quest" className="flex h-full min-h-0 flex-col gap-3">
			<QuestTitleRow quest={quest} detail={quest.scaffold} actions={<AutosaveIndicator status={autosave.status} />} />
			<div className={cn("grid min-h-[34rem] flex-1 gap-3", briefOpen ? "grid-cols-[minmax(14rem,19rem)_minmax(0,1fr)_minmax(14rem,16rem)]" : "grid-cols-[2.5rem_minmax(0,1fr)_minmax(14rem,16rem)]")}>
				<aside aria-label="Brief" className={cn("flex min-h-0 flex-col gap-2 overflow-y-auto rounded-lg border border-line bg-surface", briefOpen ? "p-4" : "items-center py-2")}>
					<Button variant="ghost" size="icon" className={briefOpen ? "self-end" : ""} aria-label={briefOpen ? "Hide the brief" : "Show the brief"} aria-expanded={briefOpen} onClick={() => setBriefOpen(!briefOpen)} data-testid="toggle-brief">
						{briefOpen ? <PanelLeftCloseIcon /> : <PanelLeftOpenIcon />}
					</Button>
					{briefOpen ? (
						<BriefColumn brief={quest.brief} scaffold={quest.scaffold} concepts={quest.concepts} rubric={quest.rubric} patternIds={quest.patterns} isPassed={isPassed} />
					) : (
						<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase [writing-mode:vertical-rl]">Brief</span>
					)}
				</aside>
				<EditorColumn
					questId={quest.id}
					files={files}
					fileOrder={quest.files.map((file) => file.name)}
					activeFile={activeFile}
					onActiveFileChange={setActiveFile}
					onFileChange={changeFile}
					onBlur={() => void autosave.saveNow()}
					readOnly={!gateOpen}
					markedLines={activeMarkedLines}
					aliases={aliases.data ?? []}
					termIds={quest.terms}
					commands={{ onRun: () => void startRun(), onSubmit: () => void startSubmit(), onSave: () => void autosave.saveNow() }}
					gate={gate}
				/>
				<aside aria-label="Run and submit" className="flex min-h-0 flex-col overflow-x-hidden overflow-y-auto rounded-lg border border-line bg-surface px-4 pb-4">
					<RunColumn
						run={run}
						submit={submit}
						lastResult={lastResult?.result ?? null}
						lastResultSource={lastResult?.source ?? "run"}
						canSubmit={gateOpen}
						submitBlockedReason={submitBlockedReason}
						onRun={() => void startRun()}
						onSubmit={() => void startSubmit()}
						onOpenEditor={() => void openEditor.run()}
						isOpeningEditor={openEditor.isPending}
						lastSubmit={lastSubmit && <LastSubmitCard outcome={lastSubmit.outcome} review={lastSubmit.detail.kind === "build" ? lastSubmit.detail.review : undefined} onOpenLoot={() => navigate("loot", { quest: quest.id })} onRetryReview={() => void retryReview()} isRetrying={retry.isPending} />}
						hints={<HintSpells hintCount={quest.hintCount} revealed={hintTexts} nextCost={Math.round(quest.xp * rules.hintCostShare)} onReveal={() => void revealHint()} isRevealing={reveal.isPending} />}
						offers={!isPassed && failedSubmits >= rules.failedSubmitsBeforeOffers ? <FailedSubmitOffers questId={quest.id} failedSubmits={failedSubmits} seerStones={progress.seerStones} hasParsons={(quest.parsons?.length ?? 0) > 0} /> : undefined}
					/>
				</aside>
			</div>
			<KeyboardHints
				hints={[
					{ keys: [modifierKeyLabel(), "Enter"], label: "Run" },
					{ keys: [modifierKeyLabel(), "Shift", "Enter"], label: "Submit" },
					{ keys: [modifierKeyLabel(), "S"], label: "Save" },
				]}
			/>
		</div>
	);
}
