// Parses one `<nn-slug>.md` quest file into a typed quest, reporting every problem with the file and section.
import { z } from "zod";

import type {
	AuthoredQuest,
	AuthoredQuestKind,
	CodeQuestFields,
	QuestFile,
	QuestKind,
	Question,
	ReferencePlan,
	RequiredPiece,
	ScaffoldLevel,
} from "@shared/types/content";

import type { ProblemList } from "./ProblemList";
import { parseYaml } from "./parseYaml";
import { readStarterFile } from "./readStarterFile";
import { FRONT_MATTER_SCHEMAS } from "./schemas/frontMatterSchemas";
import { parsonsSchema, referencePlanSchema, requiredPieceSchema } from "./schemas/planSchemas";
import { questionSchema } from "./schemas/questionSchemas";
import { validateWith } from "./schemas/validateWith";
import { readBulletList, readMarkdown, readSingleCodeBlock, readSubsections, readYamlBlock } from "./sectionContent";
import { checkSectionLayout } from "./sectionLayout";
import { splitQuestFile, type MarkdownSection } from "./splitQuestFile";

/** Every kind a front matter `kind` may name; drill is listed so the parser can explain why it is refused. */
const QUEST_KINDS: readonly QuestKind[] = ["concept", "drill", "breakdown", "build", "refactor", "boss"];

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

/** Parses the YAML front matter text with gray-matter, reporting malformed YAML with its file line. */
function parseFrontMatter(source: string, firstLine: number, problems: ProblemList): unknown
{
	const result = parseYaml(source);

	if (result.ok) return result.data;

	problems.add(result.message, { section: FRONT_MATTER, line: firstLine + result.line - 1 });
	return undefined;
}

/** Checks `kind` on its own first, so a drill or a typo gets one clear message before the other fields are read. */
function readKind(data: unknown, problems: ProblemList): AuthoredQuestKind | undefined
{
	const location = { section: FRONT_MATTER, line: 1 };

	if (typeof data !== "object" || data === null || Array.isArray(data))
	{
		problems.add("front matter must be a set of named fields", location);
		return undefined;
	}

	const kind = (data as Record<string, unknown>).kind;

	if (kind === "drill")
	{
		problems.add("kind: drill quests are built at runtime and have no file; put drill items in concept questions, pattern cards, or Parsons blocks", location);
		return undefined;
	}

	if (typeof kind !== "string" || !QUEST_KINDS.includes(kind as QuestKind))
	{
		const allowed = `expected one of: ${QUEST_KINDS.filter((name) => name !== "drill").join(", ")}`;
		problems.add(kind === undefined ? `kind: missing (${allowed})` : `kind: "${String(kind)}" is not allowed (${allowed})`, location);
		return undefined;
	}

	return kind as AuthoredQuestKind;
}

/** Validates a section's ```yaml block against `schema`; field paths in problems start with the section title. */
function yamlSectionOf<Output>(source: SectionSource, title: string, schema: z.ZodType<Output>): Output | undefined
{
	const section = source.sections.get(title);

	if (section === undefined) return undefined;

	const data = readYamlBlock(section, source.problems);

	if (data === undefined) return undefined;

	return validateWith(schema, data, source.problems, { section: title, line: section.bodyLine }, title);
}

/** Validates a section's ```yaml block as a non-empty list of `entry`. */
function yamlListOf<Entry>(source: SectionSource, title: string, entry: z.ZodType<Entry>): Entry[]
{
	return yamlSectionOf(source, title, z.array(entry).min(1)) ?? [];
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
	const predict = yamlSectionOf(source, "Predict", questionSchema);
	const card = markdownOf(source, "Card");
	const example = codeOf(source, "Example", "cpp");
	const questions = yamlListOf(source, "Questions", questionSchema);

	reportRepeatedIds([...(predict ? [predict.id] : []), ...questions.map((question) => question.id)], "question", "Questions", source.problems);

	// A missing or broken Predict was already reported; the placeholder never leaves the parser because the problem count rose.
	return { predict: predict ?? ({} as Question), card, example, questions };
}

/** Reports plan pieces that cover an unknown required piece, and edges whose ends are not pieces of the same plan. */
function checkPlanReferences(plan: ReferencePlan, requiredIds: ReadonlySet<string>, problems: ProblemList): void
{
	const pieceIds = new Set(plan.pieces.map((piece) => piece.id));
	const location = { section: "Reference Plans" };

	for (const piece of plan.pieces)
	{
		for (const covered of piece.covers)
		{
			if (!requiredIds.has(covered)) problems.add(`plan "${plan.id}": piece "${piece.id}" covers "${covered}", which is not a required piece id`, location);
		}
	}

	for (const edge of plan.edges)
	{
		if (!pieceIds.has(edge.from)) problems.add(`plan "${plan.id}": edge from "${edge.from}" does not name a piece in this plan`, location);
		if (!pieceIds.has(edge.to)) problems.add(`plan "${plan.id}": edge to "${edge.to}" does not name a piece in this plan`, location);
	}
}

/** Reads the shared plan sections of breakdown and boss quests and checks each plan's references. */
function readPlanBody(source: SectionSource): { spec: string; requiredPieces: RequiredPiece[]; referencePlans: ReferencePlan[] }
{
	const spec = markdownOf(source, "Spec");
	const requiredPieces = yamlListOf(source, "Required Pieces", requiredPieceSchema);
	const referencePlans = yamlListOf(source, "Reference Plans", referencePlanSchema);
	const requiredIds = new Set(requiredPieces.map((piece) => piece.id));

	reportRepeatedIds(requiredPieces.map((piece) => piece.id), "required piece", "Required Pieces", source.problems);
	reportRepeatedIds(referencePlans.map((plan) => plan.id), "reference plan", "Reference Plans", source.problems);

	for (const plan of referencePlans) checkPlanReferences(plan, requiredIds, source.problems);

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
	const hintsSection = source.sections.get("Hints");

	if (hintsSection !== undefined && hints.length !== 3) source.problems.add(`expected exactly 3 hints, found ${hints.length}`, { section: "Hints", line: hintsSection.line });

	const rubric = bulletsOf(source, "Rubric");
	const alternative = markdownOf(source, "Alternative");
	const fields: CodeQuestFields = { scaffold, brief, files, tests, hints: hints as [string, string, string], rubric, alternative };

	if (source.sections.has("Parsons"))
	{
		fields.parsons = yamlListOf(source, "Parsons", parsonsSchema);
		reportRepeatedIds(fields.parsons.map((block) => block.id), "Parsons block", "Parsons", source.problems);
	}

	return fields;
}

/** Validates the kind's front matter and reads its body sections, then assembles the quest (undefined if the front matter failed). */
function readQuest(kind: AuthoredQuestKind, frontMatter: unknown, source: SectionSource): AuthoredQuest | undefined
{
	const location = { section: FRONT_MATTER, line: 1 };

	switch (kind)
	{
		case "concept":
		{
			const common = validateWith(FRONT_MATTER_SCHEMAS.concept, frontMatter, source.problems, location);
			const body = readConceptBody(source);
			return common && { ...common, ...body };
		}

		case "breakdown":
		{
			const common = validateWith(FRONT_MATTER_SCHEMAS.breakdown, frontMatter, source.problems, location);
			const body = { ...readPlanBody(source), rubric: bulletsOf(source, "Rubric"), alternativeNote: markdownOf(source, "Alternative Note") };
			return common && { ...common, ...body };
		}

		case "build":
		{
			const common = validateWith(FRONT_MATTER_SCHEMAS.build, frontMatter, source.problems, location);
			const body = readCodeQuestBody(source, common?.scaffold ?? "worked");
			return common && { ...common, ...body };
		}

		case "refactor":
		{
			const common = validateWith(FRONT_MATTER_SCHEMAS.refactor, frontMatter, source.problems, location);
			const body = readCodeQuestBody(source, common?.scaffold ?? "worked");
			return common && { ...common, ...body };
		}

		case "boss":
		{
			const common = validateWith(FRONT_MATTER_SCHEMAS.boss, frontMatter, source.problems, location);
			const body = { ...readPlanBody(source), integrationRubric: bulletsOf(source, "Integration Rubric") };
			return common && { ...common, ...body };
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

	const frontMatter = parseFrontMatter(split.frontMatter, split.frontMatterLine, problems);

	if (frontMatter === undefined) return undefined;

	const kind = readKind(frontMatter, problems);

	if (kind === undefined) return undefined;

	const sections = checkSectionLayout(kind, split.sections, problems);
	const quest = readQuest(kind, frontMatter, { sections, problems });

	return problems.count > before ? undefined : quest;
}
