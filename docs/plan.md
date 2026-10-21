# Plan and board

The Lead runs this file. Milestones are ordered by dependency, not by date. Inside a milestone, tasks that touch different systems run in parallel. A task is done when it is merged to main with review and tests passed and its entry in `iterations.md` is written.

## Systems and owning sessions

| System | Spec | Owner session | Scope |
| --- | --- | --- | --- |
| app-shell | systems/app-shell.md | builder-shell | Electron main, preload, typed IPC, window, settings, first-run, packaging config |
| content-engine | systems/content-engine.md | builder-content-engine | Quest and glossary parsing, pack loading, term linking, verifier tool |
| progress-and-rules | systems/progress-and-rules.md | builder-rules | XP, roles, cards, spells, spree, streak, mastery, scheduler, unlocks, daily quest, save file |
| unreal-pipeline | systems/unreal-pipeline.md | builder-unreal | PlatformPaths, engine locator, sandbox template, UBT builder, headless tests, MCP fast loop, report parsing |
| ai-review | systems/ai-review.md | builder-review | Providers, code review prompt, breakdown grader prompt, explain-item grader, JSON schemas |
| ui-core | systems/ui-core.md | builder-ui-core | Design tokens, app frame, navigation, Title, First-run, Studio, World Map, Character, Codex, Settings |
| ui-quests | systems/ui-quests.md | builder-ui-quests | Concept, Drill, Breakdown board, Build editor, Loot, See-it-run |
| content-foundations | systems/content-authoring.md | author-foundations | Pack 1 quests, reference solutions, tests |
| content-patterns | systems/content-authoring.md | author-patterns | Pack 2 |
| content-mechanics | systems/content-authoring.md | author-mechanics | Pack 3 |
| content-systems | systems/content-authoring.md | author-systems | Pack 4 |
| qa | systems/qa-and-ci.md | tester | Playwright flows, CI matrix, screenshots, content verifier runs with an engine |

Reviewers are spawned fresh per task; they do not own systems.

## Milestones

### M0 Foundations (everything else depends on this)
- [x] M0.1 app-shell: scaffold on the chosen stack (Electron 44, electron-vite 6, React 19, TS strict, Tailwind v4, shadcn, Motion, Monaco, Zustand, vitest, Playwright, electron-builder). Scripts in CLAUDE.md work. Empty window opens. Proof: `npm run typecheck`, `npm test`, screenshot of the window.
- [ ] M0.2 app-shell: typed IPC contract (`src/shared/ipc.ts`) covering every method in the system specs, preload bridge, progress event channel. Proof: unit test that every channel has a handler.
- [ ] M0.3 ui-core: design tokens, app frame, navigation, dark theme, two accent sets, typography. Proof: Storybook-free gallery route `/dev/tokens` screenshot.
- [ ] M0.4 content-engine: shared types for every quest kind, glossary, packs; parser with malformed-file errors naming file and problem; `tools/verify-content.ts` parse-only mode. Proof: unit tests, verifier runs on an empty content folder.
- [ ] M0.5 content-foundations: `content/glossary.json` from `research/glossary-seed.json` (write the seed first if missing), `content/patterns.json` from `research/patterns-inventory.md`. Proof: verifier passes glossary checks.
- [ ] M0.6 qa: GitHub Actions matrix (windows-latest, macos-latest) running typecheck, unit tests, verifier, Playwright smoke. Proof: green run link.

### M1 Engine and rules (parallel across systems)
- [ ] M1.1 unreal-pipeline: PlatformPaths for Windows and macOS with fake-fs unit tests; EngineLocator (default paths, Windows registry, manual pick, vswhere and Xcode checks). Proof: unit tests on both platform objects.
- [ ] M1.2 unreal-pipeline: sandbox template in `resources/sandbox-template/` and SandboxProjectService (copy, EngineAssociation, first full build with streamed progress). Proof: the template builds on the Windows desktop; timings recorded in `systems/unreal-pipeline.md`.
- [ ] M1.3 unreal-pipeline: headless loop (UnrealBuilder, AutomationTestRunner, ReportParser, LogFilter) with the hand-written sample quest (Health component + one automation test). Proof: integration test passes on the Windows desktop; timings recorded.
- [ ] M1.4 unreal-pipeline: fast loop (McpEditorClient, LiveEditorRunner: CompileLiveCoding then RunTests, header-change detection that falls back to UBT). Proof: same sample quest round-trips in seconds with the editor open; timings recorded.
- [ ] M1.5 unreal-pipeline: the same four tasks verified on the Mac. If Unreal is not installed there yet, log as unverified and continue.
- [ ] M1.6 progress-and-rules: XpRules, roles, cards and tiers, spells, Seer Stone, spree and armor, streak and freezes, mastery meter, SM-2 scheduler with review log, DrillScheduler, DailyQuestService, unlock graph, atomic save. Proof: unit tests for every rule in the spec's tables.
- [ ] M1.7 ai-review: providers, prompts, JSON schemas, parsers, breakdown grader, explain-item grader, provider selection. Proof: unit tests on recorded outputs; one live run through Claude Code logged.
- [ ] M1.8 content-engine: GlossaryService, TermLinker (remark plugin), Monaco hover and completion data, full verifier (repetition rules, fade check, pattern use-case counts, reachability, `--engine` mode). Proof: unit tests; verifier on the sample quest with `--engine` on the Windows desktop.

### M2 Vertical slice (first build Mohammad practices on)
- [ ] M2.1 ui-core: Title, First-run setup (engine, sandbox, full build progress), Studio home, World Map, Settings, Codex, Character. Proof: Playwright screenshots of each screen.
- [ ] M2.2 ui-quests: Concept (predict, card, editable example, questions), Drill (all item types including Parsons and explain), Breakdown board (React Flow, piece cards with purpose labels, reference compare, revision note), Build (brief with hover terms, Monaco with hover and completion, Run, Submit, build progress, tests, log, spells, see-it-run), Loot. Proof: Playwright flow through all of them with the sample content.
- [ ] M2.3 content-foundations: Pack 1 World 1 complete: concept quests for its terms, 4 build quests on the fade ladder, 1 breakdown (dash with cooldown), 1 boss, reference solutions, automation tests, one alternative per build quest. Proof: verifier green with `--engine`.
- [ ] M2.4 qa: the end-to-end learner flow (set up sandbox, hover a term, predict and pass a concept quest, do a drill, submit a breakdown and revise, fail then pass a build with a hint, loot screen, next quest unlocked, restart and persist) recorded as a GIF. Add to "Ready to playtest".

### M3 Patterns, mechanics, economy
- [ ] M3.1 content-patterns: Pack 2 lesson zero (architecture lens) and the Observer mini-arc (predict and card, recognize, two use cases, refactor, when-not). Proof: verifier green with `--engine`.
- [ ] M3.2 content-mechanics: Pack 3 World 6 (delegates) with the Quest System boss (two reference breakdowns, pieces, integration rubric). Proof: verifier green with `--engine`.
- [ ] M3.3 progress-and-rules + ui: daily quest with chests, Seer Stone flow, spree and armor display, streak celebrations, test-out drill per world. Proof: unit tests plus Playwright screenshots.
- [ ] M3.4 ai-review: alternative-after-pass surfacing, free "why is this a finding" follow-up, reflection question answer flow. Proof: Playwright.

### M4 Full curriculum (content sessions run in parallel, one world per task, alternating packs)
- [ ] M4.x content-foundations: Pack 1 worlds 2 to 6.
- [ ] M4.x content-patterns: Pack 2 worlds 2 to 8 in Nystrom's teaching order, plus the combos world.
- [ ] M4.x content-mechanics: Pack 3 worlds 1 to 5, 7, 8.
- [ ] M4.x content-systems: Pack 4 worlds 1 to 6.
- [ ] M4.y qa: after each world merges, a fresh reviewer agent spot-checks 8 random quests for copied wording, solution leaks in starters or hints, UE API accuracy, and the fade ladder.

### M5 Release
- [ ] M5.1 app-shell: friendly errors (missing engine, VS workload, Xcode, bad paths, build failures unrelated to the quest), content load under 300 ms for 300 quests, crash-safe save.
- [ ] M5.2 qa: packaged installers from CI (nsis, dmg, unsigned), README per platform, install tested on both machines.
- [ ] M5.3 Public GitHub release (waits for Mohammad: publishing).

## Board

| Task | System | Owner | Worktree | Stage | Notes |
| --- | --- | --- | --- | --- | --- |
| M0.1 Scaffold the app | app-shell | builder-shell (agent) | merged | merged | Review round 1 fixed 5 issues; re-review PASS. On main: typecheck, test, verifier, build, e2e green. Parked duplicate branch claude/m0-1-scaffold-de80f2 not merged. |
| M0.5 Glossary and pattern cards | content-foundations | author-foundations (session) | claude/m0-5-glossary-50e7f9 @ 811ac94 | re-review | 117 of 125 links verified, 0 broken. Round 1: four intents echo the book (D13), four spot-the-bug items ambiguous, one when-not rule break, answers clustered at index 1 (A61), generic aliases (A62), Strategy card detail. Rebasing onto main. |
| M1.2a Sandbox template builds on the Mac | unreal-pipeline | builder-unreal (session) | claude/m1-2a-sandbox-template-d9043b @ aa8112f | re-review | Reviewer reproduced build 20 s and test pass. Round 1: DOJO_API on quest class, forward declarations, Mac stale-editor runner rule, EndPlay on 5.4 to 5.7, verified test command in spec, problems tidy, map renamed L_Sandbox (A46). Rebasing onto main. |
| M0.2 Typed IPC contract | app-shell | shell-ipc (session) | claude/m0-2-ipc-834665 @ 7998492 | re-review | Review round 1: stale BuildProgressEvent in unreal-pipeline spec, four unlogged renderer features, AttemptRecord has no review, AppError passthrough, preload test |
| M0.3 Design tokens and frame | ui-core | ui-core (session) | claude/m0-3-tokens-a00ed1 @ b3b190a | re-review | Review round 1: font licenses not shipped, faint text 4.16:1 on overlay, motion rule (Lead allowed short feedback transitions, A98) |
| M0.4 Content types, parser, verifier | content-engine | content-engine (session) | claude/m0-4-content-parser-89f0d1 @ 1c7ee2d | re-review | Review round 1: duplicates still loaded, --quest misses duplicate, blank-build example test cannot pass, pattern question ids, two example wording errors, align schema with M0.5 rules. M0.5 files parse unchanged. |
| M0.6 CI matrix | qa | tester (session) | claude/m0-6-ci-1eed5d @ 1a91596 | re-review | Review round 1: Windows 1024x768 runner vs 1100x700 minimum, empty failure screenshot, docs one commit late (squash at merge). Green Actions run waits for a private repo (A05) |
| M1.6 Rules, scheduler, save file | progress-and-rules | builder-rules (session) | claude/m1-6-rules-b3c2e0 @ 30216a8 | review | Rebases onto main after M0.2 merges |
| M1.7 AI review providers and graders | ai-review | builder-review (session) | claude/m1-7-ai-review-5c9ef2 @ 2f0521d | review | Rebases onto main after M0.2 merges |
| M1.1 PlatformPaths and EngineLocator | unreal-pipeline | unreal-locator (session) | claude/m1-1-engine-locator-016bb6 @ 873abea | review | Real Mac run against UE 5.8.3; Windows via fakes only |

Stages: waiting, building, review, fixes, testing, merged. Only the Lead edits this board (A06).

## Ready to playtest

(What Mohammad can try now, with exact steps. Nothing waits on this.)

## Handoff notes

(The Lead writes a handoff here before its context fills: what is in flight, what each builder was told, what is next.)
