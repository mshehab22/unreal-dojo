# System: content-engine

Owner: builder-content-engine. Folder: `src/main/services/content/`, `src/shared/types/content.ts`, `tools/verify-content.ts`, `tools/verifier/`. Research: `research/gamedevtv-exercise-design.md` section 7 (author rules), `research/gamified-learning-platforms.md` section 3 (item types).

## Purpose

Load packs, worlds, quests, glossary, and pattern cards from disk into typed objects; link glossary terms inside any text; verify content.

## Content layout

```
content/
  glossary.json                 GlossaryEntry[]
  patterns.json                 PatternCard[]
  packs/<pack-id>/pack.json
  packs/<pack-id>/worlds/<nn-world-id>/world.json
  packs/<pack-id>/worlds/<nn-world-id>/<nn-slug>.md
  examples/<nn-kind-slug>.md    format examples, one per kind; parsed by the verifier, never loaded into a pack
tools/solutions/<quest-id>/<FileName>     reference solutions, never loaded by the app
```

## Types (discriminated union on `kind`)

Common front matter: `id`, `title`, `order`, `kind`, `difficulty` 1..5, `patterns[]`, `skills[]`, `terms[]` (glossary ids used), `prerequisites[]` (quest ids), `xp`, `estimatedMinutes`, `concepts[]`.

- concept: `predict` (one question shown before the card), `card` (markdown), `example` (cpp), `questions[]` (types: multiple-choice, fill-blank, which-pattern, spot-the-bug, explain-in-one-sentence with a model answer and rubric).
- drill: generated at runtime from due items; no files. Drill item banks live inside concept quests (`questions[]`) and pattern cards (`recall[]`, `scenarios[]`), plus `parsons[]` blocks in build quests (ordered lines plus distractor lines with the mistake each one shows).
- breakdown: `spec` (markdown: the finished mechanic or system, acceptance criteria), `requiredPieces[]` ({ kind: class|component|data|event|step, label, why }), `referencePlans[]` (two or more; each a list of pieces with labels and edges), `rubric[]`, `alternativeNote` (markdown shown after).
- build and refactor: `scaffold` (worked|faded|stub|blank), `brief` (markdown with a `## See it in the editor` subsection), `files[]` ({ name, starter, markedLines? for worked level }), `tests` (UE automation test source), `hints[]` (3), `rubric[]` (5 to 6; 8 for bosses), `alternative` (markdown with a tradeoff note), `parsons?`.
- boss: `spec`, `requiredPieces`, `referencePlans`, `pieces[]` (build quest ids), `integrationRubric[]`.

Glossary entry: `{ id, term, aliases[], category, short, long, unrealDocsUrl, related[], firstQuestId? }`. Pattern card: `{ id, title, intent, problem, unrealForm, whenNot, useCaseQuestIds[], recall[], scenarios[] }`.

## Markdown format

Front matter in YAML between two `---` lines, then level-1 sections in a fixed order per kind. Every section is required unless marked optional, no other level-1 sections are allowed, and nothing may sit between the front matter and the first section. Headings inside code fences are ignored. The full working example of each kind is in `content/examples/` (A101).

Common front matter (every kind): `id`, `title`, `order` (1 or more, unique in the world), `kind`, `difficulty` (1 to 5), `patterns`, `skills`, `terms`, `prerequisites`, `concepts` (lists, may be empty), `xp` (0 or more), `estimatedMinutes` (1 or more). Unknown fields are an error, so typos never pass silently. Extra front matter: build and refactor add `scaffold` (worked, faded, stub, blank); boss adds `pieces` (build quest ids, at least one).

Section order per kind (the table lives in code as `SECTION_LAYOUT` in `src/main/services/content/sectionLayout.ts`; keep both in step):

| Kind | Sections, in order |
|---|---|
| concept | `# Predict`, `# Card`, `# Example`, `# Questions` |
| breakdown | `# Spec`, `# Required Pieces`, `# Reference Plans`, `# Rubric`, `# Alternative Note` |
| build | `# Brief`, `# Files`, `# Tests`, `# Hints`, `# Rubric`, `# Alternative`, `# Parsons` (optional) |
| refactor | same as build |
| boss | `# Spec`, `# Required Pieces`, `# Reference Plans`, `# Integration Rubric` |
| drill | no file; a file with `kind: drill` is an error |

What each section holds (A100):
- Markdown prose: Card, Spec, Brief, Alternative, Alternative Note. Brief must contain a `## See it in the editor` subsection.
- One fenced code block and nothing else: Example and Tests (` ```cpp `).
- One ` ```yaml ` block and nothing else: Predict (one question), Questions (a list of questions), Required Pieces, Reference Plans, Parsons (lists).
- A bullet list (`- ` per item; indented lines continue the item above): Hints (exactly 3), Rubric, Integration Rubric. Rubric sizes (5 to 6, 8 for bosses) are a verifier check in M1.8.
- Files: one `## <FileName>` subsection per starter file, each with one ` ```cpp ` block. A worked or faded starter marks a line for the self-explanation gate with an end-of-line comment `// @explain: <model reason>`; the parser removes the comment from the starter and records `markedLines` with the line number and reason (A102).

Question shapes (shared with `patterns.json`): every question has `id`, `type`, `prompt`, `explanation`. Question ids are unique within their quest (predict plus questions) or within their pattern card (recall plus scenarios). multiple-choice adds `choices` (at least 2) and `answerIndex`; fill-blank adds `acceptedAnswers` and needs exactly one `___` gap in the prompt; which-pattern adds `choices` and `answer` (pattern ids) and `distractorNotes` (`{ choice, why }`, at least one); spot-the-bug adds `code`, `bugLine` (1-based, counted after blank lines before the code and whitespace after it are trimmed), `fix`; explain-in-one-sentence adds `modelAnswer` and `rubric`. multiple-choice, fill-blank, and explain-in-one-sentence may add `code`.

Plan shapes: a required piece is `{ id, kind, label, why }`; a reference plan is `{ id, title, pieces, edges }` where each piece is `{ id, kind, label, covers }` (`covers` lists required piece ids) and each edge is `{ from, to, label }` between pieces of the same plan. The parser checks that every `covers` id and edge end exists; "every required piece appears in each plan" is a verifier check (M1.8).

Folder rules: a pack folder name equals its `pack.json` id; a world folder is `<nn>-<world-id>` and its number is the world order; a world folder holds only `world.json` and `<nn>-<slug>.md` files.

Errors name the file (relative to `content/`), and the section and line when known, for example `packs/p1/worlds/01-actors/03-door.md line 41, Hints: expected exactly 3 hints, found 2`. Duplicate ids are errors: quest ids across every loaded pack, pack ids, world ids in a pack, glossary ids, pattern ids, and question, piece, plan, file, and Parsons ids inside one quest. A file or entry with any problem is left out of the loaded content and the rest still loads. For a duplicate id or a repeated `order`, the first file or entry (by path, then position) keeps it and each later one is flagged and left out.

## Parser structure

- `ContentLoader` (`load({ packId? })`, `loadExamples()`) walks the folder and returns `LoadedContent` with every problem; it never throws on bad content.
- `parseQuestFile` parses one quest file: `splitQuestFile` cuts front matter and sections (fence aware through `FenceTracker`), gray-matter parses the front matter and every ` ```yaml ` block (`parseYaml`), `checkSectionLayout` checks the order, and zod schemas in `schemas/` validate the data. `validateWith` turns zod issues into problems with a field path and plain words (`Questions[3].modelAnswer: missing (expected text)`, `kind: "essay" is not allowed (expected one of: ...)`, `dificulty: unknown field`). Cross references (plan edges and `covers`, ids repeated inside a quest, the hint count) are checked after the schemas pass.
- `ProblemList` collects problems for one file so one run reports all of them.

## Term linking

`TermLinker` is a remark plugin: it finds glossary terms and aliases in text nodes (longest match first, case sensitive for identifiers such as `AActor`, case insensitive for plain words such as "actor"), skips code blocks and headings, and emits a `glossaryTerm` node with the entry id. The renderer maps that node to a `HoverCard`. The same alias table feeds Monaco's hover and completion providers (exposed through IPC as a flat list).

## Verifier (`tools/verify-content.ts`)

Parse-only mode (M0.4, built): parses every pack, the glossary, the patterns, and `content/examples/`, prints `ok` or `FAIL` per file with each problem under it, then a summary line, and exits 1 on any problem (2 for a bad command line). `--content <folder>` points it at another folder (tests and fixtures). Later checks plug in as `ContentCheck` objects (`tools/verifier/ContentCheck.ts`) passed to `runVerifier`; `PARSE_ONLY_CHECKS` is empty until M1.8 adds them. `--engine` is refused with exit 2 until M1.8 builds it. Measured: 300 quests plus the real glossary and patterns parse in about 46 ms, 0.28 s for the whole command on the MacBook Air.

Checks, all with file names in the output (the ones beyond parsing arrive in M1.8):
- every quest parses; required sections per kind present; hints are 3; rubric sizes; concepts non-empty; `terms[]` ids exist in the glossary; `patterns[]` ids exist in patterns.json; prerequisites exist; the prerequisite graph has no cycles and every quest is reachable from a pack's first quest
- every glossary term appears in at least one concept quest and one build quest (warning until the curriculum is complete, error at release)
- each world's build quests fade: first is worked or faded, last is stub or blank, never a step backward
- from world 3 of each pack on, each world has at least one quest whose brief names an earlier pattern or term (checked through `patterns[]` or `terms[]` overlap with earlier worlds)
- every pattern has at least three build quests listing it across packs (warning until complete)
- breakdown quests have at least two reference plans and every required piece appears in each plan
- multiple-choice and which-pattern questions have 3 or more distinct choices
- which-pattern choices and answer are pattern ids in patterns.json, with one distractor note per wrong choice
- glossary `related` ids resolve to glossary entries
- glossary `unrealDocsUrl` links are pinned to `?application_version=5.8`
- `--engine <path>`: copies the sandbox template to a temp folder, writes every build quest's reference solution and tests, builds once, runs all `Dojo.*` tests headless, and reports per quest; also checks that a build quest's starter does not already pass its tests (starter compile may fail; that is fine)
- `--pack <id>` and `--quest <id>` filters

## Done criteria

- Unit tests: one happy path per kind, three malformed cases, term linking (identifier vs plain word, inside code blocks, inside headings), reachability, fade check.
- Verifier runs in under 3 seconds for 300 quests in parse-only mode.
- `docs/systems/content-authoring.md` has one complete example file per kind that parses.
