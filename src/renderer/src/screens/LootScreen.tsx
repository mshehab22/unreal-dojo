// The loot screen after a graded attempt: the score counting up, XP itemized, everything that changed, the review, the alternative after a pass, and Improve, See it run, Next.
import { ArrowRightIcon, MonitorPlayIcon, WrenchIcon } from "lucide-react";

import { useNavigate, useRouteParameters } from "@/app/router/useRoute";
import { AppErrorView } from "@/components/AppErrorView";
import { Panel } from "@/components/Panel";
import { PatternChips } from "@/components/quests/PatternChips";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TermText } from "@/components/TermText";
import { Button } from "@/components/ui/button";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoAction } from "@/data/useDojoAction";
import { useDojoQuery } from "@/data/useDojoQuery";
import { nextOpenQuest } from "@/lib/nextOpenQuest";
import { indexQuests } from "@/lib/questIndex";

import { BreakdownGradeSection } from "./quests/loot/BreakdownGradeSection";
import { CodeReviewSection } from "./quests/loot/CodeReviewSection";
import { ConceptResultsSection } from "./quests/loot/ConceptResultsSection";
import { ProgressChanges } from "./quests/loot/ProgressChanges";
import { ScoreCountUp } from "./quests/loot/ScoreCountUp";
import { useLootStore } from "./quests/loot/useLootStore";
import { withRetriedReview } from "./quests/loot/withRetriedReview";
import { XpBreakdownList } from "./quests/loot/XpBreakdownList";

/** Shows the latest attempt's loot for `?quest=`. Without one (a reload), it says so and points back. */
export function LootScreen()
{
	const navigate = useNavigate();
	const questId = useRouteParameters()["quest"] ?? "";
	const entry = useLootStore((state) => state.entry);
	const showLoot = useLootStore((state) => state.show);
	const rules = useDojoQuery(QUERY_KEYS.rules, (client) => client.getRules());
	const packs = useDojoQuery(QUERY_KEYS.packs, (client) => client.listPacks());
	const availability = useDojoQuery(QUERY_KEYS.availability, (client) => client.getQuestAvailability());
	const patternCards = useDojoQuery(QUERY_KEYS.patternCards, (client) => client.getPatternCards());
	const openEditor = useDojoAction((client, id: string) => client.openEditor(id), [QUERY_KEYS.environment]);
	const retry = useDojoAction((client, attemptId: string) => client.retryReview(attemptId), [QUERY_KEYS.progress]);

	if (!entry || entry.quest.id !== questId)
	{
		return (
			<section data-testid="screen-loot" className="mx-auto flex w-full max-w-3xl flex-col gap-6">
				<ScreenHeader eyebrow="Loot" title="Nothing to show" summary="Loot appears right after a graded attempt. Your progress is saved; the Character screen has your history." />
				<Button variant="pack" className="self-start" onClick={() => navigate("worldMap")}>
					Back to the map
				</Button>
			</section>
		);
	}

	const { quest, outcome, detail } = entry;
	const passed = outcome.attempt.passed;
	const index = packs.data ? indexQuests(packs.data) : null;
	const location = index?.get(quest.id);
	const nextQuest = location && availability.data ? nextOpenQuest(location.world.quests, quest.order, availability.data) : null;

	// Next waits for the map and the fresh availability, so it never flashes "Back to the map" before the next quest is known.
	const nextKnown = packs.data !== undefined && availability.data !== undefined && !availability.isLoading;
	const questTitles = new Map([...(index?.values() ?? [])].map((found) => [found.quest.id, found.quest.title]));
	const alternative = quest.kind === "build" || quest.kind === "refactor" ? quest.alternative : quest.kind === "breakdown" ? quest.alternativeNote : null;

	/** Asks the reviewer again about this attempt's stored files, with no new build, and shows the new review in place (A740). */
	const retryReview = async (): Promise<void> =>
	{
		if (detail.kind !== "build") return;

		const review = await retry.run(outcome.attempt.attemptId);

		if (review) showLoot(withRetriedReview(entry, review));
	};

	return (
		<section data-testid="screen-loot" data-passed={passed} className="mx-auto flex w-full max-w-5xl flex-col gap-6">
			<ScreenHeader eyebrow={passed ? "Loot: passed" : "Loot: not passed yet"} title={quest.title} />

			<div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-5">
				<Panel title="Score" testId="loot-score-panel">
					<ScoreCountUp key={outcome.attempt.attemptId} score={outcome.attempt.score} passed={passed} />
					<p className="text-sm text-paper-muted">{passed ? "Passed." : rules.data ? `Pass at ${rules.data.passScore}. Improve and submit again; nothing is lost.` : "Improve and submit again; nothing is lost."}</p>
					<XpBreakdownList xp={outcome.xp} />
				</Panel>
				<Panel title="What changed">{rules.data && <ProgressChanges outcome={outcome} rules={rules.data} patternCards={patternCards.data ?? []} questTitles={questTitles} />}</Panel>
			</div>

			<Panel title={detail.kind === "breakdown" ? "Breakdown grade" : detail.kind === "concept" ? "Your answers" : "Review"} testId="loot-review">
				{detail.kind === "concept" && quest.kind === "concept" && <ConceptResultsSection quest={quest} results={detail.results} />}
				{detail.kind === "breakdown" && <BreakdownGradeSection grade={detail.grade} />}
				{detail.kind === "build" && (
					<>
						<p className="text-sm text-paper-muted">
							{detail.run.compiled ? `Tests ${detail.run.testsPassed} of ${detail.run.testsTotal} passed.` : "It did not compile, so there is no review this time. Improve opens the quest with the compiler output beside your code."}
						</p>
						{detail.review && <CodeReviewSection review={detail.review} attemptId={outcome.attempt.attemptId} onRetryReview={() => void retryReview()} isRetrying={retry.isPending} />}
						{retry.error && <AppErrorView error={retry.error} onRetry={() => void retryReview()} />}
					</>
				)}
			</Panel>

			{passed && alternative && (
				<Panel title="An alternative" testId="loot-alternative">
					<PatternChips patternIds={quest.patterns} />
					<TermText markdown={alternative} />
				</Panel>
			)}

			<div className="flex flex-wrap gap-2 pb-4">
				<Button variant="secondary" onClick={() => navigate("quest", { id: quest.id })} data-testid="loot-improve">
					<WrenchIcon />
					Improve
				</Button>
				{detail.kind === "build" && (
					<Button variant="secondary" onClick={() => void openEditor.run(quest.id)} disabled={openEditor.isPending} data-testid="see-it-run">
						<MonitorPlayIcon />
						See it run
					</Button>
				)}
				<Button variant="pack" autoFocus disabled={!nextKnown} onClick={() => (nextQuest ? navigate("quest", { id: nextQuest.id }) : navigate("worldMap"))} data-testid="loot-next">
					{!nextKnown ? "Next" : nextQuest ? `Next: ${nextQuest.title}` : "Back to the map"}
					<ArrowRightIcon />
				</Button>
			</div>
			{openEditor.error && <AppErrorView error={openEditor.error} onRetry={() => void openEditor.run(quest.id)} />}
		</section>
	);
}
