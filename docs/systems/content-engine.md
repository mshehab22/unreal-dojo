# System: content-engine

Owner: builder-content-engine. Folder: `src/main/services/content/`, `src/shared/types/content.ts`, `tools/verify-content.ts`. Research: `research/gamedevtv-exercise-design.md` section 7 (author rules), `research/gamified-learning-platforms.md` section 3 (item types).

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

Front matter in YAML, then level-1 sections in a fixed order per kind (documented with one full example per kind in `docs/systems/content-authoring.md`). The parser errors name the file and the missing or malformed section. Duplicate ids are an error.

## Term linking

`TermLinker` is a remark plugin: it finds glossary terms and aliases in text nodes (longest match first, case sensitive for identifiers such as `AActor`, case insensitive for plain words such as "actor"), skips code blocks and headings, and emits a `glossaryTerm` node with the entry id. The renderer maps that node to a `HoverCard`. The same alias table feeds Monaco's hover and completion providers (exposed through IPC as a flat list).

## Verifier (`tools/verify-content.ts`)

Checks, all with file names in the output:
- every quest parses; required sections per kind present; hints are 3; rubric sizes; concepts non-empty; `terms[]` ids exist in the glossary; `patterns[]` ids exist in patterns.json; prerequisites exist; the prerequisite graph has no cycles and every quest is reachable from a pack's first quest
- every glossary term appears in at least one concept quest and one build quest (warning until the curriculum is complete, error at release)
- each world's build quests fade: first is worked or faded, last is stub or blank, never a step backward
- from world 3 of each pack on, each world has at least one quest whose brief names an earlier pattern or term (checked through `patterns[]` or `terms[]` overlap with earlier worlds)
- every pattern has at least three build quests listing it across packs (warning until complete)
- breakdown quests have at least two reference plans and every required piece appears in each plan
- `--engine <path>`: copies the sandbox template to a temp folder, writes every build quest's reference solution and tests, builds once, runs all `Dojo.*` tests headless, and reports per quest; also checks that a build quest's starter does not already pass its tests (starter compile may fail; that is fine)
- `--pack <id>` and `--quest <id>` filters

## Done criteria

- Unit tests: one happy path per kind, three malformed cases, term linking (identifier vs plain word, inside code blocks, inside headings), reachability, fade check.
- Verifier runs in under 3 seconds for 300 quests in parse-only mode.
- `docs/systems/content-authoring.md` has one complete example file per kind that parses.
