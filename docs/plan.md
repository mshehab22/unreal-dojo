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
- [x] M0.2 app-shell: typed IPC contract (`src/shared/ipc.ts`) covering every method in the system specs, preload bridge, progress event channel. Proof: unit test that every channel has a handler.
- [x] M0.3 ui-core: design tokens, app frame, navigation, dark theme, two accent sets, typography. Proof: Storybook-free gallery route `/dev/tokens` screenshot.
- [x] M0.4 content-engine: shared types for every quest kind, glossary, packs; parser with malformed-file errors naming file and problem; `tools/verify-content.ts` parse-only mode. Proof: unit tests, verifier runs on an empty content folder.
- [x] M0.5 content-foundations: `content/glossary.json` from `research/glossary-seed.json` (write the seed first if missing), `content/patterns.json` from `research/patterns-inventory.md`. Proof: verifier passes glossary checks.
- [x] M0.6 qa (merged; the green Actions run waits for a private repo, A05): GitHub Actions matrix (windows-latest, macos-latest) running typecheck, unit tests, verifier, Playwright smoke. Proof: green run link.

### M1 Engine and rules (parallel across systems)
- [x] M1.1 unreal-pipeline: PlatformPaths for Windows and macOS with fake-fs unit tests; EngineLocator (default paths, Windows registry, manual pick, vswhere and Xcode checks). Proof: unit tests on both platform objects.
- [x] M1.2 unreal-pipeline: sandbox template in `resources/sandbox-template/` and SandboxProjectService (copy, EngineAssociation, first full build with streamed progress). Proof: the template builds on the Windows desktop; timings recorded in `systems/unreal-pipeline.md`.
- [x] M1.3 unreal-pipeline: headless loop (UnrealBuilder, AutomationTestRunner, ReportParser, LogFilter) with the hand-written sample quest (Health component + one automation test). Proof: integration test passes on the Windows desktop; timings recorded.
- [ ] M1.4 unreal-pipeline: fast loop (McpEditorClient, LiveEditorRunner: CompileLiveCoding then RunTests, header-change detection that falls back to UBT). Proof: same sample quest round-trips in seconds with the editor open; timings recorded.
- [ ] M1.5 unreal-pipeline: the same four tasks verified on the Mac. If Unreal is not installed there yet, log as unverified and continue.
- [x] M1.6 progress-and-rules: XpRules, roles, cards and tiers, spells, Seer Stone, spree and armor, streak and freezes, mastery meter, SM-2 scheduler with review log, DrillScheduler, DailyQuestService, unlock graph, atomic save. Proof: unit tests for every rule in the spec's tables.
- [x] M1.7 ai-review (live run still open, problems.md): providers, prompts, JSON schemas, parsers, breakdown grader, explain-item grader, provider selection. Proof: unit tests on recorded outputs; one live run through Claude Code logged.
- [x] M1.8 content-engine: GlossaryService, TermLinker (remark plugin), Monaco hover and completion data, full verifier (repetition rules, fade check, pattern use-case counts, reachability, `--engine` mode). Proof: unit tests; verifier on the sample quest with `--engine` on the Windows desktop.

### M2 Vertical slice (first build Mohammad practices on)
- [ ] M2.1 ui-core: Title, First-run setup (engine, sandbox, full build progress), Studio home, World Map, Settings, Codex, Character. Proof: Playwright screenshots of each screen.
- [ ] M2.2 ui-quests: Concept (predict, card, editable example, questions), Drill (all item types including Parsons and explain), Breakdown board (React Flow, piece cards with purpose labels, reference compare, revision note), Build (brief with hover terms, Monaco with hover and completion, Run, Submit, build progress, tests, log, spells, see-it-run), Loot. Proof: Playwright flow through all of them with the sample content.
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
| M1.3b Run wiring and prerequisite fill (A65) | unreal-pipeline | builder-unreal (session "M1.2a Sandbox template...") | m1-3b-run-wiring @ 99a6796 | fixes | runQuest verified on the engine. Round 1: syntax check passes on clang failure, boss prerequisites (Lead: match quest ids on the line, overrides win), passed quests refilled from savedFiles, check file race |
| M0.2c Settings service | app-shell | shell-ipc (session "M0.2 Typed IPC contract") | merged 742676e | merged | 1 fix round; probes verified in a packaged build |
| M1.7c submitQuest and review IPC wiring | ai-review | builder-review (session) | m1-7c-submit-wiring @ 2efbe9e | building | Provider IPC, graders, stored review and files done; the run inside Submit waits for M1.3b |
| M1.8 GlossaryService, TermLinker, full verifier, --engine | content-engine | content-engine (session "M0.4 Content types...") | merged b06a722 | merged | 2 rounds; --engine 9 of 9 on UE 5.8.3 through M1.3 runners |
| M1.8b Verifier follow-ups | content-engine | content-engine (session "M0.4 Content types...") | m1-8b-verifier-followups @ f6edee5 | review | Four items; reviewer also checks the "inconclusive starter" result with both bosses present |
| M0.2b Content IPC and handler wiring | app-shell | shell-ipc (session "M0.2 Typed IPC contract") | merged | merged | Passed first review; packaged content path and bad-path recovery verified |
| M2.1 Core screens | ui-core | ui-core (session "M0.3 Design tokens...") | merged 625b261 | merged | 2 fix rounds |
| M2.3 Pack 1 World 1 | content-foundations | author-foundations (session "M0.5 Glossary...") | merged bf8aaf4 | merged | 1 fix round; 12 quests; solutions pass and starters fail on UE 5.8.3 |
| M2.3b World 1 follow-ups | content-foundations | author-foundations (session "M0.5 Glossary...") | m2-3b-world2 (round 4 @ 787192d) | passed; merges with World 2 | Hits mutation caught; 10 of 10; A67 layout documented |
| M4.1 Pack 1 World 2 "Memory and ownership" | content-foundations | author-foundations (session "M0.5 Glossary...") | m2-3b-world2 (head bcc8937, rebased) | review (boss) | Boss integration 3e7db85, 22 of 22 with both bosses; A343 fixed four spec gaps found by building |
| M2.2 Quest screens | ui-quests | builder-ui-quests (session) | claude/m2-2-quest-screens-a21151 @ 214f85c | fixes | Core rules hold. Round 1: merge with main breaks the fake quest flow (A390 vs A351), editor test flake, sideways scroll in build column, breakdown board too narrow at 1100, Parsons marking, switch to the real TermLinker, fake grader, retry label, polish |
| M3.1 Patterns pack: lesson zero and Observer | content-patterns | author-patterns (session) | merged 6973af3 | merged | 2 fix rounds; zero book matches; 9 of 9 on UE 5.8.3 |
| M4.x Pack 2 World 2 (Game Loop) | content-patterns | author-patterns (session) | claude/m3-patterns-world2-game-loop @ 92381be | review | 18 of 18 solutions on UE 5.8.3 |
| M4.x Pack 2 World 3 | content-patterns | author-patterns (session) | from the World 2 branch | building | Next pattern in Part 3 order |
| M1.4 Fast loop (MCP) | unreal-pipeline | unreal-locator (session "M1.1 PlatformPaths...") | m1-4-fast-loop | building | McpEditorClient, EditorLauncher, LiveEditorRunner; Live Coding Windows only (A45) |
| M1.6c Revealed hints persist (A357) | progress-and-rules | builder-rules (session) | m1-6c-revealed-hints | building | Hints survive restart, no second charge |
| QA e2e harness and engine smoke | qa | tester (session "M0.6 CI matrix workflow") | qa-e2e-harness @ fedd91d | fixes (round 4) | Stable but too loose: bound to the work area within 12 points; rebase and move main's new palette and map checks onto the harness |

Queued for M1.8 (from the M0.4 re-review): which-pattern `choices` minimum 2 in the schema; the proximity lantern example registers its sphere before attaching it (confirm with `--engine`); state whether normal terms also link inside inline code.
Queued for unreal-pipeline (from the M0.2c review, A426): `docs/systems/unreal-pipeline.md` lines 29 and 84 still name `ElectronStoreSandboxPathStore`; the class is unused once settings land.
Queued for qa (from the M0.2c review): `ui-core-screens.spec.ts` and other specs not yet on the harness run against the real user data folder; with settings real, move every spec onto the harness so no run shares `config.json`.
Queued for app-shell and progress (from the M2.2 review, A357): revealed hint texts are lost after a restart; store revealed hints in progress and return them with the quest.
Queued for ai-review (from the M2.2 review, A356): a real `retryReview(attemptId)` that reviews the stored submitted files again without a new run; the screen resubmits as a stopgap.
Queued for unreal-pipeline (A65): fill a tested-out or reset prerequisite quest's files with its reference solution before building a later quest that depends on it, and tell the learner which files came from the reference.
Queued for M2.2 (from the M1.7b review): the Build screen shows a "Retry review" button when a review falls back to tests-only with `retryReviewSuggested`.
Queued for the verifier (from the M1.6b review): a concept quest must have at least one question that is not explain-in-one-sentence, since tests-only grading cannot pass explain items.
Queued for the verifier (from the M1.7b review): a breakdown required-piece label must have a core of at least 4 characters after kind words are removed, so tests-only matching stays meaningful.
Note for M2.1 (from the M1.1 review): `supportsFastLoop` is true for 5.8 on the Mac, but the Mac has no Live Coding (A45); first-run and Title must not promise the fast loop on the Mac.

Stages: waiting, building, review, fixes, testing, merged. Only the Lead edits this board (A06).

## Ready to playtest

(What Mohammad can try now, with exact steps. Nothing waits on this.)

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

### Handoff, 2026-10-21 afternoon
- The board above is current. Every task row names its session (sidebar titles still show each session's first task; the board maps them) and branch with the commit last reviewed.
- Merge rules in practice: merge only after a reviewer PASS; run `npm ci`, typecheck, test, verifier, build, test:e2e on main after each merge; resolve docs-only conflicts by keeping both sides; code conflicts by hand (`createHandlers.ts` and `src/main/index.ts` collect every service's dependencies, keep all). If checks fail after a merge, remove only that merge commit (check `git log --first-parent HEAD~1..HEAD` first) and send the branch back. Chain every command after a merge with `&&`.
- Unreal runs on this Mac take turns through a lock directory: `mkdir` it before an engine run, `rmdir` after (path in the reviewers' shared instructions in the Lead's scratchpad; any agreed path works if the Lead changes). Six builder processes were killed at once at 15:25 (exit 143), likely memory pressure; keep heavy runs serialized.
- Waiting to merge, in order: M2.1c (World Map overflow), then M1.6b (passed). M2.3b merges as its own commits (round 3 pending, then the World 2 boss reference per A67). World 2's 11 non-boss quests are in review.
- Next after these: M1.4 fast loop (MCP, Windows Live Coding only, A45), submitQuest orchestration (run, then review through M1.7, then recordAttempt) once M1.3b lands, wiring the review provider IPC, M2.4 end-to-end learner flow (tester) once M2.2 and the run wiring land, M3.2 Pack 3 World 6, M3.3 to M3.4.
- Needs Mohammad: a signed-in `claude` CLI for the live review run, `gh auth login` for the private CI repo, optionally the Metal toolchain. All decisions to review are under "Awaiting Mohammad's review" (A01 onward; Lead decisions are A01 to A06 and A60 to A67).
