# System: progress-and-rules

Owner: builder-rules. Folder: `src/main/services/progress/`, `src/shared/types/progress.ts`. Research: `research/gamified-learning-platforms.md` sections 3, 4, 5.

## Purpose

Everything the app remembers about the learner and every rule that turns an attempt into XP, mastery, cards, schedule, and unlocks. Pure rule functions with no I/O, each unit tested from the tables below.

## Save file (`<userData>/progress.json`, atomic write, schema version)

PlayerProgress: version, playerName, studio { name, modules[] }, xp, role, streak { count, lastActivityAt, freezes (max 2), milestones[] }, spree { current, best, armor }, seerStones (max 2), patternCards { id -> { tier: bronze|silver|gold, useCasesPassed: questId[] } }, skills { id -> { points, mastery: attempted|familiar|proficient|mastered } }, quests { id -> QuestProgress }, attempts[], reviewLog[] (per item: itemId, at, quality, intervalDays, ease, stability?), schedule { itemId -> dueAt }, hoverCounts { termId -> count }, daily { date, offered[], chosen?, done, monthBadges[], completedDates[], chest? }, createdAt, updatedAt.

QuestProgress: status (locked|available|in_progress|passed), bestScore, attempts, hintsRevealed, solutionViewed, savedFiles, breakdownPlan?, revisionNote?, lastAttemptAt.

## Rules

Pass: build and refactor need compiled + all tests pass + review score >= 70; score = 0.6 tests + 0.4 review (review = tests when tests-only). Breakdown: grader score >= 70 with every required piece present after revision. Concept: 80% of questions. Boss integration: integration rubric score >= 70.

XP (first pass only; repeats 0; rematch 50%; drills flat 10 per completed drill):
| Quest difficulty vs learner level band | multiplier on base xp |
| far above | 1.30 |
| above | 1.12 |
| at level | 1.00 |
| below | 0.60 |
| far below | 0.25 |
Band = difficulty (1..5) compared to floor(level / 4) + 1 clamped to 1..5. Hint spells cost 15% of base each. Solution viewed without a Seer Stone: a pass before the rematch pays 0, and the rematch scheduled within 3 days pays 50%; a Seer Stone view's first pass pays in full whatever the date (A1391). Fail but compiled: 5% effort XP, once per quest.

Levels: xp to next = round(200 * 1.35^(level-1)). Roles at levels 1, 4, 8, 12, 16, 20, 25, 30, 40, 50: Apprentice, Scripter, Builder, Systems Smith, Pattern Seeker, Architect, Engine Whisperer, Lead, Principal, Legend.

Pattern cards: unlocked on first pass of a quest listing the pattern; tier by distinct use-case quests passed: 1 bronze, 3 silver, 5 gold.

Skills: on pass each listed skill gains difficulty points (bosses x2). Mastery from the scheduler: attempted (seen), familiar (one successful recall), proficient (3 successful spaced recalls), mastered (interval >= 30 days). A missed mixed-drill item drops mastery one level and is shown as "due for review".

Spree: consecutive first-try Submit passes on build and refactor; Run never counts; armor absorbs one miss while the spree is above 0 (a miss on a spree of 0 keeps the armor, A1396); best spree never lost. Bonus: +5% XP on the passing submit while a spree is 5 or more.

Streak: a completed drill or passed quest within every 3 days; freezes consumed automatically, max 2 held, 1 earned per boss; milestones 7, 30, 100 celebrated; no repairs.

Scheduler: SM-2 (ease 2.5 start, min 1.3; intervals 1, 3, then interval * ease; quality from score: 95+ = 5, 85+ = 4, pass = 3, miss = 1 or 2). Items: glossary terms, pattern cards, parsons blocks, scenario questions. Daily due cap 20; overflow slides to the next day. Hovered-but-unpassed terms are injected first (hover count >= 3). Every review appends to reviewLog so FSRS can be dropped in later.

Drill composition (6 to 10 items): due items mixed across topics; at least one pattern discrimination item, one Parsons reorder, one explain-in-one-sentence (AI graded, free). Test-out: a world's mixed drill at proficient on every term unlocks skipping its worked and faded quests; bosses never skip.

Daily quest: up to three offers (drill, concept, short build with `scaffold: worked` and no new class so the fast loop applies; an offer with no candidate is left out, and the drill has none on a day with no scheduled item due, since such a drill is practice and could never finish the offer, A1393); one chosen per calendar day; chest on completion (freeze, armor, Seer Stone, studio cosmetic, XP potion +50% for 30 minutes); finishing every day of a month earns a badge; missing days costs nothing.

Unlocks: a quest is available when all `prerequisites[]` are passed and all `terms[]` are at least familiar (or the learner tested out of the world). The first quest of each pack's first world is always available. Pack 4 unlocks after the bosses of the Pack 1 Communication world (`foundations` / `communication`, world 5) and the Pack 2 Component world (`patterns` / `component`), named by world id in `PACK_GATES` (A68, A510); while either world does not exist, Pack 4 stays locked and the verifier warns (A511).

Seer Stone: after two failed submits a build or refactor quest's reference solution can be viewed (`viewSolution`). The first view of an unpassed quest costs a held stone (the quest keeps its XP) or the quest's first-pass XP, and schedules a rematch in 3 days at 50%. Asking to spend a stone with none held is refused. A repeat view, and any view of a passed quest, is free and schedules nothing, so viewing never buys rematch XP (A1391).

Rematch: a due pattern or term surfaces as a quest from a different world than the one it was earned in when one exists.

## Done criteria

- Unit tests for every table and rule above, including band math, XP floors, tier upgrades, mastery up and down, streak with freezes across day boundaries, daily cap and overflow, unlock graph with test-out, rematch world selection.
- Save and load round-trip with a corrupt-file recovery test.
- Rule constants live in one file (`rules.ts`) with comments; the UI reads them through IPC, never duplicates them.

## Architecture (keep current)

Last updated by M3.3 (the Seer Stone flow, today's chest in the daily state, the drill offer only with an item due, armor kept on a spree of 0), after M5.1b (atomic backup via .bak.tmp, getLoadRecovery, whenIdle, kill test).

### Layers
- Pure rule classes (no I/O, time and randomness passed in): `PassRules`, `XpRules`, `HintSpellRules`, `LevelRules`, `PatternCardRules`, `SkillRules`, `MasteryRules`, `SpreeRules`, `StreakRules`, `SeerStoneRules`, `ChestRules`, `TestOutRules`, `RematchSelector`, `UnlockGraph`, `DrillScheduler`, `DailyQuestService`, and the scheduler `Sm2Scheduler` behind the `ReviewScheduler` interface (FSRS replaces it by implementing the same interface; the review log already holds every review).
- Every constant lives in `rules.ts` with a comment; `createRulesSnapshot()` is what `getRules` answers.
- `ProgressService` is the only stateful piece: it holds the loaded save, applies the rules to attempts, reviews, drills, hints, solution views, and the daily quest, and saves after every change (memory never runs ahead of the disk). Every public method that changes the save runs as one queued step (read, compute, commit) after the previous one finishes, so overlapping IPC calls never lose an update; a failed step does not block the queue. A save that cannot be opened gives a refused service (`openOrRefuse`) whose every progress call answers the `save-failed` error and which never writes. It takes a `Clock` and a `RandomSource` (`SystemClock` and `MathRandomSource` in the app; fixed ones in tests).
- `ProgressStore` loads and saves `<userData>/progress.json` through `AtomicJsonFile` on a `FileSystem` (`NodeFileSystem` in the app, `tests/support/MemoryFileSystem.ts` in tests, which can crash mid temp write, mid backup copy, before the rename, or right after it).

### Files (`src/main/services/progress/`)
- `rules.ts`: constants and the rules snapshot.
- `Clock.ts`, `SystemClock.ts`, `RandomSource.ts`, `MathRandomSource.ts`: injected time and randomness.
- `calendarDays.ts`: local calendar day helpers (streak, daily quest, due cap).
- `RuleQuest.ts`: the narrow quest shape the rules read (id, title, kind, difficulty, xp, pack and world with their orders, order, scaffold, prerequisites, terms, patterns, skills). The content layer maps its `Quest` into it. `contentFacts.ts` mirrors `QuestKind` and `ScaffoldLevel` until the content types merge (A136).
- `SolutionSource.ts` (the interface, and `NO_SOLUTIONS`) and `SolutionFolderReader.ts` (reads `<solutions>/<quest-id>/`, files only, name order): where `viewSolution` reads reference files (A1390).
- One file per rule class listed above, plus `ProgressService.ts`, `ProgressStore.ts`, `AtomicJsonFile.ts`, `FileSystem.ts`, `NodeFileSystem.ts`, `progressSchema.ts` (zod), `createNewProgress.ts`.

### Save file
- Write: the JSON goes to `progress.json.tmp` and is flushed (fsync), the current `progress.json` is copied to `progress.json.bak.tmp` and that is renamed over `progress.json.bak` (so a kill mid-copy never leaves a torn backup, A1193), then the temp file is renamed over `progress.json`. A process kill at any step leaves the old or the new file whole. A power cut is out of scope: the backup copy is not fsynced, so a power cut could still leave an empty `.bak` (the main file is fsynced before the rename). Writes are serialized.
- Leftovers: a `.tmp` or `.bak.tmp` left by a killed process is never read on load, even when it is complete (the call that wrote it never answered, so the old file is the consistent one). The next save overwrites both.
- Load recovery: `ProgressService.open` keeps what the load found. `getLoadRecovery()` answers `{ kind: "none" | "backup" | "fresh", quarantinedPath? }` (a service built without a load, and a refused one, answer `none`). `whenIdle(timeoutMs)` resolves true when every queued change has been saved and false when the time runs out; it never rejects (A1195).
- Migrations: `migrateSave.ts` upgrades a parsed save step by step to `SAVE_VERSION` before the schema check (version 1 to 2 adds `revealedHints`).
- Load: missing file gives a fresh save (or the backup if only the backup exists). A file that is not JSON or fails the zod schema is moved to `progress.json.corrupt-<time>` and the backup is used; if the backup is bad too, a fresh save starts. A save whose `version` is newer than the app, and a file the disk will not read (locked, no permission), are refused with `save-failed`, never quarantined or overwritten; the app still opens (A133).
- Disk: on Windows, reads, renames, and copies retry EPERM, EACCES, and EBUSY with backoff of about 1.5 seconds (`retryWhileLocked.ts`); on macOS and Linux the folder is flushed after the rename. Fields added after version 1 default to empty.
- Loot items: chests open the moment they are earned (no unopened chests are stored); the outcome carries `chest`, and `daily.chest` keeps today's reward so the Studio can show it after a reload (optional field, no migration, A1394). The active potion is `xpPotionUntil`, held cosmetics are `studio.cosmetics`, freezes `streak.freezes`, armor `spree.armor`, stones `seerStones` (A138).
- The save shape is `PlayerProgress` in `src/shared/types/progress.ts`. M1.6 added `memory` (SM-2 state and mastery per item), `drillQueue`, `rematches`, `testedOutWorldIds`, `xpPotionUntil`, `studio.cosmetics`, `daily.completedDates`, and on `QuestProgress` `seerStoneSpent` and `effortXpGranted` (A120).

### Flows
- Attempt (`recordAttempt`): price XP (band, first pass, repeat, rematch, hints, effort, spree, potion), update the quest, cards (any pass), skills (first pass or rematch), spree (first Submit of a never-passed build or refactor), streak (on a pass), boss rewards (freeze, armor, studio module), daily completion and chest, level and role, the attempt record, newly unlocked quests, next due dates.
- Review (`reviewItem`): SM-2 review (a success before the due day is logged but does not count), append to the review log, update the schedule and item memory, remove the item from the Drill me queue, recompute the item's skill mastery (the weakest item of the skill) and report the change.
- Drill (`finishDrill`): flat drill XP, streak, daily completion and chest, and any world whose terms are all proficient becomes tested out.
- World Map (`getQuestAvailability`): today's scheduled due items (`DrillScheduler.scheduledDueToday`, never "Drill me" or hover-injected items) surface as rematches of passed quests in other worlds, then the unlock graph answers (a rematch is flagged once its due time has come). Passing a rematch reviews the due items the quest uses, so it cannot be farmed.
- Daily candidates: `DailyQuestService.candidatesFrom(quests, availability, hasDueDrillItems)` gives open concept quests and short builds (`scaffold: worked`, `addsNewClass` false), and whether a drill is rewarded today (`getScheduledDueItemIds()` is not empty, A1393).
- Solution view (`viewSolution`, A1390, A1391): `ProgressContentService` checks the quest exists, is open, and is a build or refactor quest, reads its reference through the `SolutionSource` (keeping only the quest's own file names; none means `invalid-payload` before anything is charged), then `ProgressService.viewSolution` prices it with `SeerStoneRules.viewSolution({ stonesHeld, spendStone, alreadyViewed, passed, now })` in one queued step. The answer is `SolutionViewing`.

### Content-backed methods (M1.6b)
- `ProgressContentService` answers `getQuestAvailability`, `getTestOutStatus`, `revealHint`, `viewSolution` (M3.3, with the `SolutionSource` passed as its optional last constructor argument), `submitConcept`, `submitBreakdown`, `reviseBreakdown`, `getDailyQuest`, `startDrill`, `answerDrillItem`, and `finishDrill`. It reads the content catalog through `ProgressContentSource` (`listPacks`, `getWorld`, `getAuthoredQuest`, `getPatternCards`; `ContentCatalog` meets it), builds a view per content load (cached on the outline list), and applies everything through `ProgressService`.
- `toRuleQuests.ts` maps pack outlines to `RuleQuest[]` (A311). `DrillItemBank.ts` indexes every way to ask about each scheduled item: terms through concept questions, patterns through which-pattern questions and card recall and scenarios, Parsons blocks keyed `parsons.<questId>.<blockId>` (A310). `ItemGrader.ts` grades answers in main (A314, A315). `DrillSessionStore.ts` keeps open sessions in memory (A319). `ProgressGraders.ts` is the explain and breakdown grader interface; the app passes graders backed by the review service (A460), and `createTestsOnlyGraders` remains for tests. `AttemptFileRules.ts` caps the files a Submit attempt keeps and prunes them to the quest's last five Submits (A467); `recordAttempt` stores a Submit's code review and files on the attempt (A466).
- Hints: `QuestProgress.revealedHints` keeps the revealed indexes (save version 2, migrated by `migrateSave.ts`, A500). `revealHint(questId, hintIndex?)` answers an already revealed hint again at no cost (A501). `getQuest` and `getWorld` answer through `ProgressContentService` and add `revealedHints` (texts) to build and refactor quests; unrevealed hints never leave main (A502).
- Drafts: `saveQuestDraft` keeps files, the breakdown board, and worked-level `selfExplanations` (A800); `resetQuest` clears all three.
- Self-checked explain items (tests-only review) are marked `selfChecked` on the item result, are not scheduled, and are counted in `DrillOutcome.selfCheckedCount` instead of `correctCount` or `totalCount` (A801).
- Run and Submit: `runQuest` and `submitQuest` register the run, then call `assertQuestOpen`, then stop with `run-cancelled` if the run was cancelled meanwhile (A802, A803).
- Drill reward: the session keeps its items that were scheduled due at start; finishing pays drill XP, streak, and the daily drill offer only when one of them was answered and graded, not self-checked (A320, A801).
- Every quest-specific call checks the quest exists (`quest-not-found`) and is not locked (`quest-locked` with the map's reason).
- Concept submit: questions graded in main, 80% passes, each of the quest's terms reviewed once with quality from the score inside the same queued step as the attempt. Breakdown: the first plan is kept as `submittedPlan`, the closest reference plan is shown, the revision is graded; a boss breakdown records no pass (A316, A317).
- Drills: due (today's due items within what is left of the day's cap of 20, A321, filled from met items to 6 to 10, with the three required formats when content has them, never the same question twice, A323), test-out (a world's taught terms and its patterns with an unlocked card, only when eligible; tests the world out when every taught term stays proficient, A313, A322), Parsons fallback (after two failed submits, pays nothing). Drill XP, streak credit, and the daily drill offer count only when the drill held a scheduled due item; otherwise it is practice (A320).
- Pack gates: `PACK_GATES` in `rules.ts` names the gated pack by order (Pack 4 is the `systems` pack, `order: 4`, shipped since M4.P4.1; `tests/progress/packFourGate.test.ts` checks the gate against the real content) and the required worlds by pack id and world id. `UnlockGraph` resolves each to its boss quests; a required world with no boss in the loaded content keeps the pack locked with "the <world> world's boss (not released yet)" in the reason. `tools/verifier/checks/packGateCheck.ts` reports a gate world that is missing or has no boss (warning; error with `--release`).
- World keys: test-out status, `testedOutWorldIds`, and drill outcomes use `worldKeyOf(packId, worldId)` = `<packId>/<worldId>`, and the test-out request carries `packId` (A700, A701). Bare world ids from older saves are qualified when content first loads (`qualifyLegacyTestOuts`).
- Unlocks: a term gates a quest only when a concept quest teaching it comes earlier in course order (earlier pack, earlier world, or lower order in the same world), and a concept quest is never gated by its own terms (A312, A72, A660). A world's test-out terms are its terms taught in that world or earlier. Both live in `taughtTerms.ts`.

### IPC wired
M3.3: `viewSolution(questId, useSeerStone)`. M1.6: `getProgress`, `getRules`, `setPlayerName`, `saveQuestDraft`, `resetQuest`, `recordTermHover`, `queueDrillItem`, `chooseDailyOffer`, `resetProgress`, `getDrillSummary`. M1.6b: the ten content-backed methods above. Every progress and drill method is now wired. `src/main/index.ts` opens the progress service, then builds `ProgressContentService` on the content catalog.

### Tests
`tests/progress/*.test.ts`, one file per rule area (M3.3: `seerStoneAndDaily.test.ts` for the Seer Stone pricing, the handler, the solution reader, the drill offer, and today's chest), plus `progressStore.test.ts` (round trip, four simulated crash points, corrupt recovery, real disk), `progressService.test.ts` (end to end on an in-memory disk, `getLoadRecovery`, `whenIdle`), and `saveKillSafety.test.ts` (M5.1b: the child `tests/progress/support/killedSaveWriter.ts` writes saves of 2 to 5 MB with an increasing number through the real `AtomicJsonFile` and `NodeFileSystem`, run with `node --import tsx` and killed with SIGKILL at 20 seeded random moments; afterwards the main file and the backup parse and pass the schema, the load is never `fresh`, and the loaded number is the last acknowledged one or the next; the seed is logged and `DOJO_KILL_SEED` replays it, A1194). Shared builders in `tests/support/`; the real-disk time budget is `tests/support/realDiskBudget.ts`.
