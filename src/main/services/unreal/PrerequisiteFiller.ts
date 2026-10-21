// Fills earlier quests a quest compiles against with their reference solution when the learner's own files cannot be used (A65, A401).
import type { QuestFileWriter } from "./QuestFileWriter";
import type { ReferenceSolutions } from "./ReferenceSolutions";

/** One prerequisite quest whose files came from the reference solution. */
export interface FilledPrerequisite
{
	questId: string;

	/** The file names written, in order. */
	fileNames: string[];

	/** Why the reference was used, in plain English. */
	reason: string;
}

/** Answers whether the learner passed a quest themselves. */
export type PassedCheck = (questId: string) => boolean;

/** Decides, per prerequisite, whether the learner's files stay or the reference solution goes in. */
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

	/** Writes the reference solution for every prerequisite the learner has not passed, or whose sandbox folder lacks a file the reference has. Returns what was filled. Throws when a needed reference solution is missing. */
	async fill(sandboxFolder: string, prerequisiteIds: string[], isPassed: PassedCheck): Promise<FilledPrerequisite[]>
	{
		const filled: FilledPrerequisite[] = [];

		for (const questId of prerequisiteIds)
		{
			const reference = await this.solutions.filesOf(questId);
			if (reference === null) throw new Error(`No reference solution for the earlier quest ${questId}`);

			const fileNames = Object.keys(reference);
			const existing = await this.writer.existingLearnerFiles(sandboxFolder, questId);
			const missing = fileNames.filter((fileName) => !existing.includes(fileName));
			const passed = isPassed(questId);

			// A passed quest with all its files in the sandbox keeps the learner's own code.
			if (passed && missing.length === 0) continue;

			await this.writer.writeLearnerFiles(sandboxFolder, questId, reference);
			filled.push({ questId, fileNames, reason: passed ? `your files for it are missing (${missing.join(", ")})` : "you have not passed it yourself (tested out or not done)" });
		}

		return filled;
	}
}
