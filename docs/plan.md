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
- [x] M3.4 ai-review: alternative-after-pass surfacing, free "why is this a finding" follow-up, reflection question answer flow. Proof: Playwright.

### M4 Full curriculum (content sessions run in parallel, one world per task, alternating packs)
- [ ] M4.x content-foundations: Pack 1 worlds 2 to 6.
- [ ] M4.x content-patterns: Pack 2 worlds 2 to 8 in Nystrom's teaching order, plus the combos world.
- [ ] M4.x content-mechanics: Pack 3 worlds 1 to 5, 7, 8.
- [ ] M4.x content-systems: Pack 4 worlds 1 to 6.
- [ ] M4.y qa: after each world merges, a fresh reviewer agent spot-checks 8 random quests for copied wording, solution leaks in starters or hints, UE API accuracy, and the fade ladder.

### M5 Release
- [x] M5.1 app-shell: friendly errors (missing engine, VS workload, Xcode, bad paths, build failures unrelated to the quest), content load under 300 ms for 300 quests, crash-safe save.
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
| M1.6g Flow bugs: self-explanations saved, drill self-checked items, run and submit availability | progress-and-rules | builder-rules (session "M1.6 Progress...") | merged | merged (learner flow verified on Windows UE 5.8.3 2026-10-26: both of its checks pass as plain expectations) | Review: engine integration tests miss assertQuestOpen (hidden without DOJO_ENGINE_ROOT); self-checked due item pays drill XP every drill; full dependencies in tests | From M2.4; decisions A800 to A809 |
| M2.2b Flow bugs: compiler output after a failed Submit, review dates, next to a locked quest, drill summary copy | ui-quests | builder-ui-quests (session "M2.2 Quest screens") | merged (48decce) | merged (items 1, 2, 3, 5) | 2 fix rounds; last Submit kept across reloads (A740 run), Next focused once, review days named once (A816); item 4 drill copy follows as M2.2c after M1.6g |
| M2.2c Drill summary copy for self-checked items | ui-quests | builder-ui-quests (session "M2.2 Quest screens") | merged | merged | 1 fix round; an all-right drill says nothing is due; self-checked items shown plainly; the fake pays only with a graded answer |
| M3.4b Review extras screens (alternative after a pass, "why is this a finding", reflection answers) | ui-quests | builder-ui-quests (session "M2.2 Quest screens") | merged | merged | 1 fix round; alternative after a pass, "Why?" with Ask again (free), reflection answers with timeout and Ask again; A954 one-line ai-review change accepted by the Lead | From the M3.4 handoff list; decisions A950 to A969 |
| M0.1b Test windows open hidden and never take focus (A77) | app-shell | builder-shell (session "M0.1 Scaffold...") | merged | merged | e2e runs hidden; M0.1c merged too (prohibited activation policy and an LSUIElement copy of Electron.app for macOS e2e): Lead watch found 0 visible samples over a full run |
| M2.1f Locked-stage hover flake, seen on GitHub CI | ui-core | ui-core (session "M0.3 Design tokens...") | merged | merged | The map exposes data-measured; the test waits for it and retries scroll and hover together; 20 of 20 locally |
| CI green on Windows (6 failing unit test files) | several | Windows Lead | (on Windows) | merged | Reproduced in a core.autocrlf=true checkout: the same 6 files. Split by owner as W0 to W3; main 920 passed, 0 failed on Windows; push trigger back on (A1021), pushed 2026-10-26; Windows unit tests pass on GitHub (run 40420870838); e2e and macOS follow-ups W1b, W5 merged |
| W0 .gitattributes keeps LF; CI push trigger back on | qa | Windows Lead | merged 20e9501 | merged | A1020 to A1022; the Lead's own config and docs change |
| W1 Progress tests: in-memory save path with the platform separator | progress-and-rules | builder-rules (agent) | merged | merged | Tests only; Lead checked the small diff |
| W2 Boss reader joins paths through its folder reader | unreal-pipeline | builder-unreal (agent) | merged | merged | Latent product mismatch, regression test added; A1000; Lead checked the small diff |
| W3 Review cleanup test injects a failing remover | ai-review | builder-review (agent) | merged | merged | chmod does nothing on Windows; production unchanged; Lead checked the small diff |
| W4 Build editor e2e fails on Windows (ui-quests-flow.spec.ts:494, 3 of 3) | ui-quests | builder-ui-quests (agent) | merged | merged | Typed UFUNCTION line not in the visible editor text; CI runs full e2e on windows-latest, so this blocks the next push; also asked whether the Build editor saves CRLF on Windows; A1030 to A1039 |
| W1b Real-disk save tests: named 30 s budget for slow CI disks | progress-and-rules | builder-rules (agent) | merged | merged | macOS CI run 40420870838 timed out at 5 s; no slow path in the save code (fsync and folder flush only); tests only |
| W5 Locked-stage hover test under load | ui-core | builder-ui-core (agent) | merged | merged | Hidden window frames arrive about 1 s apart under load, so Playwright's two-frame stability wait ran out (4 of 20 before, 40 of 40 after); the test scrolls and moves the pointer itself; other .hover() calls may need the same later |
| Integration suite and real-engine learner flow on Windows | qa | tester (agent) | detached on main 20e9501 | done (learner flow passes end to end; suite 16 of 24, the 8 failures go to W8 and W9) | First Windows run; covers M1.3c, M1.6g, M2.1e, M3.4 (A75) |
| W6 World 5 parameter Interactor, not Instigator (MSVC C4458) | content-foundations | builder (agent) | merged 01682fc | merged | `AActor::Instigator` was hidden by the parameter; clang never warned; it broke every whole-pack engine run on Windows. Pack 1 engine run passes (A1050) |
| W7 Pack 3 World 6 fix round: boss `bHidden` local (C4458), tracker reset-clock test | content-mechanics | builder (agent) | merged with M3.2 | merged | The surviving `ResetQuests` mutation is now caught (A1060) |
| W8 Integration suite on Windows: process check without pgrep, A402 skip, Live Coding "not enabled" falls back, tests force a windowless editor | unreal-pipeline | builder-unreal (agent) | merged 7eca300 | merged (review PASS after 2 fix rounds; engine suite reruns after W10) | From the first Windows suite run; the windowed editor in fastLoopWiring breaks the headless rule (A643) |
| W9 Glossary hover card covers the concept quest's continue button | ui-quests | builder-ui (agent) | merged 1a6b416 | merged (review PASS after 1 fix round; real-engine learner flow reruns after W10) | Real-engine learner flow failed at "Read the card" until the mouse moved away; product fix plus robust hovers in e2e |
| W10 Sandbox builds ignore another editor's Live Coding session (`-NoHotReloadFromIDE`) | unreal-pipeline | builder-unreal (agent) | merged 3e9f6ca | merged (review PASS after fix round 1; proven on UE 5.8.3 with the Live Coding mutex held) | UBT's Live Coding guard is keyed on the shared engine UnrealEditor.exe, so Mohammad's open KAEL editor blocks every sandbox build; blocks all engine proofs until it merges; decisions A1220 to A1229 |
| W8b Real-bridge Studio e2e named timeout | qa | builder (agent) | merged c5d53a3 | merged | Lead checked; the timeout alone did not help (run 40458755679), see W12 |
| W9b Glossary card e2e checks the open state on macOS | ui-quests | builder (agent) | merged 7af1be5 | merged | Escape closes the card on macOS; a hidden window kept the closed card in the page; macOS CI green after it |
| W12 Studio never finishes loading on Windows CI (push runs only) | ui-core | builder (agent) | merged bb9e220 | merged | Cause not found; every data read now has a wait limit ending in a no-answer view; slow IPC calls print to the CI job log; the real-bridge test fails if the no-answer view appears (A1250 to A1253) |
| Engine integration suite and real-engine learner flow on main 3e9f6ca | qa | tester (agent) | detached | done | Learner flow passed end to end (1.8 h); suite 22 passed, 2 known skips, 1 reopened-editor timeout in fastLoop that passed on rerun (problems.md); no editor left behind |
| W13 A timed-out editor wait in the integration tests keeps the editor's logs | qa | builder (agent) | merged 1f50c5d | merged | Small, Lead checked; the reopen timeout recurred in M5.1's engine run, so the next one keeps `Saved/Logs` (A1270) |
| M4.P2.12 Pack 2 World 12 (Prototype) | content-patterns | author-patterns (session "p2-world12-prototype") | m4-p2-world12 | building | Own reviewer and tester in the session; first quest requires p11-flyweight-when-not; decisions A1090 to A1109 |
| M4.P3.1 Pack 3 World 1 (Enhanced Input) | content-mechanics | author-mechanics (session "p3-world1-input") | m4-p3-world1 | building | Own reviewer and tester; decisions A1110 to A1129 |
| M4.P3.2 Pack 3 World 2 (Transforms and movement) | content-mechanics | author-mechanics (session "p3-world2-movement") | m4-p3-world2 | building | Merges after Pack 3 World 1, with its prerequisite repointed then; decisions A1130 to A1149 |
| M4.P4.1 Pack 4 World 1 (Inventory and equipment), first Systems Lab world | content-systems | author-systems (session "p4-world1-inventory") | m4-p4-world1 | building | Creates the pack; A68 gate; decisions A1150 to A1169 |
| V1 Verifier: a scoped run that judges nothing fails; C4458 name-clash lint | content-engine | builder-content-engine (session "verifier-hardening") | merged e7f071b | merged (review PASS; tester engine run passes) | From the 2026-10-26 Windows findings; decisions A1170 to A1179 |
| M5.2 CI installers (nsis, dmg, unsigned, artifacts only) and READMEs | qa | tester (session "ci-installers") | merged 04d5e3a | merged (review PASS after 2 rounds; package jobs first run on the next push) | No release or publishing (M5.3 waits for Mohammad); decisions A1180 to A1189 |
| M5.1 Friendly errors, content load under 300 ms, crash-safe save | app-shell and others | session "m5-1-friendly-errors" | merged 7e58970 | merged | M5.1a to M5.1i and M5.1l each reviewed PASS by a fresh reviewer, tester pass, engine integration run on UE 5.8.3; follow-ups M5.1k and the macOS checks; decisions A1190 to A1219, A1260 to A1262 |
| M4.y fix round: five merged worlds | content authors | session "m4-y-fix-round-five-merg" | merged d620fb4 | merged | Review PASS on all five; engine proofs on UE 5.8.3 with mutations; the World 9 boss Blueprint plan wording is resolved by A1240 |
| M4.y Spot-check of the five worlds merged 2026-10-26 | qa | reviewer (session "qa-spotcheck") | merged 8373f2a | merged (fixes proposed as session card "M4.y fix round: five merged worlds") | 8 random quests per world; findings go to authors as fix tasks |
| M2.1e First-run build progress hang (seen once) | ui-core | ui-core (session "M0.3 Design tokens...") | merged | merged (learner flow on Windows: the hang did not reproduce in two first-run builds) | Review: quiet notice resets on unchanged status, status check without timeout, wrong restart wording, cause still unknown (name -WaitMutex, add run logs), pipeline spec row, reuse toAppError; plus the hover flake | Investigate lost events, add a status query fallback; decisions A820 to A829 |
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
| M4.P1.6 Pack 1 World 6 "Data and tools" | content-foundations | author-foundations (session "M0.5 Glossary...") | merged 984506d | merged (engine proof on Windows UE 5.8.3) | Re-review PASS on text and rules; owed on engine: level-curve tests (reference and `XPCurve != nullptr` variant, each twice in one editor), --engine on foundations (fills fix 5 numbers), boss mutations recheck; optional: assert GetXP()==0 with no curve | Review: ensure test pins the condition and fails on an editor rerun (expect any count, rubric checks ensureMsgf); PrimaryAssetId example; boss rubric vs Blueprint plan; iterations numbers |
| M3.2 Pack 3 World 6 (delegates) with the Quest System boss | content-mechanics | author-foundations (A74) | merged d268ec7 | merged (engine proof on Windows UE 5.8.3 after W7) | 2 fix rounds; text and rules reviewed; Lead confirmed round 2 by grep; full engine proof list in its iterations entry | Two reference breakdowns, pieces, integration rubric; decisions A870 to A889 |
| M1.7d Real retryReview (A356) | ai-review | builder-review (session "M1.7 AI review...") | merged (3cf959e) | merged | 2 fix rounds (stored compiler output keeps its cut-off mark, whitespace at the cut, pruned-attempt guard); 851 tests, 27 e2e |
| M3.4 Review extras, ai-review side: alternative after a pass, "why is this a finding", reflection answers | ai-review | builder-review (session "M1.7 AI review...") | merged (362f3dc) | merged (integration suite on Windows: nothing of M3.4 failed) | Main process, IPC, fake; UI follows as M3.4b (ui-quests); decisions A850 to A869 |
| M1.3c Engine integration tests: createSandbox cold build fails in about 220 ms on main | unreal-pipeline | builder-unreal (session "M1.2a Sandbox...") | merged (2fa931c) | merged (verified on Windows UE 5.8.3: all five createSandbox cold builds pass) | 1 fix round; UBT startup crash retried up to 3 times with a plain message after; raw tail for silent failures; crash markers unverified on Windows |
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
| M4.P2.9 Pack 2 World 9 (Component, Pack 4 gate) | content-patterns | author-patterns (session) | merged 141eec7 | merged (engine proof on Windows UE 5.8.3) | Review: reference 13/13 on UE 5.8.3 before removal; one A64 fix (starter comments name the pattern); left on engine: starters and two boss mutations (scratchpad rv-m31/engine11.sh) | World id `patterns/component` (A68), boss with A67 integration; decisions A830 to A849 |
| M4.P2.10 Pack 2 World 10 (Type Object) | content-patterns | author-patterns (session) | merged 3f9fa4a | merged (engine proof on Windows UE 5.8.3) | Review fixes in (starter comments 15489cf, blueprint-class 0b3743c); engine steps in problems.md; n-gram check pending (book PDF missing) |
| M4.P2.11 Pack 2 World 11 (Flyweight) | content-patterns | author-patterns (session) | merged 25c03e3 | merged (engine proof on Windows UE 5.8.3; prerequisite repointed to p10-type-object-when-not, A927) | Review: deliberate failure given away in concepts and rubric (plus card line 44), Starter Content mesh names, seat spacing in the see-it step, tick claim, A927 base commit; all fixed. Merge conditions: World 10 first, prerequisite repointed to p10-type-object-when-not in the same merge (A927); n-gram check owed (book PDF missing)
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
| M5.1a Shared contract for friendly failures | app-shell | m5-1 lead (session) | m5-1-friendly-errors-d07d32 | building | Tiny: codes `build-environment-failed`, `sandbox-path-unsupported`; optional fields `RunResult.unrelatedFailure`, `SandboxSetupResult.failure`, `EnvironmentStatus.engineProblem/toolchain/saveNotice`, `SandboxFolderChoice.blockers`; decisions A1190 to A1192. First of M5.1, everything below needs it except b and c |
| M5.1b Save survives a kill mid-write | progress-and-rules | m5-1 builder (agent) | m5-1-friendly-errors-d07d32 | review | Atomic backup copy (`.bak.tmp` then rename), `getLoadRecovery()` and `whenIdle()`, new crash points, a real child process killed 20 times at random moments; decisions A1193 to A1195. Parallel with a and c |
| M5.1c Content load under 300 ms for 300 quests | app-shell | m5-1 builder (agent) | m5-1-friendly-errors-d07d32 | review | `tests/contentLoadBudget.test.ts` with 300 retagged real quests on real disk, median of 3 under 300 ms, load log line; if it fails, profile and split a loader follow-up M5.1c2; decisions A1196 to A1198 |
| M5.1d Explain build and test failures that are not the learner's | unreal-pipeline | m5-1 builder (agent) | m5-1-friendly-errors-d07d32 | review | `BuildFailureExplainer` with ordered rules (known signatures, pipeline errors, learner's own lines win, earlier quest, support or engine, toolchain recheck); attaches `unrelatedFailure` and `failure`; needs a. Decisions A1199 to A1203 |
| M5.1e Bad paths and preflight | unreal-pipeline | m5-1 builder (agent) | m5-1-friendly-errors-d07d32 | review | `SandboxFolderRules` (warn: long, non-ASCII, cloud-synced, network, Program Files; block: inside the engine), preflight in `QuestRunService`, friendly engine-moved and sandbox-deleted errors; after d (same files). Decisions A1204 to A1207 |
| M5.1f A Submit that failed outside the quest is not recorded | ai-review | m5-1 builder (agent) | m5-1-friendly-errors-d07d32 | review | Rejects with the `AppError`, no review, no attempt, spree and XP unchanged; needs a only. Decisions A1208 to A1209 |
| M5.1g Environment status, save notice, startup and quit | app-shell | m5-1 builder (agent) | m5-1-friendly-errors-d07d32 | review | `engineProblem`, session-cached toolchain, `saveNotice`; quit waits up to 3 s for pending saves; failed start shows a plain dialog; needs a and b. Decisions A1210 to A1212 |
| M5.1h The Build screen explains outside failures | ui-quests | m5-1 builder (agent) | m5-1-friendly-errors-d07d32 | review | "Not your code" view in `RunColumn`, fake marker, e2e `run-errors.spec.ts`, screenshots; needs a. Decisions A1213 to A1214 |
| M5.1i Environment errors on Title, First-run, Settings; screen crash view | ui-core | m5-1 builder (agent) | m5-1-friendly-errors-d07d32 | review | Engine and toolchain chips, `ScreenErrorBoundary`, fake scenarios `engine-missing` and `toolchain-missing`, e2e `environment-errors.spec.ts`; needs a, real values from g. Decisions A1215 to A1217 |
| M5.1j Windows proof of M5.1 | qa | m5-1 tester (agent) | m5-1-friendly-errors-d07d32 | waiting | Engine-lock runs on UE 5.8.3: Live Coding active, renamed engine, deleted sandbox, OneDrive folder, kill test, load budget. Last, after W8 and W9 merge. Decisions A1218 to A1219 |
| M5.1k Set up the sandbox again from Settings | ui-core | unassigned | (none yet) | waiting | Proposed: a "Set up the sandbox again" button in `EnginePanel` that opens the first-run sandbox and build steps, so a deleted or moved sandbox can be recreated without reinstalling; the preflight messages (M5.1e) then point at it. Problem logged in `docs/problems.md`. Also rewrite two older messages that send the learner to a Settings or setup action that cannot recreate a sandbox: `unrealErrors.ts` (`sandbox-path-too-long`, "Create the sandbox again in a short folder ... from Settings") and `SettingsService.ts` ("Create the sandbox again in setup, or pick the folder it was created in") |
| M5.1l Content load stall on a Windows runner (16 s) | content-engine and ui-core | m5-1 lead | claude/m5-1-friendly-errors-d07d32 | reviewed PASS after fix round 1, tested (typecheck, 1207 unit tests, verify-content, build, e2e 43 of 43 run) | Cause is not the loader (44 ms for 150 quests warm, 77 to 109 ms on a fresh copy); added a slow-load warning that names disk versus a blocked main process, and raised the data wait limit from 15 s to 45 s (A1260 to A1262). |

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

## Moving engine work to Windows (A76)

A new Lead on Windows starts with `docs/lead/handbook.md`: setup, the loop, the merge script, the engine lock, and what waits for the engine.

Mohammad will use the app on Windows and will not reinstall UE on the Mac. Everything that needs Unreal runs on the Windows desktop from now on. Done there on 2026-10-26: CI green on Windows with the push trigger back on; Pack 1 World 6, Pack 2 Worlds 9 to 11, and Pack 3 World 6 proven and merged; the integration suite and the real-engine learner flow run (fixes in W8 and W9). Still waiting there:
- Engine proofs for content: Pack 1 World 6, Pack 2 Worlds 9 and 10 (steps in problems.md), Pack 3 World 6 (M3.2), and every later world.
- Done 2026-10-27 on main 3e9f6ca: the integration suite (22 passed, 1 reopen timeout that passed on rerun, see problems.md) and the real-engine learner flow (passed end to end in 1.8 h, most of it waiting on the engine lock).
- M1.5-style Windows pipeline verification: Build.bat, UnrealEditor-Cmd.exe, Live Coding fast loop, the VS workload checks, nsis packaging, and every "unverified on Windows" item in problems.md.

The repository is on GitHub, private: https://github.com/mshehab22/unreal-dojo (A78). Mohammad pushes `main` with GitHub Desktop. Next on Windows: install Git, Node 24, and UE 5.8, clone the repository with GitHub Desktop, run `npm install`, and open the folder in Claude Code; the engine proofs listed above (and in problems.md and each world's iterations entry) run there.

## Engine missing, 2026-10-26 (A75)

UE 5.8 is not installed on the Mac. Non-engine work continues; code branches whose only engine step is the integration suite can merge after review (suite logged as unverified); content worlds wait as "ready, engine proof pending" until an engine is back.

## Paused 2026-10-21 about midnight, resumed 2026-10-26

Resumed on 2026-10-26: every task below was re-sent from these notes (M1.3c integration run; Pack 1 World 6 proof then M3.2; World 9 reference-game line then World 10; M3.4, M1.6g and M2.1e fixes from the partial reviews; the World 9 review restarted). Notes from the pause, kept for reference:

Mohammad asked to pause all work. Every builder was told to stop at a safe point, release the engine lock, commit work in progress on its own branch (no merges), and stay idle; reviewers were told to stop and hand back partial findings. Main is green at the last merge (M2.4 follow-up). To resume, the Lead re-sends each task from the board below:
- In review when paused (reviews restart from the partial reports): M1.6g @ f76037a, M2.1e @ cacb7ac, M3.4 @ 2d320b9, Pack 2 World 9 @ 9131a6f.
- M3.4 partial review: FIXES NEEDED so far. (1) `AttemptReviewService` keeps tests-only fallback answers (timeout, A70 skip, no AI) for "Why?" and reflections, so a real answer can never replace them; keep only AI-provider answers, and fix the `review-timeout` wording in the handoff list. (2) `ReviewService.explainFinding` defaults `allowPaidApi: true`; make the option required. Left: integration tests with the flag.
- M1.6g partial review: FIXES NEEDED so far. (1) `tests/review/submitWiring.test.ts:278-291` `invokerWith` still omits two dependencies. (2) On rebase, drop the two `expectKnownFailure("M1.6g", ...)` wrappers in `e2e/learner-flow.spec.ts` (lines 317, 567), since the fix makes them pass. Drill XP, the cancel fix, and the integration stubs are verified. Left: integration tests with the flag.
- Pack 2 World 9 partial review: one issue so far, the boss Spec names no reference game (content-authoring requires one; add a "Reference game: ..." sentence). Reference solutions 13 of 13 pass on UE 5.8.3; the world id `component` matches the Pack 4 gate; originality, accuracy, and rules pass; the merge with main is clean. Left: the starter run, two prepared boss mutations, and the rest of the boss rubric text (the reviewer's sandboxes and `engine11.sh` are in `scratchpad/rv-m31/`).
- M2.1e partial review: all eight issues fixed and every default check passes on a merge with main (28 of 28 e2e, hover test 15 of 15). Left: the engine integration tests under the lock (compare against main's 3 known createSandbox failures); PASS if no new failures. One small non-blocking fix to send with the merge: `SandboxBuildTracker.receive()` should reset `failedChecks` and `isUnreachable`.
- In fixes: Pack 1 World 6 at 8a492c0 (fixes 1 to 4 done, verifier and tests pass; left: the engine proof with the reference and an `XPCurve != nullptr` variant, each twice in one editor, then main's --engine run and fix 5, the real numbers in iterations). M1.3c at WIP 913328f: the trigger was the Lead's run without `--no-file-parallelism` (A612), but builder-unreal found a real product weakness behind it. UBT 5.8.3 renames its shared log files before taking its `-WaitMutex` lock, so two builds started in the same instant race and one aborts with exit 134 in about 80 ms, and LogFilter dropped every line, so the failure had no message. That can happen in the app whenever another UBT starts at the same moment (the M2.1e hang was also seen with other UBT runs active). Fix written: retry a UBT startup crash up to three times (A890), and show the last 20 raw lines of a failed build with no filtered lines (A891), with unit tests. Left: the 24 integration tests with the flag under the lock, and the iterations entry; then review.
- Building: Pack 2 World 10 at WIP 03a40f8 (content and C++ written, verifier passes; no engine run yet), Pack 3 World 6 at WIP 79c9373 (pack `mechanics`, world `delegates`, 7 quests, all references and the boss director and tests written, decisions A870 to A873, originality checked; left: first engine build, mutations, starters, --engine, iterations, typecheck and test, rebase).
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

### Handoff, Windows Lead, 2026-10-26 night
- Machine: the Windows desktop (A76), Node 24.22.1 (A1022), UE 5.8.3 at `C:\Program Files\Epic Games\UE_5.8`. Worktrees link `node_modules` to the Lead worktree's install by junction; remove the junction (`cmd //c rmdir node_modules`) before any `git worktree remove` (handbook, Lessons learned).
- Done: CI green on Windows and push back on (A1021); Pack 1 World 6, Pack 2 Worlds 9 to 11, Pack 3 World 6 proven and merged; W6 and W7 (MSVC C4458 fixes); the integration suite and real-engine learner flow run; the nsis installer builds. main pushed at 80713d9, CI run 40442224295 green; the commits after it are local until the next push.
- In flight: W8 (builder-unreal agent, worktree `w8-windows-integration`): a process check without pgrep, the A402 skip on Windows, Live Coding "not enabled" falls back to headless, integration tests force a windowless editor; it reruns the full suite under the lock. W9 (ui agent, worktree `w9-learner-flow-hover`): the hover card must not cover "Read the card", plus robust hovers in e2e. Both are normal size: a fresh `reviewer` before merge.
- After W8 and W9 merge: rerun the real-engine learner flow on main under the lock (`DOJO_E2E_ENGINE=1`, `DOJO_E2E_ENGINE_PATH=<engine root>`, `DOJO_E2E_ENGINE_LOCK=<lock path>`, `npx playwright test e2e/learner-flow.spec.ts`), then push main.
- Still unverified on Windows: the UBT crash markers (A890; no crash happened in any run), the leftover-process check (until W8), Live Coding in a windowless editor (W8), installing and launching the installer.
- Owed: the D13 n-gram checks for Pack 2 Worlds 10 and 11 (the book PDF is missing). Open findings for their owners are in problems.md (a scoped verifier run that judges nothing still passes; a Mac-side C4458 check).

### Handoff, 2026-10-21 evening (replaces the afternoon note)
- On main: M0 complete; M1.1, M1.2, M1.3, M1.3b, M1.6 to M1.6d, M1.7, M1.7b, M1.8 to M1.8c; M2.1 to M2.1d, M2.2, M2.3 and M2.3b; Pack 1 Worlds 1 and 2 (with A67 boss integrations); Pack 2 Worlds 1 to 3; QA harness. Main is green: typecheck, about 706 unit tests, 27 e2e, verifier (2 packs, 5 worlds, 43 quests).
- In flight (see the board rows for branch and commit): M1.4 fast loop (re-review), M1.7c submitQuest (finishing its engine proof), Pack 1 World 3 (fix round 1), Pack 2 World 4 (review).
- Reviewers are background agents of the Lead session; builders are linked sessions. Every review prompt starts by reading the shared reviewer instructions in the Lead's scratchpad (reviewer-common.md: own detached worktree, checks, rules, engine lock).
- Merge rules: merge only after a reviewer PASS (the Lead may check a very small diff itself and say so in the merge message); `npm ci`, typecheck, test, verifier, build, test:e2e on main after every merge; docs-only conflicts keep both sides; code conflicts by hand (`createHandlers.ts` and `src/main/index.ts` collect every service's dependencies, keep all, then fix tests that build `createHandlers`). If checks fail after a merge, remove only that merge commit (check `git log --first-parent HEAD~1..HEAD`) and send the branch back. Chain every command with `&&`.
- Unreal runs take turns through the engine lock directory (mkdir before, rmdir after). The engine queue is the main bottleneck.
- Content process: every boss ships an A67 reference integration with two-round tests, proven by mutations; D13 originality is checked at 6 and 5 words against the book PDF on Mohammad's Desktop; Unreal facts are checked against 5.8 engine source.
- Next after the in-flight work: wire M1.4 into the app; M2.4 end-to-end learner flow (tester) once submitQuest lands; more Pack 1 and Pack 2 worlds; Pack 3 World 6 (M3.2, needs an author-mechanics session); M3.3 and M3.4.
- Needs Mohammad: a signed-in `claude` CLI for the live AI review run, `gh auth login` for the private CI repo, optionally the Metal toolchain; he was advised to keep "claude" (the CLI) off in macOS Device Control and Data Access. Decisions to review: everything under "Awaiting Mohammad's review" (Lead decisions A01 to A06, A60 to A69).
