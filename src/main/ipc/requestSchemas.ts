// The zod schema for every value the renderer can send, each typed against its shared type so the two cannot drift apart.
import { z } from "zod";

import type {
	BreakdownPlan,
	BreakdownRevision,
	BreakdownSubmission,
	ConceptSubmission,
	DrillAnswer,
	ItemResponse,
	QuestDraft,
} from "@shared/types/progress";
import type { DrillRequest } from "@shared/types/drill";
import type { FindingExplanationRequest, ReflectionAnswerRequest } from "@shared/types/review";
import type { RunRequest, SandboxSetupRequest, SyntaxCheckRequest } from "@shared/types/run";
import type { SettingsPatch } from "@shared/types/settings";

/** Longest id the app accepts (quest, term, item, run, attempt, session ids). */
const MAXIMUM_ID_LENGTH = 128;

/** Ids are letters, digits, dot, underscore, and dash, starting with a letter or digit. Keeps ids safe to use in file names. */
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Learner file names: a plain file name with a C++ or text extension, never a path. */
const FILE_NAME_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_.-]*\.(h|hpp|cpp|inl|txt|ini)$/;

/** Most learner files in one request. */
const MAXIMUM_FILE_COUNT = 50;

/** Largest learner file in characters (about 1 MB). */
const MAXIMUM_FILE_LENGTH = 1_000_000;

/** Most items in any list payload (breakdown pieces, edges, answers). */
const MAXIMUM_LIST_LENGTH = 500;

/** Longest free text the learner can send (notes, sentences). */
const MAXIMUM_TEXT_LENGTH = 20_000;

/** Longest folder path accepted (Windows long paths included). */
const MAXIMUM_PATH_LENGTH = 1024;

/** Longest API key accepted. Anthropic keys are around 110 characters. */
const MAXIMUM_API_KEY_LENGTH = 512;

/** Longest display name. */
const MAXIMUM_NAME_LENGTH = 64;

/** Number of daily offers (the spec has three). */
const DAILY_OFFER_COUNT = 3;

/** Highest finding index a review can hold. */
const MAXIMUM_FINDING_INDEX = 99;

/** Largest scratch buffer accepted for a syntax check, in characters. */
const MAXIMUM_SNIPPET_LENGTH = 50_000;

/** Most self-explanations one quest holds (worked quests mark 3 to 5 lines). */
const MAXIMUM_SELF_EXPLANATION_COUNT = 20;

/** An id: letters, digits, dot, underscore, and dash, up to 128 characters. */
export const idSchema = z.string().min(1).max(MAXIMUM_ID_LENGTH).regex(ID_PATTERN, "may only hold letters, digits, dot, underscore, and dash");

/** A folder path; whether it exists is the service's job. */
export const folderPathSchema = z.string().min(1).max(MAXIMUM_PATH_LENGTH);

/** A display name such as the player name. */
export const playerNameSchema = z.string().trim().min(1).max(MAXIMUM_NAME_LENGTH);

/** An Anthropic API key. zod never puts the value in its messages, so the key is not echoed back. */
export const apiKeySchema = z.string().trim().min(1).max(MAXIMUM_API_KEY_LENGTH);

/** A hint spell index (0 to 2). */
export const hintIndexSchema = z.int().min(0).max(2);

/** A daily offer index. */
export const dailyOfferIndexSchema = z.int().min(0).max(DAILY_OFFER_COUNT - 1);

/** Free text such as a sentence or a note. */
const textSchema = z.string().max(MAXIMUM_TEXT_LENGTH);

/** One learner file name: a plain name with a C++ or text extension, no folders, no `..`. */
const fileNameSchema = z
	.string()
	.regex(FILE_NAME_PATTERN, "is not an allowed file name (a plain name ending in .h, .hpp, .cpp, .inl, .txt, or .ini)")
	.refine((fileName) => !fileName.includes(".."), "is not an allowed file name (contains ..)");

/** Learner files: up to 50 plain file names mapped to text of at most about 1 MB each. */
const fileMapSchema = z
	.record(fileNameSchema, z.string().max(MAXIMUM_FILE_LENGTH))
	.refine((files) => Object.keys(files).length <= MAXIMUM_FILE_COUNT, `must have at most ${MAXIMUM_FILE_COUNT} files`);

/** A TCP port for the editor's MCP server, outside the privileged range. */
export const mcpPortSchema = z.int().min(1024).max(65535);

/** `SettingsPatch`: every field optional, `hasApiKey` and `firstRunCompletedAt` not allowed. */
export const settingsPatchSchema: z.ZodType<SettingsPatch> = z.strictObject({
	enginePath: folderPathSchema.nullable().optional(),
	sandboxPath: z.null().optional(),
	loopMode: z.enum(["auto", "fast", "headless"]).optional(),
	reviewProvider: z.enum(["auto", "claude-code", "anthropic-api", "tests-only"]).optional(),
	modelId: z.string().min(1).max(MAXIMUM_ID_LENGTH).optional(),
	theme: z.enum(["dark"]).optional(),
	mcpPort: mcpPortSchema.optional(),
});

/** `RunRequest`: run id, quest id, learner files. */
export const runRequestSchema: z.ZodType<RunRequest> = z.strictObject({
	runId: idSchema,
	questId: idSchema,
	files: fileMapSchema,
});

/** `SandboxSetupRequest`: run id, engine folder, sandbox folder. */
export const sandboxSetupRequestSchema: z.ZodType<SandboxSetupRequest> = z.strictObject({
	runId: idSchema,
	enginePath: folderPathSchema,
	folder: folderPathSchema,
});

/** `BreakdownPlan`: labeled pieces and typed edges. */
export const breakdownPlanSchema: z.ZodType<BreakdownPlan> = z.strictObject({
	pieces: z
		.array(
			z.strictObject({
				id: idSchema,
				kind: z.enum(["class", "component", "data", "event", "step"]),
				label: z.string().min(1).max(200),
				purpose: z.string().max(2000),
			}),
		)
		.max(MAXIMUM_LIST_LENGTH),
	edges: z
		.array(
			z.strictObject({
				from: idSchema,
				to: idSchema,
				kind: z.enum(["owns", "listens-to", "spawns", "then"]),
			}),
		)
		.max(MAXIMUM_LIST_LENGTH),
});

/** `ItemResponse`: a chosen option, a sentence, or an order of line ids. */
export const itemResponseSchema: z.ZodType<ItemResponse> = z.discriminatedUnion("kind", [
	z.strictObject({ kind: z.literal("choice"), choice: z.string().max(2000) }),
	z.strictObject({ kind: z.literal("text"), text: textSchema }),
	z.strictObject({ kind: z.literal("order"), lineIds: z.array(idSchema).max(MAXIMUM_LIST_LENGTH) }),
]);

/** Worked-level self-explanations: marked line key to the learner's sentence. */
const selfExplanationsSchema = z
	.record(z.string().min(1).max(200), z.string().max(2000))
	.refine((explanations) => Object.keys(explanations).length <= MAXIMUM_SELF_EXPLANATION_COUNT, `must have at most ${MAXIMUM_SELF_EXPLANATION_COUNT} entries`);

/** `QuestDraft`: quest id with optional files, optional board, and optional self-explanations. */
export const questDraftSchema: z.ZodType<QuestDraft> = z.strictObject({
	questId: idSchema,
	files: fileMapSchema.optional(),
	breakdownPlan: breakdownPlanSchema.optional(),
	selfExplanations: selfExplanationsSchema.optional(),
});

/** `SyntaxCheckRequest`: quest id and the scratch buffer text. */
export const syntaxCheckRequestSchema: z.ZodType<SyntaxCheckRequest> = z.strictObject({
	questId: idSchema,
	code: z.string().max(MAXIMUM_SNIPPET_LENGTH),
});

/** `ConceptSubmission`: quest id, the prediction (or null), one answer per question. */
export const conceptSubmissionSchema: z.ZodType<ConceptSubmission> = z.strictObject({
	questId: idSchema,
	prediction: itemResponseSchema.nullable(),
	answers: z.array(itemResponseSchema).max(MAXIMUM_LIST_LENGTH),
});

/** `BreakdownSubmission`: quest id and the first plan. */
export const breakdownSubmissionSchema: z.ZodType<BreakdownSubmission> = z.strictObject({
	questId: idSchema,
	plan: breakdownPlanSchema,
});

/** `BreakdownRevision`: quest id, revised plan, and a non-empty revision note. */
export const breakdownRevisionSchema: z.ZodType<BreakdownRevision> = z.strictObject({
	questId: idSchema,
	revisedPlan: breakdownPlanSchema,
	revisionNote: textSchema.trim().min(1),
});

/** `DrillRequest`: today's due items, a world's test-out, or the Parsons fallback for a quest. */
export const drillRequestSchema: z.ZodType<DrillRequest> = z.discriminatedUnion("kind", [
	z.strictObject({ kind: z.literal("due") }),
	z.strictObject({ kind: z.literal("test-out"), worldId: idSchema }),
	z.strictObject({ kind: z.literal("parsons-fallback"), questId: idSchema }),
]);

/** `DrillAnswer`: session id, item id, response. */
export const drillAnswerSchema: z.ZodType<DrillAnswer> = z.strictObject({
	sessionId: idSchema,
	itemId: idSchema,
	response: itemResponseSchema,
});

/** `FindingExplanationRequest`: attempt id and finding index. */
export const findingExplanationRequestSchema: z.ZodType<FindingExplanationRequest> = z.strictObject({
	attemptId: idSchema,
	findingIndex: z.int().min(0).max(MAXIMUM_FINDING_INDEX),
});

/** `ReflectionAnswerRequest`: attempt id and the learner's sentence. */
export const reflectionAnswerRequestSchema: z.ZodType<ReflectionAnswerRequest> = z.strictObject({
	attemptId: idSchema,
	answer: z.string().trim().min(1).max(2000),
});
