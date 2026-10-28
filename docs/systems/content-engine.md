# System: content-engine

Owner: builder-content-engine. Folder: `src/main/services/content/`, `src/shared/content/` (term matching shared by main and the renderer), `src/shared/types/content.ts`, `tools/verify-content.ts`, `tools/verifier/` (the C4458 scanner is in `tools/verifier/shadow/`), `tools/solutions/example-*` (the format examples' reference solutions). Research: `research/gamedevtv-exercise-design.md` section 7 (author rules), `research/gamified-learning-platforms.md` section 3 (item types).

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

Errors name the file (relative to `content/`), and the section and line when known, for example `packs/p1/worlds/01-actors/03-door.md line 41, Hints: expected exactly 3 hints, found 2`. Duplicate ids are errors: quest ids across every loaded pack, pack ids, world ids across every pack (A73: the catalog, `getWorld`, and the drill bank look worlds up by bare id; the later world in pack order is reported on its `world.json`, naming the earlier one, and left out with its quests), glossary ids, pattern ids, and question, piece, plan, file, and Parsons ids inside one quest. A file or entry with any problem is left out of the loaded content and the rest still loads. For a duplicate id or a repeated `order`, the first file or entry (by path, then position) keeps it and each later one is flagged and left out.

## Parser structure

- `ContentLoader` (`load({ packId? })`, `loadExamples()`) walks the folder and returns `LoadedContent` with every problem; it never throws on bad content. `load` also takes an optional `onTimings` callback that receives the quest file count and the summed read and parse times (M5.1l, A1260); the app's slow-load warning uses it.
- `parseQuestFile` parses one quest file: `splitQuestFile` cuts front matter and sections (fence aware through `FenceTracker`), gray-matter parses the front matter and every ` ```yaml ` block (`parseYaml`), `checkSectionLayout` checks the order, and zod schemas in `schemas/` validate the data. `validateWith` turns zod issues into problems with a field path and plain words (`Questions[3].modelAnswer: missing (expected text)`, `kind: "essay" is not allowed (expected one of: ...)`, `dificulty: unknown field`). Cross references (plan edges and `covers`, ids repeated inside a quest, the hint count) are checked after the schemas pass.
- `ProblemList` collects problems for one file so one run reports all of them.

## Term linking

Built in M1.8. The matcher and the plugin are in `src/shared/content/` so the main process and the renderer use the same code (A202); the alias list comes from app-shell (A213):

- `buildGlossaryAliases(entries)` (`src/main/content/buildGlossaryAliases.ts`, app-shell, M0.2b) makes the flat alias list (`GlossaryAlias[]` in `src/shared/types/catalog.ts`: `text`, `entryId`, `caseSensitive`, `codeOnly`, `short`), one row per spelling. The renderer gets it through `getGlossaryAliases`; Monaco's hover and completion providers and the TermLinker read it.
- `GlossaryMatcher` compiles the list once. `findInProse(text)` returns non-overlapping matches left to right; where matches overlap, the earliest start wins, then the longest, then the case-sensitive one ("Actor Component" beats "Actor"). A term never matches inside a longer word (`reactor`). `matchInlineCode(code)` returns the entry when the whole code span, trimmed and with a trailing `()` ignored, is one spelling.
- `termLinker` is the remark plugin. It replaces matched text with `glossaryTerm` nodes (`entryId`, the matched text or inline code as the child, and `data.hName: "glossary-term"` with `hProperties.entryId`, so react-markdown renders a `<glossary-term>` element that the renderer maps to a `HoverCard` through its `components` prop). It never touches headings, code blocks, links, link references, raw HTML, or terms already linked.

Case rule (A201, as built by `isIdentifierText`): a spelling is an identifier, matched case sensitively, when it has no spaces and has an underscore, `::`, a digit, or a capital after its first letter (`AActor`, `BeginPlay`, `UPROPERTY`, `UE_LOG`, `FMath::Lerp`). Anything else is a plain word, matched in any case (`Actor`, `actor`, `ACTOR`; `garbage collection`, `Actor Component`).

Inline code (A200): normal terms link inside inline code too, but only when the whole span is one spelling, so `` `AActor` `` and `` `BeginPlay()` `` link while `` `AActor* Owner` `` does not. Code-only terms (`linkMode: "code-only"`, A62: `check`, `ensure`, `cast`, `destroy`, `category`, `super`) link only that way and never in prose.

`GlossaryService` (`src/main/services/content/GlossaryService.ts`) holds a loaded glossary: `entries()`, `entry(id)`, `aliasTable()`, and one shared `matcher()`. Wiring it to IPC is app-shell's (the `DojoApi` method that returns the alias table).

## Verifier (`tools/verify-content.ts`)

Usage: `npx tsx tools/verify-content.ts [--pack <id>] [--quest <id>] [--content <folder>] [--solutions <folder>] [--engine <path>] [--workspace <folder>] [--release]`. It prints `ok`, `warn`, or `FAIL` per file with each problem under it (warnings marked), then a summary. Exit 0 when there are no errors (warnings allowed), 1 on any error, 2 on a bad command line or a `--solutions` folder that does not exist (V1, A1172).

Every pack is always read, so cross-pack references and duplicate ids are checked; `--pack` and `--quest` only narrow what is reported, and for `--engine` which quests are judged (A206). A run that judges nothing fails (A1172): `--pack` on a pack with no quests, or `--pack` / `--quest` naming nothing, reports `<scope> judged no quests`; `--solutions` pointing at a missing folder stops before anything is read; and `--engine` with no reference solution to build reports it under `(engine)` with the scope and the solutions folder. Code: `tools/verifier/runVerifier.ts` runs `CONTENT_CHECKS` (one `ContentCheck` per file in `tools/verifier/checks/`), then `--engine` runs `tools/verifier/engine/`.

Checks, all with file names in the output. Errors unless marked as warnings:
- parsing (M0.4): every quest, manifest, glossary entry, and pattern card parses; required sections per kind; 3 hints; ids unique
- quest shape: 5 to 6 rubric bullets on build, refactor, and breakdown quests, 8 integration rubric bullets on bosses; `concepts` not empty; a concept quest's `questions` include at least one that is not explain-in-one-sentence, so it can be graded without AI
- references: `terms[]` are glossary ids, `patterns[]` are pattern ids, `prerequisites[]` are quest ids (a pack quest may only require pack quests; an example may require examples or pack quests; never itself), boss `pieces` are build quests, pattern `useCaseQuestIds` are quests that list that pattern, glossary `firstQuestId` is a quest
- unlock graph (A203): no prerequisite cycles (reported with the path, `a -> b -> a`); every quest can unlock; inside a pack only the first quest of the first world has no prerequisites, so every other quest is reached from it
- fade ladder (A204): in each world, build quests never step back (worked, faded, stub, blank); with two or more build quests the first is worked or faded and the last is stub or blank; refactor quests are not on the ladder
- repetition: from world 3 of each pack on, some quest in each world lists a pattern or term an earlier world of that pack used (reported on the world's `world.json`)
- plan coverage: breakdowns and bosses have at least two reference plans, each plan covers every required piece, and every required piece label keeps a core of at least 4 characters once kind words and one-letter prefixes are removed (A302), so tests-only grading can match it
- questions: multiple-choice and which-pattern questions have 3 or more distinct choices (the schema needs at least 2); which-pattern choices and answer are pattern ids, with exactly one distractor note per wrong choice; checked in concept quests and in pattern card recall and scenario questions
- glossary: `related` ids resolve and are not the entry itself; `unrealDocsUrl` carries `?application_version=5.8`; no spelling belongs to two entries (the TermLinker could not choose, A209)
- term order, warning (A72, A670): a quest that is not a concept quest lists a term in `terms[]` that no concept quest earlier in course order teaches (earlier pack, earlier world, or lower order in the same world); the warning names the term and the concept quest that first teaches it later, or says no concept quest teaches it. Such a term links and can be drilled but does not gate the quest. A concept quest teaches its own terms, so it never warns about them; examples are skipped
- coverage, warning until release (A205): every glossary term is in some concept quest's and some build quest's `terms[]`; every pattern is listed by at least 3 build quests. Without `--release` each rule prints one summary warning with the first ids; with `--release` every missing id is its own error. Format examples do not count.
- reference solutions (A210): every build and refactor quest, examples included, has `tools/solutions/<quest-id>/` with exactly its file names. Every boss has a reference integration (A67, A215) in `tools/solutions/<boss-id>/`: `.h` and `.cpp` integration code plus one or more `*.Test.cpp` automation test files, and optionally one subfolder per piece named after a quest in the boss's `pieces`, holding extended versions of some of that piece's files (same names only); nothing else. A pack boss without the folder is an error (since M1.8c, A520); the format example boss `example-boss-lighthouse` stays a warning until it has one; a folder with no code, no tests, or other files is an error
- shadowed class members (V1, A1170, A1171, A1174): MSVC rejects a parameter or local that hides a data member of its class or of a base (error C4458); clang on the Mac does not warn. `shadowedMemberCheck` scans, without an engine, every C++ file under the solutions folder (sub-folders too) and the `starter` of every build and refactor quest, and reports each parameter or local that shares a name with a data member of the class it sits in, of a Dojo base class (looked up in the same quest, then in any other), or of the engine class it derives from. Errors for solutions and starters, on the quest's file under Files; the message names the class, the function, the hidden member and its declaring class. What the scan follows is what `cl /W4` was measured to do: only data members count (not member functions); static member functions, lambda parameters and lambda bodies are exempt. Engine members are curated in `tools/verifier/shadow/engineClassMembers.ts` from the UE 5.8.3 headers for AActor, APawn, ACharacter, UActorComponent, USceneComponent and UObject (refresh it after an engine upgrade; `World` and `bActive` are not members, so they are not listed). The scanner (`cppText`, `findClasses`, `findFunctions`, `ClassRegistry`, `findShadowedMembers`) is text based; its known blind spots are in A1171. The sandbox template carries no extra clang flag (A1173).
- cross-quest dependencies (A268, A214): when a build or refactor quest's starter, reference solution, or tests include `Quests/<other-quest-id>/...`, its brief has a line starting `Compiles against earlier quests:` that names each such quest with its `Quests/<id>/` path (a boss uses its spec); every quest named there exists and is in `prerequisites`
- `--engine <path>` (A208): see below

### `--engine <path>`

`<path>` is an engine root or its `Engine` folder (`~/Applications/UE_5.8` on the Mac), checked with the EngineLocator. Steps:

1. Take the persistent workspace for the engine's major.minor and bring it to the template's state (W14, A1280 to A1284). The workspace is `%LOCALAPPDATA%\UnrealDojo\verify-workspace\<major.minor>` on Windows and `~/Library/Caches/UnrealDojo/verify-workspace/<major.minor>` on macOS (its real path; on macOS the `/var` link confuses Unreal's build accelerator); `--workspace <folder>` or the environment variable `DOJO_VERIFY_WORKSPACE` moves the root that holds the per-version folders, and the flag wins. It is kept between runs, so builds are incremental, and nothing the verifier makes is left in the system temp folder. First `<workspace>.lock` is taken with an atomic `mkdir` (`WorkspaceLock`): a second run, from any worktree, logs who holds it and waits; a lock is broken only when its process is gone, it has no owner file after 60 s, or it is over 12 hours old (A1282). Then `syncWorkspace` writes the template files that differ (a file that already matches keeps its timestamp), writes `Dojo.uproject` with the engine association and, for older engines, without the 5.8-only plugins (A41), and removes every file and folder the template does not have, so quests and tests of the last run (or of a killed run) never reach the build. `Binaries`, `Intermediate`, `Saved` and `DerivedDataCache` are never touched. Code: `EngineSandbox.create`, `WorkspaceLock`, `syncWorkspace`, `workspaceLocation`.
2. Write every build and refactor quest's reference solution, and every boss's integration code (its `*.Test.cpp` files become its tests), then each boss's piece overrides over those pieces' solutions (the piece's own tests then run against the extended files, which checks the additions changed no rules), to `Source/Dojo/Quests/<quest-id>/` and its tests to `Source/Dojo/Tests/<quest-id>.Test.cpp` with M1.3's `QuestFileWriter`. Every solution is always written, because quests may use each other's classes; tests include quest headers as `Quests/<quest-id>/<File>.h`.
3. Build once with M1.3's `UnrealBuilder` (the exact command, process tree kill, and 15 minute limit in `docs/systems/unreal-pipeline.md`). A failed build is reported on every judged quest, quoting the error lines that point into that quest's files. If no quest in scope has a readable reference solution, nothing is built and the run fails (A1172).
4. Run every judged quest's tests in one headless run with M1.3's `AutomationTestRunner` (anchored test names, `ReportParser`). Each test named in a quest's `IMPLEMENT_*_AUTOMATION_TEST` macros (`declaredTestNames`) must run and pass.
5. Starter check (build and refactor quests only; a boss has none), one quest at a time, only for quests whose solution passed (A443). Before each check the sandbox is set to what a learner has at that quest: its starter, the solutions of every quest it needs (its prerequisites followed through every kind of quest, the quests on its "Compiles against earlier quests:" line, and a boss's pieces), and the piece overrides of every boss among those. Later quests and unneeded bosses are taken out, and quests whose files did not change are not rewritten. A starter that does not compile is fine when a build error points into its own files; a build failure anywhere else, a starter that builds but whose tests do not run, and a skipped check (the solution failed) are "inconclusive" warnings (A212); a starter whose tests all pass is an error. The next file write waits more than a second after the last build so UBT sees it.
6. Release the workspace lock in a `finally`, on every exit path: pass, failure, inconclusive starter, cancel (also while waiting for the lock) and a thrown error. Nothing is deleted; the workspace stays for the next run. Each run's build and test logs are in `<workspace>/Saved/VerifierLogs/<UTC stamp>/` (`build-N.log`, `tests-N.log`, `reports-N/`), the five newest runs are kept, `EngineReport.logsFolder` and the last log line give the path, and an inconclusive check also quotes its first three build errors in the report. A workspace that cannot be prepared is an `(engine)` problem, not a crash (A1284).

Measured on the MacBook Air, UE 5.8.3, 5 example quests: see "Measured timings" below. Status on 2026-10-21 (round 2, through M1.3's runners): all 5 code examples and all 4 Pack 1 World 1 build quests pass; every reference solution builds and passes its tests, and every starter fails. Neither boss has a reference integration yet (warnings, A215).

## Measured timings

MacBook Air M5 (10 cores, 24 GB), UE 5.8.3, 2026-10-21 (M1.8):

| Run | Time | Notes |
| --- | --- | --- |
| Content checks, repo content (8 examples, 191 glossary entries, 22 pattern cards) | 29 ms checking, about 0.3 s for the command | |
| Content checks, generated 300-quest pack plus the real glossary and patterns (323 files) | 75 to 101 ms checking, 0.47 to 0.55 s for the command | three runs; the budget is 3 s |
| `--engine`, 5 code examples | 195 to 258 s in all | first build 25 to 30 s, one headless run of all tests 23 to 35 s, starter checks 143 to 193 s (about 30 to 40 s per quest: an incremental build plus one headless run) |

| `--engine`, 5 examples plus Pack 1 World 1's 4 build quests, through M1.3's runners (round 2) | 472 s in all | first build 48 s, one headless run of all 9 quests' tests 30 s, nine starter checks 393 s (about 44 s each); nothing else was using the engine |

Windows desktop, 2026-10-27 (M5.1c), other builders using the machine:

| Run | Time | Notes |
| --- | --- | --- |
| App content load (`tests/contentLoadBudget.test.ts`): fresh `ContentCatalog` on real disk, 300 real quests cloned over 25-quest worlds with the real glossary and patterns, until `listPacks`, `getGlossaryAliases`, and `getQuestAvailability` have answered | median of three: 122 ms quietest, 130 to 190 ms typical; first (cold) run: 186 ms quietest, 200 to 235 ms typical, 337 ms worst seen; the budget gates the median at 300 ms | 11 runs; the budget held without any loader change, so no follow-up was needed (A1196 to A1198) |

Starter checks dominate. For a full pack, M2 or later can cut this with one batched starter build, falling back to one quest at a time only when that build fails (see A208).

## Done criteria

- Unit tests: one happy path per kind, three malformed cases, term linking (identifier vs plain word, inside code blocks, inside headings), reachability, fade check.
- Verifier runs in under 3 seconds for 300 quests in parse-only mode.
- `docs/systems/content-authoring.md` has one complete example file per kind that parses.
