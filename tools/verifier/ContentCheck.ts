// The extension point for verifier checks that run after parsing, and the input every check reads.
import type { AuthoredQuest, ContentProblem, LoadedContent } from "../../src/shared/types/content";

/** One quest with where it came from, so a check can name the file and reason about packs and worlds. */
export interface QuestRecord
{
	quest: AuthoredQuest;

	/** Path relative to the content folder. */
	file: string;

	/** Undefined for format examples, which belong to no pack. */
	packId?: string;

	/** Position of the quest's world inside its pack, 0 for the first world. Undefined for examples. */
	worldIndex?: number;
}

/** Everything a check can look at. */
export interface VerifierInput
{
	content: LoadedContent;

	/** The parsed format examples in `content/examples/`. */
	examples: AuthoredQuest[];

	/** Every pack quest (pack order, world order, quest order) followed by every example. */
	quests: QuestRecord[];

	/** `tools/solutions/` (or `--solutions`): one folder per build and refactor quest id. */
	solutionsFolder: string;

	/** `--release`: rules that warn while the curriculum is incomplete become errors. */
	release: boolean;
}

/** One check over the whole content set. Each problem it returns must name the file it is about. */
export interface ContentCheck
{
	/** Short name, such as "fade ladder". */
	name: string;

	run(input: VerifierInput): ContentProblem[] | Promise<ContentProblem[]>;
}
