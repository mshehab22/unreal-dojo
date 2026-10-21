// The payload check for every request type in src/shared/types, built from the small checks in payloadChecks.ts.
import {
	checkArray,
	checkFileMap,
	checkId,
	checkInteger,
	checkObject,
	checkOneOf,
	checkNullable,
	checkOptional,
	checkString,
	checkTaggedUnion,
	type PayloadCheck,
} from "./payloadChecks";

/** Longest absolute folder path accepted (Windows long paths included). */
const MAXIMUM_PATH_LENGTH = 1024;

/** Longest API key accepted. Anthropic keys are around 110 characters. */
const MAXIMUM_API_KEY_LENGTH = 512;

/** Longest display name. */
const MAXIMUM_NAME_LENGTH = 64;

/** Most daily offers (the spec has three). */
const DAILY_OFFER_COUNT = 3;

/** Most findings a review can hold, as an index bound. */
const MAXIMUM_FINDING_INDEX = 99;

/** An absolute or relative folder path; whether it exists is the service's job. */
export const folderPathCheck: PayloadCheck = checkString({ minimumLength: 1, maximumLength: MAXIMUM_PATH_LENGTH });

/** A display name such as the player name. */
export const playerNameCheck: PayloadCheck = checkString({ minimumLength: 1, maximumLength: MAXIMUM_NAME_LENGTH });

/** An Anthropic API key. The value is never echoed in a problem text. */
export const apiKeyCheck: PayloadCheck = checkString({ minimumLength: 1, maximumLength: MAXIMUM_API_KEY_LENGTH });

/** A daily offer index. */
export const dailyOfferIndexCheck: PayloadCheck = checkInteger({ minimum: 0, maximum: DAILY_OFFER_COUNT - 1 });

/** `SettingsPatch`: every field optional, `hasApiKey` and `firstRunCompletedAt` not allowed. */
export const settingsPatchCheck: PayloadCheck = checkObject({
	enginePath: checkOptional(checkNullable(folderPathCheck)),
	sandboxPath: checkOptional(checkNullable(folderPathCheck)),
	loopMode: checkOptional(checkOneOf(["auto", "fast", "headless"])),
	reviewProvider: checkOptional(checkOneOf(["auto", "claude-code", "anthropic-api", "tests-only"])),
	modelId: checkOptional(checkString({ minimumLength: 1, maximumLength: 128 })),
	theme: checkOptional(checkOneOf(["dark"])),
});

/** `RunRequest`: run id, quest id, learner files. */
export const runRequestCheck: PayloadCheck = checkObject({
	runId: checkId(),
	questId: checkId(),
	files: checkFileMap(),
});

/** `SandboxSetupRequest`: run id, engine folder, sandbox folder. */
export const sandboxSetupRequestCheck: PayloadCheck = checkObject({
	runId: checkId(),
	enginePath: folderPathCheck,
	folder: folderPathCheck,
});

/** `BreakdownPlan`: labeled pieces and typed edges. */
export const breakdownPlanCheck: PayloadCheck = checkObject({
	pieces: checkArray(
		checkObject({
			id: checkId(),
			kind: checkOneOf(["class", "component", "data", "event", "step"]),
			label: checkString({ minimumLength: 1, maximumLength: 200 }),
			purpose: checkString({ maximumLength: 2000 }),
		}),
	),
	edges: checkArray(
		checkObject({
			from: checkId(),
			to: checkId(),
			kind: checkOneOf(["owns", "listens-to", "spawns", "then"]),
		}),
	),
});

/** `ItemResponse`: a chosen option, a sentence, or an order of line ids. */
export const itemResponseCheck: PayloadCheck = checkTaggedUnion({
	choice: { choice: checkString({ maximumLength: 2000 }) },
	text: { text: checkString() },
	order: { lineIds: checkArray(checkId()) },
});

/** `QuestDraft`: quest id with optional files and optional board. */
export const questDraftCheck: PayloadCheck = checkObject({
	questId: checkId(),
	files: checkOptional(checkFileMap()),
	breakdownPlan: checkOptional(breakdownPlanCheck),
});

/** `ConceptSubmission`: quest id, the prediction (or null), one answer per question. */
export const conceptSubmissionCheck: PayloadCheck = checkObject({
	questId: checkId(),
	prediction: checkNullable(itemResponseCheck),
	answers: checkArray(itemResponseCheck),
});

/** `BreakdownSubmission`: quest id and the first plan. */
export const breakdownSubmissionCheck: PayloadCheck = checkObject({
	questId: checkId(),
	plan: breakdownPlanCheck,
});

/** `BreakdownRevision`: quest id, revised plan, and a non-empty revision note. */
export const breakdownRevisionCheck: PayloadCheck = checkObject({
	questId: checkId(),
	revisedPlan: breakdownPlanCheck,
	revisionNote: checkString({ minimumLength: 1 }),
});

/** `DrillAnswer`: session id, item id, response. */
export const drillAnswerCheck: PayloadCheck = checkObject({
	sessionId: checkId(),
	itemId: checkId(),
	response: itemResponseCheck,
});

/** `FindingExplanationRequest`: attempt id and finding index. */
export const findingExplanationRequestCheck: PayloadCheck = checkObject({
	attemptId: checkId(),
	findingIndex: checkInteger({ minimum: 0, maximum: MAXIMUM_FINDING_INDEX }),
});

/** `ReflectionAnswerRequest`: attempt id and the learner's sentence. */
export const reflectionAnswerRequestCheck: PayloadCheck = checkObject({
	attemptId: checkId(),
	answer: checkString({ minimumLength: 1, maximumLength: 2000 }),
});
