// Fills earlier quests a quest compiles against when their files are not in the sandbox (A65, A401, A408, A409).
import type { QuestFileWriter } from "./QuestFileWriter";
import type { ReferenceSolutions } from "./ReferenceSolutions";

/** Where a filled file came from. */
export type FilledFileSource = "your saved code" | "the reference solution" | "the boss's reference solution";

/** One file written into a prerequisite's folder. */
export interface FilledFile
{
	name: string;
	source: FilledFileSource;
}

/** One quest folder that received files, and why. */
export interface FilledPrerequisite
{
	/** The quest whose folder was written. */
	questId: string;

	/** Every file written, with its source. */
	files: FilledFile[];

	/** Why, in plain English. */
	reason: string;
}

/** What the filler needs to know about the learner and the content. */
export interface PrerequisiteFacts
{
	/** Whether the learner passed a quest themselves. */
	isPassed(questId: string): boolean;

	/** The learner's autosaved files for a quest, or an empty map. */
	savedFiles(questId: string): Record<string, string>;

	/** Whether a quest is a boss (its reference has code, tests, and piece overrides). */
	isBoss(questId: string): boolean;
}

/** Files planned for one folder: written as a whole folder (replacing it) or one by one (keeping the rest). */
interface FolderPlan
{
	replaceFolder: boolean;
	files: Map<string, { text: string; source: FilledFileSource }>;
	reason: string;
}

/** Decides, per prerequisite, which files go into the sandbox and from where, then writes them. Never touches a file that is already there, except where a boss's piece overrides apply (A409). */
export class PrerequisiteFiller
{
	private readonly writer: QuestFileWriter;
	private readonly solutions: ReferenceSolutions;

	/** Takes the quest writer and the reference solutions. */
	constructor(writer: QuestFileWriter, solutions: ReferenceSolutions)
	{
		this.writer = writer;
		this.solutions = solutions;
	}

	/** Plans every prerequisite, applies boss piece overrides last so they win regardless of order, writes, and returns what was filled. Throws when a needed reference solution is missing. */
	async fill(sandboxFolder: string, prerequisiteIds: string[], facts: PrerequisiteFacts): Promise<FilledPrerequisite[]>
	{
		const plans = new Map<string, FolderPlan>();
		const overrides = new Map<string, Record<string, string>>();

		for (const questId of prerequisiteIds)
		{
			if (facts.isBoss(questId)) await this.planBoss(sandboxFolder, questId, facts, plans, overrides);
			else await this.planPiece(sandboxFolder, questId, facts, plans);
		}

		for (const [pieceId, files] of overrides)
		{
			const plan = plans.get(pieceId) ?? { replaceFolder: false, files: new Map(), reason: "the boss you build on extends this piece" };

			for (const [name, text] of Object.entries(files)) plan.files.set(name, { text, source: "the boss's reference solution" });

			plans.set(pieceId, plan);
		}

		const filled: FilledPrerequisite[] = [];

		for (const [questId, plan] of plans)
		{
			if (plan.files.size === 0) continue;

			const files = Object.fromEntries([...plan.files].map(([name, entry]) => [name, entry.text]));

			if (plan.replaceFolder) await this.writer.writeLearnerFiles(sandboxFolder, questId, files);
			else await this.writer.writeSomeLearnerFiles(sandboxFolder, questId, files);

			const names = [...plan.files.keys()].sort();

			filled.push({ questId, files: names.map((name) => ({ name, source: plan.files.get(name)?.source ?? "the reference solution" })), reason: plan.reason });
		}

		return filled;
	}

	/** A build quest: passed with every file present keeps everything; passed with files missing gets only those, from the saved draft or else the reference; not passed (tested out or never done) gets its whole reference (A401, A408). */
	private async planPiece(sandboxFolder: string, questId: string, facts: PrerequisiteFacts, plans: Map<string, FolderPlan>): Promise<void>
	{
		const existing = await this.writer.existingLearnerFiles(sandboxFolder, questId);

		if (!facts.isPassed(questId))
		{
			const reference = await this.requireReference(questId);

			plans.set(questId, { replaceFolder: true, files: sourced(reference, "the reference solution"), reason: "you have not passed it yourself (tested out or not done)" });

			return;
		}

		const saved = facts.savedFiles(questId);
		const hasSaved = Object.keys(saved).length > 0;
		const expected = hasSaved ? saved : await this.requireReference(questId);
		const missing = Object.keys(expected).filter((name) => !existing.includes(name));
		if (missing.length === 0) return;

		const source: FilledFileSource = hasSaved ? "your saved code" : "the reference solution";

		plans.set(questId, { replaceFolder: false, files: sourced(pick(expected, missing), source), reason: "its files were missing from the sandbox (a reset removes them)" });
	}

	/** A boss: missing saved files come back from the saved draft; with nothing saved, an empty boss folder gets the boss's reference code and its piece overrides. Bosses cannot be tested out, so this is the reset case (A409). */
	private async planBoss(sandboxFolder: string, bossId: string, facts: PrerequisiteFacts, plans: Map<string, FolderPlan>, overrides: Map<string, Record<string, string>>): Promise<void>
	{
		const existing = await this.writer.existingLearnerFiles(sandboxFolder, bossId);
		const saved = facts.savedFiles(bossId);

		if (Object.keys(saved).length > 0)
		{
			const missing = Object.keys(saved).filter((name) => !existing.includes(name));

			if (missing.length > 0) plans.set(bossId, { replaceFolder: false, files: sourced(pick(saved, missing), "your saved code"), reason: "its files were missing from the sandbox (a reset removes them)" });

			return;
		}

		const boss = await this.solutions.bossOf(bossId);
		if (!boss) throw new Error(`No reference solution for the earlier quest ${bossId}`);

		// Any file in the boss folder is the learner's own integration; it is never replaced.
		if (existing.length > 0) return;

		// The boss's tests are not written: only the running quest's tests run.
		plans.set(bossId, { replaceFolder: true, files: sourced(boss.code, "the boss's reference solution"), reason: "its files were missing from the sandbox, and the boss's reference needs its own versions of some pieces" });

		for (const [pieceId, files] of Object.entries(boss.overrides)) overrides.set(pieceId, { ...(overrides.get(pieceId) ?? {}), ...files });
	}

	/** The quest's reference files. Throws when there are none. */
	private async requireReference(questId: string): Promise<Record<string, string>>
	{
		const reference = await this.solutions.filesOf(questId);
		if (reference === null) throw new Error(`No reference solution for the earlier quest ${questId}`);

		return reference;
	}
}

/** Tags every file with one source. */
function sourced(files: Record<string, string>, source: FilledFileSource): Map<string, { text: string; source: FilledFileSource }>
{
	return new Map(Object.entries(files).map(([name, text]) => [name, { text, source }]));
}

/** The named entries of a file map. */
function pick(files: Record<string, string>, names: string[]): Record<string, string>
{
	return Object.fromEntries(names.map((name) => [name, files[name] ?? ""]));
}
