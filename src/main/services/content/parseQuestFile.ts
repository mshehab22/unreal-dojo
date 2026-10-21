// Parses one `<nn-slug>.md` quest file into a typed quest, reporting every problem with the file and section.
import type {
	AuthoredQuest,
	AuthoredQuestKind,
	CodeQuestFields,
	QuestFrontMatter,
	QuestFile,
	QuestKind,
	Question,
	ReferencePlan,
	RequiredPiece,
	ScaffoldLevel,
} from "@shared/types/content";

import { ObjectReader, readObjectList } from "./ObjectReader";
import type { ProblemList } from "./ProblemList";
import { parseYaml } from "./parseYaml";
import { readParsons } from "./readParsons";
import { createReferencePlanReader, readRequiredPiece } from "./readPlanParts";
import { readQuestion } from "./readQuestion";
import { readStarterFile } from "./readStarterFile";
import { readBulletList, readMarkdown, readSingleCodeBlock, readSubsections, readYamlBlock } from "./sectionContent";
import { checkSectionLayout } from "./sectionLayout";
import { splitQuestFile, type MarkdownSection } from "./splitQuestFile";

/** Every kind a front matter `kind` may name; drill is listed so the parser can explain why it is refused. */
const QUEST_KINDS: readonly QuestKind[] = ["concept", "drill", "breakdown", "build", "refactor", "boss"];

/** Every scaffold level, from most help to none. */
const SCAFFOLD_LEVELS: readonly ScaffoldLevel[] = ["worked", "faded", "stub", "blank"];

/** The subsection every build and refactor brief must have. */
const SEE_IT_SUBSECTION = "See it in the editor";

/** Label used for front matter problems. */
const FRONT_MATTER = "front matter";

/** The sections of one file, keyed by title, plus the problem list they report into. */
interface SectionSource
{
	sections: Map<string, MarkdownSection>;
	problems: ProblemList;
}

/** Parses the YAML front matter text, reporting malformed YAML with its file line. */
function parseFrontMatter(source: string, firstLine: number, problems: ProblemList): unknown
{
	const result = parseYaml(source);

	if (result.ok) return result.data;

	problems.add(result.message, { section: FRONT_MATTER, line: firstLine + result.line - 1 });
	return undefined;
}

/** Reads the front matter fields every kind shares. */
function readCommonFrontMatter(reader: ObjectReader, kind: QuestKind): QuestFrontMatter
{
	return {
		id: reader.string("id"),
		title: reader.string("title"),
		order: reader.integer("order", 1),
		kind,
		difficulty: reader.integer("difficulty", 1, 5),
		patterns: reader.stringList("patterns"),
		skills: reader.stringList("skills"),
		terms: reader.stringList("terms"),
		prerequisites: reader.stringList("prerequisites"),
		xp: reader.integer("xp", 0),
		estimatedMinutes: reader.integer("estimatedMinutes", 1),
		concepts: reader.stringList("concepts"),
	};
}

/** Reads a section's ```yaml list, each entry with `readEntry`. */
function readYamlList<Entry>(source: SectionSource, title: string, readEntry: (reader: ObjectReader) => Entry): Entry[]
{
	const section = source.sections.get(title);

	if (section === undefined) return [];

	const data = readYamlBlock(section, source.problems);

	if (data === undefined) return [];

	if (!Array.isArray(data) || data.length === 0)
	{
		source.problems.add("expected a non-empty YAML list (each entry starting with \"- \")", { section: title, line: section.bodyLine });
		return [];
	}

	return readObjectList(data, title, source.problems, { section: title, line: section.bodyLine }, readEntry);
}

/** Reads a Markdown section, or "" when it is missing (already reported by the layout check). */
function markdownOf(source: SectionSource, title: string): string
{
	const section = source.sections.get(title);

	return section === undefined ? "" : readMarkdown(section, source.problems);
}

/** Reads a bullet-list section, or [] when it is missing. */
function bulletsOf(source: SectionSource, title: string): string[]
{
	const section = source.sections.get(title);

	return section === undefined ? [] : readBulletList(section, source.problems);
}

/** Reads a section that holds one code block in `language`, or "" when it is missing. */
function codeOf(source: SectionSource, title: string, language: string): string
{
	const section = source.sections.get(title);

	return section === undefined ? "" : readSingleCodeBlock(section.body, section.bodyLine, language, title, source.problems);
}

/** Reports any id used twice inside one quest's list (question ids, piece ids, plan ids). */
function reportRepeatedIds(ids: readonly string[], what: string, section: string, problems: ProblemList): void
{
	const seen = new Set<string>();

	for (const id of ids)
	{
		if (seen.has(id)) problems.add(`${what} id "${id}" is used twice in this quest`, { section });

		seen.add(id);
	}
}

/** Reads the concept sections: Predict, Card, Example, Questions. */
function readConceptBody(source: SectionSource): { predict: Question; card: string; example: string; questions: Question[] }
{
	const predictSection = source.sections.get("Predict");
	let predict: Question | undefined;

	if (predictSection !== undefined)
	{
		const data = readYamlBlock(predictSection, source.problems);

		if (data !== undefined)
		{
			const reader = ObjectReader.from(data, "Predict", source.problems, { section: "Predict", line: predictSection.bodyLine });

			if (reader !== undefined)
			{
				predict = readQuestion(reader);
				reader.finish();
			}
		}
	}

	const card = markdownOf(source, "Card");
	const example = codeOf(source, "Example", "cpp");
	const questions = readYamlList(source, "Questions", (reader) => readQuestion(reader));

	reportRepeatedIds([...(predict ? [predict.id] : []), ...questions.map((question) => question.id)], "question", "Questions", source.problems);

	// A missing Predict was already reported; the placeholder never leaves the parser because the problem count rose.
	return { predict: predict ?? ({} as Question), card, example, questions };
}

/** Reads the shared plan sections of breakdown and boss quests: Spec, Required Pieces, Reference Plans. */
function readPlanBody(source: SectionSource): { spec: string; requiredPieces: RequiredPiece[]; referencePlans: ReferencePlan[] }
{
	const spec = markdownOf(source, "Spec");
	const requiredPieces = readYamlList(source, "Required Pieces", readRequiredPiece);
	const requiredIds = new Set(requiredPieces.map((piece) => piece.id));
	const referencePlans = readYamlList(source, "Reference Plans", createReferencePlanReader(requiredIds));

	reportRepeatedIds(requiredPieces.map((piece) => piece.id), "required piece", "Required Pieces", source.problems);
	reportRepeatedIds(referencePlans.map((plan) => plan.id), "reference plan", "Reference Plans", source.problems);

	return { spec, requiredPieces, referencePlans };
}

/** Reads the build and refactor sections: Brief, Files, Tests, Hints, Rubric, Alternative, and optional Parsons. */
function readCodeQuestBody(source: SectionSource, scaffold: ScaffoldLevel): CodeQuestFields
{
	const brief = markdownOf(source, "Brief");
	const briefSection = source.sections.get("Brief");

	if (briefSection !== undefined && !readSubsections(briefSection).subsections.some((subsection) => subsection.title === SEE_IT_SUBSECTION))
	{
		source.problems.add(`the brief needs a "## ${SEE_IT_SUBSECTION}" subsection`, { section: "Brief", line: briefSection.line });
	}

	const filesSection = source.sections.get("Files");
	const files: QuestFile[] = [];

	if (filesSection !== undefined)
	{
		const { leadingText, subsections } = readSubsections(filesSection);

		if (leadingText !== "") source.problems.add("put each file under its own \"## <FileName>\" heading; no text before the first one", { section: "Files", line: filesSection.bodyLine });
		if (subsections.length === 0) source.problems.add("expected at least one \"## <FileName>\" subsection with a ```cpp block", { section: "Files", line: filesSection.line });

		for (const subsection of subsections) files.push(readStarterFile(subsection, source.problems));

		reportRepeatedIds(files.map((file) => file.name), "file", "Files", source.problems);
	}

	const tests = codeOf(source, "Tests", "cpp");
	const hints = bulletsOf(source, "Hints");

	if (source.sections.has("Hints") && hints.length !== 3) source.problems.add(`expected exactly 3 hints, found ${hints.length}`, { section: "Hints", line: source.sections.get("Hints")?.line });

	const rubric = bulletsOf(source, "Rubric");
	const alternative = markdownOf(source, "Alternative");
	const fields: CodeQuestFields = { scaffold, brief, files, tests, hints: hints as [string, string, string], rubric, alternative };

	if (source.sections.has("Parsons"))
	{
		fields.parsons = readYamlList(source, "Parsons", readParsons);
		reportRepeatedIds(fields.parsons.map((block) => block.id), "Parsons block", "Parsons", source.problems);
	}

	return fields;
}

/** Reads the kind-specific front matter and the body sections, then assembles the quest. */
function readQuestBody(kind: AuthoredQuestKind, common: QuestFrontMatter, reader: ObjectReader, source: SectionSource): AuthoredQuest
{
	switch (kind)
	{
		case "concept":
			return { ...common, kind, ...readConceptBody(source) };

		case "breakdown":
		{
			const plan = readPlanBody(source);
			return { ...common, kind, ...plan, rubric: bulletsOf(source, "Rubric"), alternativeNote: markdownOf(source, "Alternative Note") };
		}

		case "build":
		case "refactor":
		{
			const scaffold = reader.oneOf("scaffold", SCAFFOLD_LEVELS);
			return { ...common, kind, ...readCodeQuestBody(source, scaffold) };
		}

		case "boss":
		{
			const pieces = reader.stringList("pieces", false);
			const plan = readPlanBody(source);
			return { ...common, kind, ...plan, pieces, integrationRubric: bulletsOf(source, "Integration Rubric") };
		}
	}
}

/**
 * Parses the text of one quest file. Returns the quest, or undefined when anything is wrong; every problem
 * is added to `problems` with the section and line, so one run reports all of them.
 */
export function parseQuestFile(text: string, problems: ProblemList): AuthoredQuest | undefined
{
	const before = problems.count;
	const split = splitQuestFile(text);

	if (!split.ok)
	{
		problems.add(split.message, { line: split.line });
		return undefined;
	}

	if (split.textBeforeFirstSectionLine !== undefined)
	{
		problems.add("text after the front matter must sit inside a \"# Section\"", { line: split.textBeforeFirstSectionLine });
	}

	const data = parseFrontMatter(split.frontMatter, split.frontMatterLine, problems);

	if (data === undefined) return undefined;

	const reader = ObjectReader.from(data, "", problems, { section: FRONT_MATTER, line: 1 });

	if (reader === undefined) return undefined;

	const kind = reader.oneOf("kind", QUEST_KINDS);

	if (problems.count > before)
	{
		// Without a valid kind there is no section layout to check against.
		reader.finish();
		return undefined;
	}

	if (kind === "drill")
	{
		reader.report("kind", "drill quests are built at runtime and have no file; put drill items in concept questions, pattern cards, or Parsons blocks");
		return undefined;
	}

	const common = readCommonFrontMatter(reader, kind);
	const sections = checkSectionLayout(kind, split.sections, problems);
	const quest = readQuestBody(kind, common, reader, { sections, problems });

	reader.finish();

	return problems.count > before ? undefined : quest;
}
