// The extension point for verifier checks that run after parsing (fade ladder, reachability, term coverage: M1.8).
import type { AuthoredQuest, ContentProblem, LoadedContent } from "../../src/shared/types/content";

/** Everything a check can look at: the loaded packs, glossary, and patterns, plus the parsed format examples. */
export interface VerifierInput
{
	content: LoadedContent;
	examples: AuthoredQuest[];
}

/** One check over the whole content set. Each problem it returns must name the file it is about. */
export interface ContentCheck
{
	/** Short name shown in the report, such as "fade ladder". */
	name: string;

	run(input: VerifierInput): ContentProblem[];
}
