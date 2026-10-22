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
| content-mechanics | systems/content-authoring.md | author-foundations (A74) | Pack 3 |
| content-systems | systems/content-authoring.md | author-systems | Pack 4 |
| qa | systems/qa-and-ci.md | tester | Playwright flows, CI matrix, screenshots, content verifier runs with an engine |

Reviewers are spawned fresh per task; they do not own systems.

## Milestones

### M0 Foundations (everything else depends on this)
- [x] M0.1 app-shell: scaffold on the chosen stack (Electron 44, electron-vite 6, React 19, TS strict, Tailwind v4, shadcn, Motion, Monaco, Zustand, vitest, Playwright, electron-builder). Scripts in CLAUDE.md work. Empty window opens. Proof: `npm run typecheck`, `npm test`, screenshot of the window.
- [x] M0.2 app-shell: typed IPC contract (`src/shared/ipc.ts`) covering every method in the system specs, preload bridge, progress event channel. Proof: unit test that every channel has a handler.
- [x] M0.3 ui-core: design tokens, app frame, navigation, dark theme, two accent sets, typography. Proof: Storybook-free gallery route `/dev/tokens` screenshot.
- [x] M0.4 content-engine: shared types for every quest kind, glossary, packs; parser with malformed-file errors naming file and problem; `tools/verify-content.ts` parse-only mode. Proof: unit tests, verifier runs on an empty content folder.
- [x] M0.5 content-foundations: `content/glossary.json` from `research/glossary-seed.json` (write the seed first if missing), `content/patterns.json` from `research/patterns-inventory.md`. Proof: verifier passes glossary checks.
- [x] M0.6 qa (merged; the green Actions run waits for a private repo, A05): GitHub Actions matrix (windows-latest, macos-latest) running typecheck, unit tests, verifier, Playwright smoke. Proof: green run link.

### M1 Engine and rules (parallel across systems)
- [x] M1.1 unreal-pipeline: PlatformPaths for Windows and macOS with fake-fs unit tests; EngineLocator (default paths, Windows registry, manual pick, vswhere and Xcode checks). Proof: unit tests on both platform objects.
- [x] M1.2 unreal-pipeline: sandbox template in `resources/sandbox-template/` and SandboxProjectService (copy, EngineAssociation, first full build with streamed progress). Proof: the template builds on the Windows desktop; timings recorded in `systems/unreal-pipeline.md`.
- [x] M1.3 unreal-pipeline: headless loop (UnrealBuilder, AutomationTestRunner, ReportParser, LogFilter) with the hand-written sample quest (Health component + one automation test). Proof: integration test passes on the Windows desktop; timings recorded.
- [x] M1.4 unreal-pipeline (Mac verified; Live Coding Windows only, unverified): fast loop (McpEditorClient, LiveEditorRunner: CompileLiveCoding then RunTests, header-change detection that falls back to UBT). Proof: same sample quest round-trips in seconds with the editor open; timings recorded.
- [ ] M1.5 unreal-pipeline: the same four tasks verified on the Mac. If Unreal is not installed there yet, log as unverified and continue.
- [x] M1.6 progress-and-rules: XpRules, roles, cards and tiers, spells, Seer Stone, spree and armor, streak and freezes, mastery meter, SM-2 scheduler with review log, DrillScheduler, DailyQuestService, unlock graph, atomic save. Proof: unit tests for every rule in the spec's tables.
- [x] M1.7 ai-review (live run still open, problems.md): providers, prompts, JSON schemas, parsers, breakdown grader, explain-item grader, provider selection. Proof: unit tests on recorded outputs; one live run through Claude Code logged.
- [x] M1.8 content-engine: GlossaryService, TermLinker (remark plugin), Monaco hover and completion data, full verifier (repetition rules, fade check, pattern use-case counts, reachability, `--engine` mode). Proof: unit tests; verifier on the sample quest with `--engine` on the Windows desktop.

### M2 Vertical slice (first build Mohammad practices on)
- [ ] M2.1 ui-core: Title, First-run setup (engine, sandbox, full build progress), Studio home, World Map, Settings, Codex, Character. Proof: Playwright screenshots of each screen.
- [x] M2.2 ui-quests: Concept (predict, card, editable example, questions), Drill (all item types including Parsons and explain), Breakdown board (React Flow, piece cards with purpose labels, reference compare, revision note), Build (brief with hover terms, Monaco with hover and completion, Run, Submit, build progress, tests, log, spells, see-it-run), Loot. Proof: Playwright flow through all of them with the sample content.
- [x] M2.3 content-foundations: Pack 1 World 1 complete: concept quests for its terms, 4 build quests on the fade ladder, 1 breakdown (dash with cooldown), 1 boss, reference solutions, automation tests, one alternative per build quest. Proof: verifier green with `--engine`.
- [ ] M2.4 qa: the end-to-end learner flow (set up sandbox, hover a term, predict and pass a concept quest, do a drill, submit a breakdown and revise, fail then pass a build with a hint, loot screen, next quest unlocked, restart and persist) recorded as a GIF. Add to "Ready to playtest".

### M3 Patterns, mechanics, economy
- [x] M3.1 content-patterns: Pack 2 lesson zero (architecture lens) and the Observer mini-arc (predict and card, recognize, two use cases, refactor, when-not). Proof: verifier green with `--engine`.
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
| M0.1 Scaffold the app | app-shell | builder-shell (agent) | merged | merged | 1 fix round |
| M0.2 Typed IPC contract | app-shell | shell-ipc (session) | merged 7c395b2 | merged | 1 fix round; content methods deferred to M0.2b (A89) |
| M0.3 Design tokens and frame | ui-core | ui-core (session) | merged e7b57df | merged | 1 fix round; A98 motion rule |
| M0.4 Content types, parser, verifier | content-engine | content-engine (session) | merged edb5279 | merged | 1 fix round; minor items queued for M1.8 (below) |
| M0.5 Glossary and pattern cards | content-foundations | author-foundations (session) | merged 08aa030 | merged | 1 fix round; 126 of 126 docs links live |
| M0.6 CI matrix | qa | tester (session) | merged 0deefe6 (squashed) | merged | Green Actions run waits for a private repo (A05); Windows steps unverified |
| M1.2a Sandbox template builds on the Mac | unreal-pipeline | builder-unreal (session) | merged 329a995 | merged | 1 fix round; build about 20 s, headless test about 18 s on UE 5.8.3 Mac |
| M1.1 PlatformPaths and EngineLocator | unreal-pipeline | unreal-locator (session) | merged 267739b | merged | Passed first review; Windows unverified (problems.md) |
| M1.6 Rules, scheduler, save file | progress-and-rules | builder-rules (session) | merged | merged | 2 fix rounds; rematch farming closed, proven with randomized sequences |
| M1.6b Progress IPC wiring and content mapper | progress-and-rules | builder-rules (session) | merged 4bff33b | merged | 2 fix rounds; merge conflicts with M1.3 resolved keeping both |
| M2.1c World Map overflow with real content | ui-core | ui-core (session "M0.3 Design tokens...") | merged 8798d5d | merged | Passed first review |
| M2.1d Codex palette hover and map polish | ui-core | ui-core (session "M0.3 Design tokens...") | merged | merged | Passed first review. Follow-up: the resting-pointer test uses a fixed pointer spot; read the row position at runtime so it keeps proving the fix |
| M1.7 AI review providers and graders | ai-review | builder-review (session) | merged 26c3e26 | merged | 1 fix round; live Claude Code and API runs still open (problems.md) |
| M1.7b Review fallback edges | ai-review | builder-review (session) | merged | merged | 1 fix round |
| M1.2 + M1.3 Sandbox service and headless loop | unreal-pipeline | builder-unreal (session "M1.2a Sandbox template...") | merged 8665386 | merged | 1 fix round plus a test fix; includes the GFrameCounter timer fix |
| M1.3b Run wiring and prerequisite fill (A65) | unreal-pipeline | builder-unreal (session "M1.2a Sandbox template...") | merged 6f585b3 | merged | 2 fix rounds; transitive fill proven on the engine |
| M0.2c Settings service | app-shell | shell-ipc (session "M0.2 Typed IPC contract") | merged 742676e | merged | 1 fix round; probes verified in a packaged build |
| M1.7c submitQuest and review IPC wiring | ai-review | builder-review (session) | merged 2fe42af | merged | 1 fix round plus renumbering to A600-A604 (A71); real Submit loop on UE 5.8.3 |
| M2.4 End-to-end learner flow | qa | tester (session "M0.6 CI matrix workflow") | merged (baf81bf) | merged | 1 fix round; real-engine flow behind DOJO_E2E_ENGINE with per-check known failures (A646); playtest steps in Ready to playtest; full real-engine rerun after M1.6g, M2.1e, M1.3c |
| M1.6g Flow bugs: self-explanations saved, drill self-checked items, run and submit availability | progress-and-rules | builder-rules (session "M1.6 Progress...") | m1-6g-flow-bugs @ f76037a | re-review | Review: engine integration tests miss assertQuestOpen (hidden without DOJO_ENGINE_ROOT); self-checked due item pays drill XP every drill; full dependencies in tests | From M2.4; decisions A800 to A809 |
| M2.2b Flow bugs: compiler output after a failed Submit, review dates, next to a locked quest, drill summary copy | ui-quests | builder-ui-quests (session "M2.2 Quest screens") | merged (48decce) | merged (items 1, 2, 3, 5) | 2 fix rounds; last Submit kept across reloads (A740 run), Next focused once, review days named once (A816); item 4 drill copy follows as M2.2c after M1.6g |
| M2.1e First-run build progress hang (seen once) | ui-core | ui-core (session "M0.3 Design tokens...") | m2-1e-first-build-hang @ cacb7ac | re-review | Review: quiet notice resets on unchanged status, status check without timeout, wrong restart wording, cause still unknown (name -WaitMutex, add run logs), pipeline spec row, reuse toAppError; plus the hover flake | Investigate lost events, add a status query fallback; decisions A820 to A829 |
| M1.8 GlossaryService, TermLinker, full verifier, --engine | content-engine | content-engine (session "M0.4 Content types...") | merged b06a722 | merged | 2 rounds; --engine 9 of 9 on UE 5.8.3 through M1.3 runners |
| M1.8b Verifier follow-ups | content-engine | content-engine (session "M0.4 Content types...") | merged | merged | --engine 18 of 18 with both bosses; no inconclusive starters; Ctrl+C clean |
| M0.2b Content IPC and handler wiring | app-shell | shell-ipc (session "M0.2 Typed IPC contract") | merged | merged | Passed first review; packaged content path and bad-path recovery verified |
| M2.1 Core screens | ui-core | ui-core (session "M0.3 Design tokens...") | merged 625b261 | merged | 2 fix rounds |
| M2.3 Pack 1 World 1 | content-foundations | author-foundations (session "M0.5 Glossary...") | merged bf8aaf4 | merged | 1 fix round; 12 quests; solutions pass and starters fail on UE 5.8.3 |
| M2.3b World 1 follow-ups | content-foundations | author-foundations (session "M0.5 Glossary...") | merged 2e29c7c | merged | 4 rounds; World 1 boss reference integration (A67) |
| M4.1 Pack 1 World 2 "Memory and ownership" | content-foundations | author-foundations (session "M0.5 Glossary...") | merged 2e29c7c | merged | 2 rounds plus boss round; 24 of 24 on UE 5.8.3; main --engine clean |
| M4.P1.3 Pack 1 World 3 "Containers and strings" | content-foundations | author-foundations (session "M0.5 Glossary...") | merged | merged | 1 fix round; 35 of 35; all mutations caught |
| M4.P1.4 Pack 1 World 4 "The gameplay framework" | content-foundations | author-foundations (session "M0.5 Glossary...") | merged | merged | 1 fix round; keeper rides the pawn (A620); glossary conflict resolved keeping both |
| M4.P1.T Term coverage (A72), then Pack 1 World 5 "communication" | content-foundations | author-foundations (session "M0.5 Glossary...") | m4-p1-terms-world5 @ 50017e1 (term coverage merged 81cafd8) | merged | 1 fix round (interface Execute_ accuracy, AddDynamic predict, 11 glossary links, boss rubric and Blueprint plan, EndPlay unbind test); 54 of 54; no-unbind mutation now caught |
| M4.P1.6 Pack 1 World 6 "Data and tools" | content-foundations | author-foundations (session "M0.5 Glossary...") | m4-p1-world6 @ 36b3bf2 | fixes | Review: ensure test pins the condition and fails on an editor rerun (expect any count, rubric checks ensureMsgf); PrimaryAssetId example; boss rubric vs Blueprint plan; iterations numbers |
| M3.2 Pack 3 World 6 (delegates) with the Quest System boss | content-mechanics | author-foundations (A74) | m3-2-pack3-world6 | paused for World 6 fixes | Two reference breakdowns, pieces, integration rubric; decisions A870 to A889 |
| M1.7d Real retryReview (A356) | ai-review | builder-review (session "M1.7 AI review...") | merged (3cf959e) | merged | 2 fix rounds (stored compiler output keeps its cut-off mark, whitespace at the cut, pruned-attempt guard); 851 tests, 27 e2e |
| M3.4 Review extras, ai-review side: alternative after a pass, "why is this a finding", reflection answers | ai-review | builder-review (session "M1.7 AI review...") | m3-4-review-extras @ 2d320b9 | review | Main process, IPC, fake; UI follows as M3.4b (ui-quests); decisions A850 to A869 |
| M1.3c Engine integration tests: createSandbox cold build fails in about 220 ms on main | unreal-pipeline | builder-unreal (session "M1.2a Sandbox...") | m1-3c-integration-createsandbox | building | 3 of 24 fail under DOJO_ENGINE_ROOT; quest runs pass; decisions A890 to A899 |
| M1.8f Close the old M1.8 queued items | content-engine | content-engine (session "M0.4 Content types...") | m1-8f-queued-items | merged (f7a2c77) | Two items already done (lantern reconfirmed with --engine); inline-code linking rule added to content-authoring.md; docs only |
| M1.8c Missing boss integration is an error | content-engine | content-engine (session "M0.4 Content types...") | merged | merged | Lead checked the small diff; --engine 18 of 18 by the builder; example boss stays a warning (A520) |
| M2.2 Quest screens | ui-quests | builder-ui-quests (session) | merged 07794f5 | merged | 4 fix rounds; at 1100x700 the revision note starts below the fold (accepted) |
| M3.1 Patterns pack: lesson zero and Observer | content-patterns | author-patterns (session) | merged 6973af3 | merged | 2 fix rounds; zero book matches; 9 of 9 on UE 5.8.3 |
| M4.P2.2 Pack 2 World 2 (Game Loop) | content-patterns | author-patterns (session) | merged 0e7060c | merged | 1 fix round |
| M4.P2.3 Pack 2 World 3 (Update Method) | content-patterns | author-patterns (session) | merged 0e7060c | merged | 1 fix round; moved to the arena (D13) |
| M4.P2.4 Pack 2 World 4 (Double Buffer) | content-patterns | author-patterns (session) | merged | merged | Text fix round checked by the Lead; new game-thread glossary entry |
| M4.P2.5 Pack 2 World 5 (Command) | content-patterns | author-patterns (session) | merged 235f773 | merged | 2 rounds; planner moved into play (D13) |
| M4.P2.6 Pack 2 World 6 (Event Queue) | content-patterns | author-patterns (session) | merged | merged | Review: engine 9/9 pass; fix the card audio wording (D13), ParallelFor accuracy, parallel-for term |
| M4.P2.7 Pack 2 World 7 (State) | content-patterns | author-patterns (session) | merged | merged | 63 of 63 on UE 5.8.3; review found two one-line fixes (book example left in state-recall-1, two missing firstQuestIds), applied by the Lead on main |
| M4.P2.8 Pack 2 World 8 (Subclass Sandbox) | content-patterns | author-patterns (session) | merged (20104cc, card audit e945260) | merged | Passed first review; 63 of 63 on UE 5.8.3; card audit cherry-picked (comments and text, prerequisite on World 7) |
| M4.P2.9 Pack 2 World 9 (Component, Pack 4 gate) | content-patterns | author-patterns (session) | m4-p2-world9 @ 9131a6f | review | World id `patterns/component` (A68), boss with A67 integration; decisions A830 to A849 |
| M4.P2.10 Pack 2 World 10 (Type Object) | content-patterns | author-patterns (session) | m4-p2-world10 | building | Reuses Pack 1 World 6 data terms; decisions A900 to A919 |
| M1.4 Fast loop (MCP) | unreal-pipeline | unreal-locator (session "M1.1 PlatformPaths...") | merged 2b31811 | merged | 2 fix rounds; fast re-run 65 ms to 2.4 s on the Mac |
| M1.4b Fast loop wiring | unreal-pipeline | unreal-locator (session "M1.1 PlatformPaths...") | merged | merged | Passed; real app open-editor and quit verified with Playwright |
| M1.4c Reset and editor-engine follow-ups | unreal-pipeline | unreal-locator (session "M1.1 PlatformPaths...") | merged | merged | Passed first review |
| M1.6c Revealed hints persist (A357) | progress-and-rules | builder-rules (session) | merged | merged | 1 fix round; refused save safe; migration verified |
| M1.6d Pack 4 gate by world id (A68) | progress-and-rules | builder-rules (session) | merged 365d0b4 | merged | Passed first review; future world ids foundations/communication and patterns/component are conventions authors must use |
| M1.6e Term gate by course order (A72) | progress-and-rules | builder-rules (session) | merged | merged | Passed; World 1 walkable on a fresh save, test-out still works |
| M1.6f Test-out keys by pack and world | progress-and-rules | builder-rules (session) | merged | merged | Catalog collision closed by A73 (M1.8e) |
| M1.8e World ids unique across packs (A73) | content-engine | content-engine (session "M0.4 Content types...") | m1-8e-unique-world-ids | merged (a357833) | Loader and verifier error; Lead checked the small diff; 838 tests, 27 e2e |
| M1.8d Verifier warns on later-taught terms (A72) | content-engine | content-engine (session "M0.4 Content types...") | merged | merged | Small diff checked by the Lead; 16 warnings on main |
| QA e2e harness and engine smoke | qa | tester (session "M0.6 CI matrix workflow") | merged cffa49b | merged | 4 fix rounds; every spec on fresh userData; engine smoke on M1.3 runners |

Done in M1.8f. Was queued for M1.8 (from the M0.4 re-review): which-pattern `choices` minimum 2 in the schema; the proximity lantern example registers its sphere before attaching it (confirm with `--engine`); state whether normal terms also link inside inline code.
Queued for unreal-pipeline (from the M0.2c review, A426): `docs/systems/unreal-pipeline.md` lines 29 and 84 still name `ElectronStoreSandboxPathStore`; the class is unused once settings land.
Queued for qa (from the M0.2c review): `ui-core-screens.spec.ts` and other specs not yet on the harness run against the real user data folder; with settings real, move every spec onto the harness so no run shares `config.json`.
Queued for app-shell and progress (from the M2.2 review, A357): revealed hint texts are lost after a restart; store revealed hints in progress and return them with the quest.
Done in M1.7d. Was queued for ai-review (from the M2.2 review, A356): a real `retryReview(attemptId)` that reviews the stored submitted files again without a new run; the screen resubmits as a stopgap.
Queued for ui-quests (from the M1.6c review, A503): read `revealedHints` from quest data and send `hintIndex` to `revealHint`, so a reload never reveals and charges the next hint by mistake.
Queued for content authors (from M1.8d, A72): 16 term-order warnings. Terms never taught by any concept quest: ue-log, character, character-movement-component, launch-character, object-pool, super; teach them in a concept quest (or drop them from terms). Others are taught later and are fine to leave or move earlier.
Queued for progress-and-rules (from the M1.6e review): test-out status and `testedOutWorldIds` are keyed by world id alone, while world ids are only unique inside a pack (A510); key them by pack and world.
Queued for unreal-pipeline (A65): fill a tested-out or reset prerequisite quest's files with its reference solution before building a later quest that depends on it, and tell the learner which files came from the reference.
Queued for M2.2 (from the M1.7b review): the Build screen shows a "Retry review" button when a review falls back to tests-only with `retryReviewSuggested`.
Queued for the verifier (from the M1.6b review): a concept quest must have at least one question that is not explain-in-one-sentence, since tests-only grading cannot pass explain items.
Queued for the verifier (from the M1.7b review): a breakdown required-piece label must have a core of at least 4 characters after kind words are removed, so tests-only matching stays meaningful.
Note for M2.1 (from the M1.1 review): `supportsFastLoop` is true for 5.8 on the Mac, but the Mac has no Live Coding (A45); first-run and Title must not promise the fast loop on the Mac.

Stages: waiting, building, review, fixes, testing, merged. Only the Lead edits this board (A06).

## Paused, 2026-10-21 about midnight

Mohammad asked to pause all work. Every builder was told to stop at a safe point, release the engine lock, commit work in progress on its own branch (no merges), and stay idle; reviewers were told to stop and hand back partial findings. Main is green at the last merge (M2.4 follow-up). To resume, the Lead re-sends each task from the board below:
- In review when paused (reviews restart from the partial reports): M1.6g @ f76037a, M2.1e @ cacb7ac, M3.4 @ 2d320b9, Pack 2 World 9 @ 9131a6f.
- M3.4 partial review: FIXES NEEDED so far. (1) `AttemptReviewService` keeps tests-only fallback answers (timeout, A70 skip, no AI) for "Why?" and reflections, so a real answer can never replace them; keep only AI-provider answers, and fix the `review-timeout` wording in the handoff list. (2) `ReviewService.explainFinding` defaults `allowPaidApi: true`; make the option required. Left: integration tests with the flag.
- M1.6g partial review: FIXES NEEDED so far. (1) `tests/review/submitWiring.test.ts:278-291` `invokerWith` still omits two dependencies. (2) On rebase, drop the two `expectKnownFailure("M1.6g", ...)` wrappers in `e2e/learner-flow.spec.ts` (lines 317, 567), since the fix makes them pass. Drill XP, the cancel fix, and the integration stubs are verified. Left: integration tests with the flag.
- M2.1e partial review: all eight issues fixed and every default check passes on a merge with main (28 of 28 e2e, hover test 15 of 15). Left: the engine integration tests under the lock (compare against main's 3 known createSandbox failures); PASS if no new failures. One small non-blocking fix to send with the merge: `SandboxBuildTracker.receive()` should reset `failedChecks` and `isUnreachable`.
- In fixes: Pack 1 World 6 at 8a492c0 (fixes 1 to 4 done, verifier and tests pass; left: the engine proof with the reference and an `XPCurve != nullptr` variant, each twice in one editor, then main's --engine run and fix 5, the real numbers in iterations). M1.3c: very likely a false alarm. The Lead ran the integration folder without `--no-file-parallelism` (required by A612), so three files built sandboxes at once and the createSandbox tests failed in about 200 ms; the M3.4 reviewer saw the same. On resume, rerun with the flag under the lock; if all 24 pass, close M1.3c with no code change.
- Building: Pack 2 World 10 (m4-p2-world10), Pack 3 World 6 at WIP 79c9373 (pack `mechanics`, world `delegates`, 7 quests, all references and the boss director and tests written, decisions A870 to A873, originality checked; left: first engine build, mutations, starters, --engine, iterations, typecheck and test, rebase).
- Waiting on others: M2.2c drill copy (after M1.6g), M3.4b screens (after M3.4), the full real-engine learner-flow rerun (after M1.6g, M2.1e, M1.3c).

## Ready to playtest

Note: earlier dev runs saved `dojo.dataSource = fake:returning` in the app's real data folder on this Mac, and a stored choice wins over the build flag, so a plain `npm run dev` opens the sample learner with a "Fake data" badge. To try the real app from a fresh start, use a throwaway data folder: `npm run build`, then `npx electron . --user-data-dir=$HOME/DojoPlaytestData`.

(What Mohammad can try now, with exact steps. Nothing waits on this.)

### The first world on the real engine, start to finish (M2.4, merged 2026-10-21)
What you need: this Mac with Unreal Engine 5.8 at `~/Applications/UE_5.8` (already there), and no other Unreal work running. Time: about an hour if you paste the three later builds' solutions (step 12), about two and a half hours if you write them yourself.
1. Start the app on a throwaway data folder, so the sample data and any earlier progress cannot get in the way. In Terminal: `cd ~/Projects/unreal-dojo`, `npm install`, `npm run build`, then `npx electron . --user-data-dir=$HOME/DojoPlaytestData`. The Title shows "What should your studio call you?". (Checked: this command opens the real first run, not the sample data.)
2. Title: type a studio name, press "Set up your studio".
3. Pick the engine: the list shows UE 5.8.3 at `~/Applications/UE_5.8`; select it and press "Use this engine". A note about the Metal toolchain is fine.
4. Choose a folder: press "Choose a folder", pick or create an empty folder (for example `~/DojoPlaytestSandbox`), then "Use this folder".
5. Press "Start the build". It copies the sandbox and builds it once, usually under a minute on this Mac (the screen allows up to 15). Press "Continue" when it says it passed. If it sits at "Starting the first full build" with the clock at 0:00 for more than two minutes, that is bug M2.1e: note it, quit, and start again from step 1 with a new folder name.
6. "Open the editor once": press "Skip for now" (or "Open the editor" to see it launch, which takes a few minutes). Then press "Enter your studio".
7. Settings: under Review provider choose "Tests only" (or keep Auto if Claude Code is signed in and you want written reviews).
8. World Map, Contract 1 "Objects and reflection": press the first stage, "UObjects, actors, and the class default object". Pick a guess and press "Lock in my guess", then "Read the card". Hover a highlighted word to see its card. Press "Answer the questions", answer, press "Submit answers", then "See your loot". The "Next" button opens the next stage. Do the same for "Reflection, UCLASS, and the generated header", "UPROPERTY specifiers decide who can see and change a field", and "UFUNCTION opens a function to Blueprint and the console".
9. Studio: press "Start drill", answer each item, press "Check" then "Next", and finish.
10. World Map: open "A training dummy the console can strike". Write a short sentence for each marked line under "Say why each marked line is there", then press "Open the gaps" (until you do, the editor is read-only and Submit is off). Press "Run": it builds and the test fails, which is expected. Press "Reveal hint 1". Fill the two gaps: in `DojoF1TrainingDummy.h` add `UFUNCTION(BlueprintCallable, Category = "Dummy")` on the line above `void Strike();`; in `DojoF1TrainingDummy.cpp` replace the "Your code" comment with `if (IsKnockedDown()) return;`, `HitsTaken++;`, `RefreshLabel();` on three lines. Press "Run" (passes), then "Submit". The loot shows the score, the XP minus the hint, and "Unlocked: UENUM and USTRUCT bring your own types into reflection".
11. Concept stage "UENUM and USTRUCT bring your own types into reflection", the same way as step 8.
12. Build stage "A pop-up target that shows its state by name". Write it yourself from the brief, or skip ahead: open `tools/solutions/f1-popup-target/` in the repository, copy each file's whole text, and in the app click that file's tab, select all in the editor, and paste. If the stage asks why marked lines are there, answer and press "Open the gaps" first. Press "Submit".
13. Concept stage "Cast and IsA ask an object what it really is", as in step 8.
14. Build stages "A score keeper that tells dummies from targets" (`tools/solutions/f1-score-keeper/`) and "A bell whose ring Blueprint can restyle" (`tools/solutions/f1-practice-bell/`), each written or pasted as in step 12, then "Submit".
15. Breakdown stage "Plan a dash with a cooldown": add pieces with a name and a purpose each, press "Submit plan", compare your board with the reference, add what you missed, write a short note on what changed, and press the grade button. The loot shows "Unlocked: Boss: the training yard".
16. Quit the app (Cmd+Q) and start it again with the same command as step 1: `npx electron . --user-data-dir=$HOME/DojoPlaytestData`. The Title says welcome back with your name, the World Map shows 11 of 12 passed with the boss open, and the training dummy still shows the hint you bought. Known bug M1.6g: the marked-line explanations are asked for again.
17. When done, delete `~/DojoPlaytestData` and `~/DojoPlaytestSandbox` if you do not want to keep them.
What to look for: anything confusing, slow, or wrong. Note the step number for each.
Known bugs still open as of this merge: M1.6g (explanations asked for again after a restart, step 16; self-checked drill items counted as misses, step 9), M2.1e (rare first-build hang, step 5). Their fixes are in review.

### Quest screens with sample data (M2.2, merged 2026-10-21)
What is new: playing quests. Concept (predict, card, questions), Drill (every item type, including Parsons and explain), Breakdown (plan on a board, compare with the reference, write a revision), Build (brief with hover terms, code editor, Run, Submit, hints, see-it-run), and Loot. Runs, reviews, and grading use built-in sample data here; the real engine and AI review are being connected.
1. In the project folder on the Mac: `npm install`, then `VITE_DOJO_FAKE=quests npm run dev`.
2. On the World Map open Pack 1 World 1 and play the first concept quest: answer the predict question, read the card, hover a term, answer the questions.
3. Start a drill from the Studio and try a Parsons item (drag lines into order; one decoy is in there).
4. Open the training dummy build quest: buy a hint, edit the code, press Run (it fails first), fix it, Submit, and watch the loot.
5. Open the dash breakdown: place pieces with purposes, Submit plan, compare with the reference, write the revision note.
Look for: is it clear what to do next on every screen, is the code editor comfortable, does the loot feel earned, and is the breakdown board pleasant to use.

### Core screens with sample data (M2.1, merged 2026-10-21)
What is new: Title, First-run setup, Studio, World Map, Character, Codex, and Settings. They run on built-in sample data because quests, drills, builds, and reviews are not connected yet.
1. In the project folder on the Mac: `npm install`, then `VITE_DOJO_FAKE=returning npm run dev`. The rail shows a "Fake data" badge.
2. Walk the rail: Studio, World Map, Character, Codex, Settings. On the World Map, hover a locked stage to see why it is locked; hover "Test out" to see why it is disabled.
3. Press Cmd+K and search the glossary (for example "UPROPERTY"); open an entry and its Epic docs link.
4. For a first-time learner, quit and run `VITE_DOJO_FAKE=fresh npm run dev`: go through First-run (engine pick, sandbox folder, a simulated full build). `VITE_DOJO_FAKE=first-build-fails npm run dev` shows the failure and retry path.
5. Resize the window down to its minimum (1100x700).
Look for: does it feel like a game studio you want to come back to, is anything hard to read, anything confusing in First-run, and does the skill tree on Character make your mastery clear at a glance.

## Handoff notes

(The Lead writes a handoff here before its context fills: what is in flight, what each builder was told, what is next.)

### Handoff, 2026-10-21 evening (replaces the afternoon note)
- On main: M0 complete; M1.1, M1.2, M1.3, M1.3b, M1.6 to M1.6d, M1.7, M1.7b, M1.8 to M1.8c; M2.1 to M2.1d, M2.2, M2.3 and M2.3b; Pack 1 Worlds 1 and 2 (with A67 boss integrations); Pack 2 Worlds 1 to 3; QA harness. Main is green: typecheck, about 706 unit tests, 27 e2e, verifier (2 packs, 5 worlds, 43 quests).
- In flight (see the board rows for branch and commit): M1.4 fast loop (re-review), M1.7c submitQuest (finishing its engine proof), Pack 1 World 3 (fix round 1), Pack 2 World 4 (review).
- Reviewers are background agents of the Lead session; builders are linked sessions. Every review prompt starts by reading the shared reviewer instructions in the Lead's scratchpad (reviewer-common.md: own detached worktree, checks, rules, engine lock).
- Merge rules: merge only after a reviewer PASS (the Lead may check a very small diff itself and say so in the merge message); `npm ci`, typecheck, test, verifier, build, test:e2e on main after every merge; docs-only conflicts keep both sides; code conflicts by hand (`createHandlers.ts` and `src/main/index.ts` collect every service's dependencies, keep all, then fix tests that build `createHandlers`). If checks fail after a merge, remove only that merge commit (check `git log --first-parent HEAD~1..HEAD`) and send the branch back. Chain every command with `&&`.
- Unreal runs take turns through the engine lock directory (mkdir before, rmdir after). The engine queue is the main bottleneck.
- Content process: every boss ships an A67 reference integration with two-round tests, proven by mutations; D13 originality is checked at 6 and 5 words against the book PDF on Mohammad's Desktop; Unreal facts are checked against 5.8 engine source.
- Next after the in-flight work: wire M1.4 into the app; M2.4 end-to-end learner flow (tester) once submitQuest lands; more Pack 1 and Pack 2 worlds; Pack 3 World 6 (M3.2, needs an author-mechanics session); M3.3 and M3.4.
- Needs Mohammad: a signed-in `claude` CLI for the live AI review run, `gh auth login` for the private CI repo, optionally the Metal toolchain; he was advised to keep "claude" (the CLI) off in macOS Device Control and Data Access. Decisions to review: everything under "Awaiting Mohammad's review" (Lead decisions A01 to A06, A60 to A69).
