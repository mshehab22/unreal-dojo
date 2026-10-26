// Builds and remembers drill sessions for the fake: a mixed due drill, a world's test-out, and the one-item Parsons fallback.
import type { LearnerQuest } from "@shared/types/catalog";
import type { DrillItem, PatternCard, Question } from "@shared/types/content";
import type { DrillRequest, DrillSession, DrillSessionItem } from "@shared/types/drill";

import { WORLD_ONE, worldOneQuest } from "./fixtures/fakeQuests";

/** A started session and the answers given so far, by item id. */
interface OpenSession
{
	session: DrillSession;
	correctByItem: Map<string, boolean>;

	/** Explain items only self-checked (tests-only): neither right nor wrong (A801). */
	selfChecked: Set<string>;
}

/** The first question of a given type in a concept quest, with the quest. */
function conceptQuestion(questId: string, type: Question["type"]): { quest: LearnerQuest; question: Question } | null
{
	const quest = worldOneQuest(questId);

	if (quest?.kind !== "concept") return null;

	const question = quest.questions.find((candidate) => candidate.type === type);

	return question ? { quest, question } : null;
}

/** A quest-question item, scheduled under the quest's first term (A310). */
function questQuestionItem(questId: string, type: Question["type"]): DrillSessionItem | null
{
	const found = conceptQuestion(questId, type);

	if (!found) return null;

	return { itemId: found.quest.terms[0] ?? questId, item: { source: "quest-question", questId, question: found.question } };
}

/** The mixed items a due drill or a World 1 test-out holds: recall, pattern discrimination, Parsons, and explain, from real content. */
function mixedItems(patternCards: readonly PatternCard[]): DrillSessionItem[]
{
	const component = patternCards.find((card) => card.id === "component");
	const state = patternCards.find((card) => card.id === "state");
	const dummy = worldOneQuest("f1-training-dummy");
	const parsons = dummy && (dummy.kind === "build" || dummy.kind === "refactor") ? dummy.parsons?.[0] : undefined;

	const items: (DrillSessionItem | null)[] = [
		questQuestionItem("f1-uproperty-specifiers", "multiple-choice"),
		state?.scenarios[0] ? { itemId: "state", item: { source: "pattern-scenario", patternId: "state", question: state.scenarios[0] } } : null,
		questQuestionItem("f1-reflection-and-uclass", "fill-blank"),
		parsons ? { itemId: `parsons.f1-training-dummy.${parsons.id}`, item: { source: "parsons", questId: "f1-training-dummy", parsons } } : null,
		questQuestionItem("f1-uobject-and-actor", "spot-the-bug"),
		component?.recall[0] ? { itemId: "component", item: { source: "pattern-recall", patternId: "component", question: component.recall[0] } } : null,
		questQuestionItem("f1-ufunction-specifiers", "explain-in-one-sentence"),
	];

	return items.filter((item): item is DrillSessionItem => item !== null);
}

/** The Parsons fallback item for a quest: its first block, or the training dummy's for a stand-in. */
function parsonsFallbackItem(questId: string): DrillSessionItem[]
{
	const quest = worldOneQuest(questId) ?? worldOneQuest("f1-training-dummy");
	const block = quest && (quest.kind === "build" || quest.kind === "refactor") ? quest.parsons?.[0] : undefined;

	if (!quest || !block) return [];

	const item: DrillItem = { source: "parsons", questId: quest.id, parsons: block };

	return [{ itemId: `parsons.${quest.id}.${block.id}`, item }];
}

/** Starts, answers, and finishes drill sessions in memory, as the drill service does between `startDrill` and `finishDrill`. */
export class FakeDrillSessions
{
	private readonly open = new Map<string, OpenSession>();
	private nextNumber = 1;

	/** Starts a session for a request. */
	start(request: DrillRequest, patternCards: readonly PatternCard[]): DrillSession
	{
		const items = request.kind === "parsons-fallback" ? parsonsFallbackItem(request.questId) : mixedItems(patternCards);
		const session: DrillSession = { sessionId: `fake-drill-${this.nextNumber}`, request, items };

		this.nextNumber += 1;
		this.open.set(session.sessionId, { session, correctByItem: new Map(), selfChecked: new Set() });

		return session;
	}

	/** One item of an open session, or undefined. */
	item(sessionId: string, itemId: string): DrillSessionItem | undefined
	{
		return this.open.get(sessionId)?.session.items.find((candidate) => candidate.itemId === itemId);
	}

	/** Remembers whether an item was answered right, and whether it was only self-checked. */
	recordAnswer(sessionId: string, itemId: string, correct: boolean, selfChecked = false): void
	{
		const open = this.open.get(sessionId);

		open?.correctByItem.set(itemId, correct);

		if (selfChecked) open?.selfChecked.add(itemId);
	}

	/** Ends a session and returns it with its answers; undefined when it is not open. */
	finish(sessionId: string): OpenSession | undefined
	{
		const found = this.open.get(sessionId);

		this.open.delete(sessionId);

		return found;
	}
}

/** The world id the fake's test-out drill covers. */
export const FAKE_TEST_OUT_WORLD_ID = WORLD_ONE.id;
